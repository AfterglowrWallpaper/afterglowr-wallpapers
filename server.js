import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import chokidar from 'chokidar';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const originalsDir = path.join(__dirname, 'private', 'originals');

function toSlug(str) {
    return str.toLowerCase()
              .replace(/&/g, 'and')
              .replace(/[\s_]+/g, '-')
              .replace(/[^\w-]+/g, '')
              .replace(/--+/g, '-')
              .replace(/^-+/, '')
              .replace(/-+$/, '');
}

function createDownloadFilename(filePath, downloadType) {
    const ext = path.extname(filePath).toLowerCase();
    let base = path.basename(filePath, ext);

    if (base.endsWith('_PC')) {
        base = base.replace(/_PC$/, '');
        downloadType = 'desktop';
    } else if (base.endsWith('_MP')) {
        base = base.replace(/_MP$/, '');
        downloadType = 'mobile';
    }

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

// 建立檔案索引，加快下載時的檔案尋找速度
const fileIndex = new Map();

function buildFileIndex(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            buildFileIndex(fullPath);
        } else if (/\.(png|jpe?g|webp)$/i.test(file)) {
            const ext = path.extname(file);
            const nameWithoutExt = path.basename(file, ext);
            let id = nameWithoutExt;
            let type = 'desktop';
            
            if (nameWithoutExt.endsWith('_MP')) {
                id = nameWithoutExt.replace('_MP', '');
                type = 'mobile';
            } else if (nameWithoutExt.endsWith('_PC')) {
                id = nameWithoutExt.replace('_PC', '');
                type = 'desktop';
            }
            
            const slugId = toSlug(id);
            fileIndex.set(`${slugId}_${type}`, fullPath);
        }
    }
}

function rebuildFileIndex() {
    fileIndex.clear();
    buildFileIndex(originalsDir);
}

// 伺服器啟動時建立索引
rebuildFileIndex(originalsDir);

// Token 儲存池 (記憶體)
// 結構: token -> { id, type, expiresAt }

const tokenPool = new Map();

// ===== Realtime wallpaper update system (SSE) =====
const sseClients = new Set();
let thumbnailTimer = null;
let isGeneratingWallpapers = false;
let pendingRegeneration = false;

function broadcastEvent(payload) {
    const data = `data: ${JSON.stringify(payload)}

`;
    for (const client of sseClients) {
        client.write(data);
    }
}

function runWallpaperGeneration(reason = 'file-change') {
    if (isGeneratingWallpapers) {
        pendingRegeneration = true;
        return;
    }

    isGeneratingWallpapers = true;
    console.log(`[Realtime] Regenerating wallpapers.json because: ${reason}`);

    execFile('node', ['generate_thumbnails.js'], { cwd: __dirname }, (err, stdout, stderr) => {
        isGeneratingWallpapers = false;

        if (stdout) console.log(stdout.trim());
        if (stderr) console.warn(stderr.trim());

        if (err) {
            console.error('[Realtime] generate_thumbnails.js failed:', err);
            broadcastEvent({ type: 'wallpapers-error', message: 'Failed to regenerate wallpapers.json', ts: Date.now() });
        } else {
            rebuildFileIndex();
            broadcastEvent({ type: 'wallpapers-updated', reason, ts: Date.now() });
            console.log('[Realtime] wallpapers.json updated and clients notified.');
        }

        if (pendingRegeneration) {
            pendingRegeneration = false;
            runWallpaperGeneration('pending-file-change');
        }
    });
}

function scheduleWallpaperGeneration(reason) {
    clearTimeout(thumbnailTimer);
    thumbnailTimer = setTimeout(() => runWallpaperGeneration(reason), 900);
}

if (fs.existsSync(originalsDir)) {
    chokidar.watch(originalsDir, {
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 1200,
            pollInterval: 100
        }
    }).on('add', filePath => {
        console.log('[Realtime] image added:', filePath);
        scheduleWallpaperGeneration('image-added');
    }).on('change', filePath => {
        console.log('[Realtime] image changed:', filePath);
        scheduleWallpaperGeneration('image-changed');
    }).on('unlink', filePath => {
        console.log('[Realtime] image removed:', filePath);
        scheduleWallpaperGeneration('image-removed');
    }).on('addDir', dirPath => {
        console.log('[Realtime] folder added:', dirPath);
        scheduleWallpaperGeneration('folder-added');
    });
}


app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}

`);
    sseClients.add(res);

    req.on('close', () => {
        sseClients.delete(res);
    });
});

app.post('/api/regenerate-wallpapers', (req, res) => {
    scheduleWallpaperGeneration('manual-api');
    res.json({ ok: true, message: 'Wallpaper regeneration scheduled.' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// API: 產生一次性下載連結
app.get('/api/generate-link', (req, res) => {
    const { id, type } = req.query;
    
    if (!id || !type) {
        return res.status(400).json({ error: 'Missing id or type parameter' });
    }

    const lookupKey = `${id}_${type}`;
    const filePath = fileIndex.get(lookupKey);
    const fileExists = !!(filePath && fs.existsSync(filePath));
    
    console.log(`[Generate Link] received id: ${id}`);
    console.log(`[Generate Link] received type: ${type}`);
    console.log(`[Generate Link] lookup key: ${lookupKey}`);
    console.log(`[Generate Link] file exists: ${fileExists}`);
    console.log(`[Generate Link] file path: ${filePath || 'N/A'}`);

    if (!fileExists) {
        return res.status(404).json({ 
            error: 'Original file not found',
            id: id,
            type: type,
            lookupKey: lookupKey
        });
    }

    // 產生一組無法預測的 Token
    const token = crypto.randomUUID();
    
    // 設定 Token 60秒後過期
    const expiresAt = Date.now() + 60 * 1000;
    
    tokenPool.set(token, { id, type, expiresAt });

    // 設定定時器主動清除過期 Token
    setTimeout(() => {
        if (tokenPool.has(token)) {
            tokenPool.delete(token);
        }
    }, 60 * 1000);

    res.json({ url: `/api/download?token=${token}` });
});

// API: 驗證 Token 並下載檔案
app.get('/api/download', (req, res) => {
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

    // Token 驗證成功，立即銷毀，確保只能用一次
    tokenPool.delete(token);

    const filePath = fileIndex.get(`${tokenData.id}_${tokenData.type}`);
    
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).send('Original file not found');
    }

    const filename = createDownloadFilename(filePath, tokenData.type);

    // 串流傳送實體檔案，瀏覽器會直接觸發下載
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('File download failed:', err);
        }
    });
});


// SEO URL routes for traffic landing pages
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
    '/zh/anime-wallpapers'
];

seoRoutes.forEach(route => {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
});

app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
    console.log(`Originals index loaded: ${fileIndex.size} files ready for secure download.`);
});
