import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = [
  'https://afterglowr.com',
  'https://www.afterglowr.com',
  'https://afterglowr-wallpapers.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];
function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

const PORT = process.env.PORT || 3000;

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn('[R2] Missing environment variables. Please check Render Environment settings.');
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function toSlug(str) {
  return String(str)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function getTypeAndBaseName(objectKey) {
  const filename = path.basename(objectKey);
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);

  let id = nameWithoutExt;
  let type = 'desktop';

  if (nameWithoutExt.endsWith('_MP')) {
    id = nameWithoutExt.replace(/_MP$/, '');
    type = 'mobile';
  } else if (nameWithoutExt.endsWith('_PC')) {
    id = nameWithoutExt.replace(/_PC$/, '');
    type = 'desktop';
  }

  return { id, type, ext };
}

function createDownloadFilename(objectKey, downloadType) {
  const filename = path.basename(objectKey);
  const ext = path.extname(filename).toLowerCase();
  const nameWithoutExt = path.basename(filename, ext);

  let base = nameWithoutExt;
  if (base.endsWith('_PC')) base = base.replace(/_PC$/, '');
  if (base.endsWith('_MP')) base = base.replace(/_MP$/, '');

  const safeName = base
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  const typeLabel = downloadType === 'mobile' ? 'mobile' : 'desktop';
  return `${safeName}-${typeLabel}-wallpaper${ext}`;
}


function runGenerateSitemap() {
  return new Promise((resolve) => {
    exec('node generate_sitemap.js', { cwd: __dirname }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Sitemap] Failed to generate sitemap:', err.message);
        if (stderr) console.error(stderr);
        return resolve(false);
      }

      if (stdout) console.log(stdout.trim());
      console.log('[Sitemap] sitemap.xml generated successfully.');
      resolve(true);
    });
  });
}

// R2 object index: `${wallpaperSlug}_${desktop|mobile}` -> R2 object key
const fileIndex = new Map();
let lastIndexBuildAt = 0;
let isBuildingIndex = false;

async function buildR2FileIndex() {
  if (isBuildingIndex) return;
  isBuildingIndex = true;

  try {
    fileIndex.clear();
    let continuationToken;

    do {
      const result = await r2.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      }));

      for (const obj of result.Contents || []) {
        const key = obj.Key;
        if (!key || !/\.(png|jpe?g|webp)$/i.test(key)) continue;

        const { id, type } = getTypeAndBaseName(key);
        const slugId = toSlug(id);
        fileIndex.set(`${slugId}_${type}`, key);
      }

      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    lastIndexBuildAt = Date.now();
    console.log(`[R2] File index loaded: ${fileIndex.size} objects ready for secure download.`);
  } catch (err) {
    console.error('[R2] Failed to build file index:', err);
  } finally {
    isBuildingIndex = false;
  }
}

async function ensureFreshIndex() {
  // Rebuild at most once every 10 minutes, or if empty.
  if (fileIndex.size === 0 || Date.now() - lastIndexBuildAt > 10 * 60 * 1000) {
    await buildR2FileIndex();
  }
}

// Token pool: token -> { objectKey, type, expiresAt }
const tokenPool = new Map();

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenPool.entries()) {
    if (now > data.expiresAt) tokenPool.delete(token);
  }
}

setInterval(cleanupExpiredTokens, 60 * 1000).unref?.();


app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    storage: 'cloudflare-r2',
    indexedFiles: fileIndex.size,
  });
});

// Keep these endpoints so the frontend will not break if it still connects to them.
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`);
});

app.post('/api/regenerate-wallpapers', async (req, res) => {
  await buildR2FileIndex();
  res.json({ ok: true, message: 'R2 file index rebuilt.' });
});

// API: generate one-time download link.
app.get('/api/generate-link', async (req, res) => {
  const { id, type } = req.query;

  if (!id || !type) {
    return res.status(400).json({ error: 'Missing id or type parameter' });
  }

  await ensureFreshIndex();

  const lookupKey = `${id}_${type}`;
  const objectKey = fileIndex.get(lookupKey);

  console.log(`[Generate Link] id=${id}, type=${type}, lookupKey=${lookupKey}, objectKey=${objectKey || 'N/A'}`);

  if (!objectKey) {
    return res.status(404).json({
      error: 'Original file not found in R2',
      id,
      type,
      lookupKey,
      indexedFiles: fileIndex.size,
    });
  }

  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 60 * 1000;

  tokenPool.set(token, { objectKey, type, expiresAt });

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    url: `${baseUrl}/api/download?token=${token}`,
  });
});

// API: validate token and stream file from R2.
app.get('/api/download', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Missing token');
  }

  const tokenData = tokenPool.get(token);

  if (!tokenData) {
    return res.status(403).send('Invalid or expired token');
  }

  if (Date.now() > tokenData.expiresAt) {
    tokenPool.delete(token);
    return res.status(403).send('Token has expired');
  }

  tokenPool.delete(token);

  try {
    const result = await r2.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: tokenData.objectKey,
    }));

    const filename = createDownloadFilename(tokenData.objectKey, tokenData.type);

    res.setHeader('Content-Type', result.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'no-store');

    if (result.ContentLength) {
      res.setHeader('Content-Length', String(result.ContentLength));
    }

    result.Body.pipe(res);
  } catch (err) {
    console.error('[Download] R2 download failed:', err);
    res.status(500).send('Download failed');
  }
});

// SEO URL routes for traffic landing pages.
const seoRoutes = [
  '/cyberpunk-wallpapers',
  '/dark-wallpapers',
  '/rainy-city-wallpapers',
  '/minimal-wallpapers',
  '/anime-wallpapers',
  '/zh/cyberpunk-wallpapers',
  '/zh/dark-wallpapers',
  '/zh/rainy-city-wallpapers',
  '/zh/minimal-wallpapers',
  '/zh/anime-wallpapers',
];

seoRoutes.forEach((route) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
});

buildR2FileIndex()
  .then(() => runGenerateSitemap())
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Backend Server running on port ${PORT}`);
      console.log(`R2 bucket: ${R2_BUCKET_NAME}`);
      console.log(`R2 indexed files: ${fileIndex.size}`);
    });
  });
