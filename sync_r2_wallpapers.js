import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wallpapersFile = path.join(__dirname, 'public', 'wallpapers.json');
const envFile = path.join(__dirname, '.env');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DEFAULT_TAGS = ['Premium', 'Aesthetic'];
const TYPE_SUFFIXES = {
  desktop: /(?:[_-]PC)$/i,
  mobile: /(?:[_-]MP)$/i,
};

function loadEnvFile() {
  if (!fs.existsSync(envFile)) return;

  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizePrefix(prefix) {
  return String(prefix || '')
    .replace(/^\/+/, '')
    .replace(/\/?$/, '/');
}

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function toTitle(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(word => {
      if (word === 'cs2') return 'CS2';
      if (word === 'ai') return 'AI';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function toTag(word) {
  if (word === 'cs2') return 'CS2';
  if (word === 'ai') return 'AI';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function stripTypeSuffix(filenameWithoutExt) {
  return filenameWithoutExt
    .replace(TYPE_SUFFIXES.desktop, '')
    .replace(TYPE_SUFFIXES.mobile, '');
}

function detectType(filenameWithoutExt) {
  if (TYPE_SUFFIXES.mobile.test(filenameWithoutExt)) return 'mobile';
  if (TYPE_SUFFIXES.desktop.test(filenameWithoutExt)) return 'desktop';
  return null;
}

function parseOriginalObject(key, originalsPrefix) {
  const segments = key.split('/').filter(Boolean);
  const prefix = originalsPrefix.replace(/\/+$/, '');
  if (segments.length < 3 || segments[0] !== prefix) return null;

  const category = segments[1];
  const ext = path.extname(key).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return null;

  const filenameWithoutExt = path.basename(key, ext);
  const type = detectType(filenameWithoutExt);
  if (!type) return null;

  const baseName = stripTypeSuffix(filenameWithoutExt);
  const slug = toSlug(baseName);
  if (!slug) return null;

  return {
    key,
    category,
    type,
    slug,
    id: slug,
    title: toTitle(slug),
  };
}

function tagsFromSlug(slug) {
  const words = String(slug || '').split('-').filter(Boolean);
  const tags = words.map(toTag);

  for (const tag of DEFAULT_TAGS) {
    if (!tags.includes(tag)) tags.push(tag);
  }

  return tags;
}

function hasOnlyDefaultTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return true;
  if (tags.length !== DEFAULT_TAGS.length) return false;

  return DEFAULT_TAGS.every((tag, index) => tags[index] === tag);
}

function thumbKeyFor(item, type, thumbnailsPrefix) {
  const suffix = type === 'mobile' ? 'MP' : 'PC';
  return `${thumbnailsPrefix}${item.category}/${item.slug}_${suffix}.webp`;
}

function thumbUrlForKey(key) {
  const safeKey = key.replace(/^\/+/, '');
  const cdnBaseUrl = process.env.R2_CDN_BASE_URL;
  if (cdnBaseUrl) {
    return `${cdnBaseUrl.replace(/\/+$/, '')}/${safeKey}`;
  }

  return `/${safeKey}`;
}

async function bodyToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function listR2Objects(client, bucket, prefix) {
  const objects = [];
  let continuationToken;

  do {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const object of result.Contents || []) {
      if (object.Key) objects.push(object);
    }

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

async function objectExists(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === 'NotFound') return false;
    throw error;
  }
}

async function downloadObject(client, bucket, key, destinationPath) {
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const buffer = await bodyToBuffer(result.Body);
  fs.writeFileSync(destinationPath, buffer);
}

async function uploadWebp(client, bucket, key, filePath) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.readFileSync(filePath),
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

function addOriginalToMap(map, parsed) {
  if (!map.has(parsed.slug)) {
    map.set(parsed.slug, {
      id: parsed.id,
      slug: parsed.slug,
      title: parsed.title,
      category: parsed.category,
      tags: tagsFromSlug(parsed.slug),
      desktopKey: null,
      mobileKey: null,
      desktopThumbKey: null,
      mobileThumbKey: null,
    });
  }

  const item = map.get(parsed.slug);
  if (parsed.type === 'desktop') item.desktopKey = parsed.key;
  if (parsed.type === 'mobile') item.mobileKey = parsed.key;
}

async function ensureThumbnail({ client, bucket, item, originalKey, type, tmpDir, thumbnailsPrefix }) {
  if (!originalKey) return null;

  const thumbKey = thumbKeyFor(item, type, thumbnailsPrefix);
  if (await objectExists(client, bucket, thumbKey)) {
    console.log(`[R2 Sync] Thumbnail exists, skipped: ${thumbKey}`);
    return thumbKey;
  }

  const originalExt = path.extname(originalKey) || '.img';
  const originalPath = path.join(tmpDir, `${item.slug}_${type}${originalExt}`);
  const webpPath = path.join(tmpDir, `${item.slug}_${type}.webp`);

  console.log(`[R2 Sync] Generating thumbnail: ${thumbKey}`);
  await downloadObject(client, bucket, originalKey, originalPath);

  await sharp(originalPath)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(webpPath);

  await uploadWebp(client, bucket, thumbKey, webpPath);
  console.log(`[R2 Sync] Uploaded thumbnail: ${thumbKey}`);
  return thumbKey;
}

function toWallpaperRecord(item) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    tags: item.tags,
    category: item.category,
    desktopImg: item.desktopThumbKey ? thumbUrlForKey(item.desktopThumbKey) : null,
    mobileImg: item.mobileThumbKey ? thumbUrlForKey(item.mobileThumbKey) : null,
    desktopOriginalKey: item.desktopKey || null,
    mobileOriginalKey: item.mobileKey || null,
    hasMobile: Boolean(item.mobileKey),
    hasDesktop: Boolean(item.desktopKey),
    resolution: 'High Resolution',
  };
}

function readExistingWallpapers() {
  if (!fs.existsSync(wallpapersFile)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(wallpapersFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error(`Unable to parse public/wallpapers.json: ${error.message}`);
  }
}

function writeWallpapers(wallpapers) {
  fs.writeFileSync(wallpapersFile, `${JSON.stringify(wallpapers, null, 2)}\n`, 'utf8');
}

function mergeWallpaperRecord(existing, generated) {
  if (!existing) return generated;

  return {
    ...existing,
    id: existing.id || generated.id,
    slug: existing.slug || generated.slug,
    title: existing.title || generated.title,
    tags: hasOnlyDefaultTags(existing.tags) ? generated.tags : existing.tags,
    category: existing.category || generated.category,
    desktopImg: generated.desktopImg || existing.desktopImg || null,
    mobileImg: generated.mobileImg || existing.mobileImg || null,
    desktopOriginalKey: generated.desktopOriginalKey || existing.desktopOriginalKey || null,
    mobileOriginalKey: generated.mobileOriginalKey || existing.mobileOriginalKey || null,
    hasDesktop: generated.hasDesktop,
    hasMobile: generated.hasMobile,
    resolution: existing.resolution || generated.resolution,
  };
}

function getExistingKey(item) {
  return item.id || item.slug;
}

async function main() {
  loadEnvFile();

  const endpoint = requiredEnv('R2_ENDPOINT');
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY');
  const bucket = process.env.R2_BUCKET_NAME || 'afterglowr-originals';
  const originalsPrefix = normalizePrefix(process.env.R2_PREFIX_ORIGINALS || 'originals');
  const thumbnailsPrefix = normalizePrefix(process.env.R2_PREFIX_THUMBNAILS || 'thumbnails');
  const tmpDir = process.env.R2_SYNC_TMP_DIR
    ? path.resolve(process.env.R2_SYNC_TMP_DIR)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'afterglowr-r2-sync-'));

  fs.mkdirSync(tmpDir, { recursive: true });

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log(`[R2 Sync] Bucket: ${bucket}`);
  console.log(`[R2 Sync] Scanning originals prefix: ${originalsPrefix}`);
  console.log(`[R2 Sync] Writing thumbnails prefix: ${thumbnailsPrefix}`);

  const discovered = new Map();
  const objects = await listR2Objects(client, bucket, originalsPrefix);
  console.log(`[R2 Sync] Found ${objects.length} objects under ${originalsPrefix}`);

  for (const object of objects) {
    const parsed = parseOriginalObject(object.Key, originalsPrefix);
    if (parsed) addOriginalToMap(discovered, parsed);
  }

  let uploadedThumbnails = 0;
  let skippedThumbnails = 0;

  for (const item of discovered.values()) {
    if (!item.desktopKey) {
      console.warn(`[R2 Sync] Skipping thumbnails for ${item.slug}: missing _PC desktop original.`);
      continue;
    }

    const beforeDesktop = await objectExists(client, bucket, thumbKeyFor(item, 'desktop', thumbnailsPrefix));
    item.desktopThumbKey = await ensureThumbnail({
      client,
      bucket,
      item,
      originalKey: item.desktopKey,
      type: 'desktop',
      tmpDir,
      thumbnailsPrefix,
    });
    if (beforeDesktop) skippedThumbnails += 1;
    else uploadedThumbnails += 1;

    if (item.mobileKey) {
      const beforeMobile = await objectExists(client, bucket, thumbKeyFor(item, 'mobile', thumbnailsPrefix));
      item.mobileThumbKey = await ensureThumbnail({
        client,
        bucket,
        item,
        originalKey: item.mobileKey,
        type: 'mobile',
        tmpDir,
        thumbnailsPrefix,
      });
      if (beforeMobile) skippedThumbnails += 1;
      else uploadedThumbnails += 1;
    }
  }

  const existing = readExistingWallpapers();
  const existingByKey = new Map(existing.map(item => [getExistingKey(item), item]).filter(([key]) => key));
  const touchedKeys = new Set();
  const nextWallpapers = existing.map(item => {
    const key = getExistingKey(item);
    const discoveredItem = key ? discovered.get(key) : null;
    if (!discoveredItem || !discoveredItem.desktopKey) return item;

    touchedKeys.add(key);
    return mergeWallpaperRecord(item, toWallpaperRecord(discoveredItem));
  });

  const newRecords = [];
  for (const item of discovered.values()) {
    if (!item.desktopKey) continue;
    if (existingByKey.has(item.id) || existingByKey.has(item.slug) || touchedKeys.has(item.id)) continue;
    newRecords.push(toWallpaperRecord(item));
  }

  newRecords.sort((a, b) => a.slug.localeCompare(b.slug));
  writeWallpapers([...nextWallpapers, ...newRecords]);

  console.log(`[R2 Sync] Uploaded thumbnails: ${uploadedThumbnails}`);
  console.log(`[R2 Sync] Existing thumbnails skipped: ${skippedThumbnails}`);
  console.log(`[R2 Sync] Added new wallpapers: ${newRecords.length}`);
  console.log(`[R2 Sync] public/wallpapers.json updated with ${nextWallpapers.length + newRecords.length} records.`);
}

main().catch(error => {
  console.error('[R2 Sync] Failed:', error);
  process.exitCode = 1;
});
