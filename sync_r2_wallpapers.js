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
const syncCacheFile = path.join(__dirname, 'public', 'sync-cache.json');
const envFile = path.join(__dirname, '.env');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DEFAULT_TAGS = ['Premium', 'Aesthetic'];
const STOP_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'under', 'with']);
const FIXED_KEYWORDS = [
  '4k wallpaper',
  'desktop wallpaper',
  'mobile wallpaper',
  'free wallpaper',
  'aesthetic wallpaper',
];
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
  const words = wordsFromSlug(slug);
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

function hasStopWordTag(tags) {
  if (!Array.isArray(tags)) return false;
  return tags.some(tag => STOP_WORDS.has(String(tag || '').trim().toLowerCase()));
}

function hasSeoValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value || '').trim().length > 0;
}

function uniqueValues(values, normalizer = value => String(value || '').trim()) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = normalizer(value);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function wordsFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .map(word => word.trim())
    .filter(word => word && !STOP_WORDS.has(word.toLowerCase()));
}

function seoTagsForDescription(record) {
  const defaultTagSet = new Set(DEFAULT_TAGS.map(tag => tag.toLowerCase()));
  const tags = Array.isArray(record.tags) ? record.tags : [];
  const primaryTags = tags.filter(tag => {
    const value = String(tag || '').toLowerCase();
    return value && !defaultTagSet.has(value) && !STOP_WORDS.has(value);
  });
  const fallbackTags = [
    ...wordsFromSlug(record.slug).map(toTag),
    record.category,
    ...DEFAULT_TAGS,
  ];

  const values = uniqueValues([...primaryTags, ...fallbackTags]);
  while (values.length < 3) {
    values.push(['Cinematic', 'Aesthetic', 'High Quality'][values.length] || 'Wallpaper');
  }

  return values.slice(0, 3);
}

function keywordsForRecord(record) {
  const values = [
    ...wordsFromSlug(record.slug),
    ...(record.title || '').split(/\s+/).filter(word => !STOP_WORDS.has(String(word || '').toLowerCase())),
    record.category,
    ...(Array.isArray(record.tags) ? record.tags : []),
    ...FIXED_KEYWORDS,
  ];

  return uniqueValues(values, value => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!/[a-z0-9]/i.test(normalized)) return '';
    return STOP_WORDS.has(normalized) ? '' : normalized;
  });
}

function buildSeoFields(record) {
  const readableTitle = record.title || toTitle(record.slug) || 'Cinematic Wallpaper';
  const category = record.category || 'Wallpaper';
  const [tag1, tag2, tag3] = seoTagsForDescription(record);

  return {
    seoTitle: `${readableTitle} 4K Wallpaper for Desktop and Mobile | Afterglowr`,
    seoDescription: `Download ${readableTitle} in high quality for desktop and mobile. A cinematic ${category.toLowerCase()} wallpaper with ${tag1}, ${tag2}, and ${tag3} aesthetics.`,
    altText: `${readableTitle} 4K ${category} wallpaper for desktop and mobile`,
    keywords: keywordsForRecord(record),
  };
}

function isAutoSeoDescription(value) {
  return /^Download .+ in high quality for desktop and mobile\. A cinematic .+ wallpaper with .+, .+, and .+ aesthetics\.$/.test(String(value || ''));
}

function isAutoSeoTitle(value) {
  return /^.+ 4K Wallpaper for Desktop and Mobile \| Afterglowr$/.test(String(value || ''));
}

function isAutoAltText(value) {
  return /^.+ 4K .+ wallpaper for desktop and mobile$/.test(String(value || ''));
}

function isAutoKeywords(value) {
  if (!Array.isArray(value)) return false;
  const normalized = value.map(item => String(item || '').toLowerCase());
  return FIXED_KEYWORDS.every(keyword => normalized.includes(keyword));
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

function normalizeEtag(etag) {
  return String(etag || '').replace(/^"|"$/g, '');
}

function normalizeLastModified(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function formatResolution(width, height) {
  return width && height ? `${width} \u00d7 ${height} px` : null;
}

function readSyncCache() {
  if (!fs.existsSync(syncCacheFile)) {
    return { version: 2, records: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(syncCacheFile, 'utf8'));
    const records = Array.isArray(parsed?.records)
      ? parsed.records
      : Object.values(parsed?.records || {});
    return { version: 2, records };
  } catch (error) {
    throw new Error(`Unable to parse public/sync-cache.json: ${error.message}`);
  }
}

function writeSyncCache(records) {
  const sortedRecords = [...records].sort((a, b) => a.slug.localeCompare(b.slug));
  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    records: sortedRecords,
  };
  fs.writeFileSync(syncCacheFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function cacheBySlug(cache) {
  return new Map((cache.records || []).filter(record => record?.slug).map(record => [record.slug, record]));
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

async function readImageMetadata(client, bucket, key) {
  if (!key) return null;

  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const buffer = await bodyToBuffer(result.Body);
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) return null;
    return {
      width: metadata.width,
      height: metadata.height,
      resolution: formatResolution(metadata.width, metadata.height),
    };
  } catch (error) {
    console.warn(`[R2 Sync] Unable to read image resolution for ${key}: ${error.message}`);
    return null;
  }
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
      desktopEtag: null,
      mobileEtag: null,
      desktopLastModified: null,
      mobileLastModified: null,
      desktopWidth: null,
      desktopHeight: null,
      mobileWidth: null,
      mobileHeight: null,
      desktopThumbKey: null,
      mobileThumbKey: null,
      sourceCategories: new Set([parsed.category]),
      sourceKeys: [parsed.key],
    });
  }

  const item = map.get(parsed.slug);
  item.sourceCategories.add(parsed.category);
  if (!item.sourceKeys.includes(parsed.key)) item.sourceKeys.push(parsed.key);

  if (item.category !== parsed.category) {
    item.hasDuplicateCategory = true;
  } else {
    item.category = parsed.category;
  }

  if (parsed.type === 'desktop') {
    item.desktopKey = parsed.key;
    item.desktopEtag = parsed.etag || null;
    item.desktopLastModified = parsed.lastModified || null;
  }
  if (parsed.type === 'mobile') {
    item.mobileKey = parsed.key;
    item.mobileEtag = parsed.etag || null;
    item.mobileLastModified = parsed.lastModified || null;
  }
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
  if (!await objectExists(client, bucket, thumbKey)) {
    throw new Error(`Thumbnail upload verification failed: ${thumbKey}`);
  }

  console.log(`[R2 Sync] Uploaded thumbnail: ${thumbKey}`);
  return thumbKey;
}

async function ensureThumbnailSafe(options) {
  try {
    const key = await ensureThumbnail(options);
    return key ? { key, failed: false } : { key: null, failed: false };
  } catch (error) {
    console.warn(`[R2 Sync] Thumbnail failed for ${options.originalKey}: ${error.message}`);
    return { key: null, failed: true };
  }
}

function typeField(type, field) {
  return `${type}${field}`;
}

function isCachedTypeUnchanged(item, cacheRecord, type, thumbKey) {
  if (!cacheRecord || !thumbKey) return false;

  return cacheRecord[typeField(type, 'OriginalKey')] === item[typeField(type, 'Key')]
    && cacheRecord[typeField(type, 'Etag')] === item[typeField(type, 'Etag')]
    && cacheRecord[typeField(type, 'LastModified')] === item[typeField(type, 'LastModified')]
    && cacheRecord[typeField(type, 'ThumbKey')] === thumbKey;
}

function hasCachedDimensions(cacheRecord, type) {
  return Boolean(cacheRecord?.[typeField(type, 'Width')] && cacheRecord?.[typeField(type, 'Height')]);
}

function applyCachedDimensions(item, cacheRecord, type) {
  item[typeField(type, 'Width')] = cacheRecord[typeField(type, 'Width')] || null;
  item[typeField(type, 'Height')] = cacheRecord[typeField(type, 'Height')] || null;
}

async function ensureImageMetadata({ client, bucket, item, type, cacheRecord, cacheUnchanged }) {
  const originalKey = item[typeField(type, 'Key')];
  if (!originalKey) return;

  if (cacheUnchanged && hasCachedDimensions(cacheRecord, type)) {
    applyCachedDimensions(item, cacheRecord, type);
    return;
  }

  const metadata = await readImageMetadata(client, bucket, originalKey);
  if (!metadata) return;

  item[typeField(type, 'Width')] = metadata.width;
  item[typeField(type, 'Height')] = metadata.height;
}

async function ensureThumbnailIncremental({ client, bucket, item, type, tmpDir, thumbnailsPrefix, cacheRecord }) {
  const originalKey = item[typeField(type, 'Key')];
  if (!originalKey) {
    return { key: null, failed: false, uploaded: false, skipped: false, unchanged: false };
  }

  const thumbKey = thumbKeyFor(item, type, thumbnailsPrefix);
  const cacheUnchanged = isCachedTypeUnchanged(item, cacheRecord, type, thumbKey);

  if (cacheUnchanged && await objectExists(client, bucket, thumbKey)) {
    console.log(`[R2 Sync] Unchanged thumbnail skipped: ${thumbKey}`);
    return { key: thumbKey, failed: false, uploaded: false, skipped: true, unchanged: true };
  }

  const beforeExists = await objectExists(client, bucket, thumbKey);
  const result = await ensureThumbnailSafe({
    client,
    bucket,
    item,
    originalKey,
    type,
    tmpDir,
    thumbnailsPrefix,
  });

  return {
    key: result.key,
    failed: result.failed,
    uploaded: Boolean(result.key && !beforeExists && !result.failed),
    skipped: Boolean(result.key && beforeExists && !result.failed),
    unchanged: false,
  };
}

function toWallpaperRecord(item) {
  const resolution = formatResolution(item.desktopWidth, item.desktopHeight)
    || formatResolution(item.mobileWidth, item.mobileHeight)
    || item.resolution
    || 'High Resolution';

  const record = {
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
    resolution,
  };

  return {
    ...record,
    ...buildSeoFields(record),
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

  const merged = {
    ...existing,
    id: existing.id || generated.id,
    slug: existing.slug || generated.slug,
    title: existing.title || generated.title,
    tags: hasOnlyDefaultTags(existing.tags) || hasStopWordTag(existing.tags) ? generated.tags : existing.tags,
    category: generated.category,
    desktopImg: generated.desktopImg || null,
    mobileImg: generated.mobileImg || null,
    desktopOriginalKey: generated.desktopOriginalKey || null,
    mobileOriginalKey: generated.mobileOriginalKey || null,
    hasDesktop: generated.hasDesktop,
    hasMobile: generated.hasMobile,
    resolution: generated.resolution || existing.resolution || 'High Resolution',
  };

  const seoFields = buildSeoFields(merged);

  return {
    ...merged,
    seoTitle: hasSeoValue(existing.seoTitle) && !isAutoSeoTitle(existing.seoTitle) ? existing.seoTitle : seoFields.seoTitle,
    seoDescription: hasSeoValue(existing.seoDescription) && !isAutoSeoDescription(existing.seoDescription) ? existing.seoDescription : seoFields.seoDescription,
    altText: hasSeoValue(existing.altText) && !isAutoAltText(existing.altText) ? existing.altText : seoFields.altText,
    keywords: hasSeoValue(existing.keywords) && !isAutoKeywords(existing.keywords) ? existing.keywords : seoFields.keywords,
  };
}

function getExistingKey(item) {
  return item.id || item.slug;
}

function hasRenderableThumbnail(item) {
  return Boolean(item?.desktopThumbKey);
}

function toCacheRecord(item) {
  return {
    slug: item.slug,
    category: item.category,
    desktopOriginalKey: item.desktopKey || null,
    mobileOriginalKey: item.mobileKey || null,
    desktopEtag: item.desktopEtag || null,
    mobileEtag: item.mobileEtag || null,
    desktopLastModified: item.desktopLastModified || null,
    mobileLastModified: item.mobileLastModified || null,
    desktopThumbKey: item.desktopThumbKey || null,
    mobileThumbKey: item.mobileThumbKey || null,
    desktopWidth: item.desktopWidth || null,
    desktopHeight: item.desktopHeight || null,
    mobileWidth: item.mobileWidth || null,
    mobileHeight: item.mobileHeight || null,
  };
}

function isWallpaperCachedUnchanged(item, cacheRecord, thumbnailsPrefix) {
  if (!cacheRecord || cacheRecord.category !== item.category) return false;
  const types = ['desktop', 'mobile'].filter(type => item[typeField(type, 'Key')]);
  if (types.length === 0) return false;

  return types.every(type => isCachedTypeUnchanged(item, cacheRecord, type, thumbKeyFor(item, type, thumbnailsPrefix)));
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

  const previousCache = readSyncCache();
  const previousCacheBySlug = cacheBySlug(previousCache);
  const discovered = new Map();
  const objects = await listR2Objects(client, bucket, originalsPrefix);
  console.log(`[R2 Sync] Found ${objects.length} objects under ${originalsPrefix}`);

  let parsedOriginals = 0;
  for (const object of objects) {
    const parsed = parseOriginalObject(object.Key, originalsPrefix);
    if (parsed) {
      parsed.etag = normalizeEtag(object.ETag);
      parsed.lastModified = normalizeLastModified(object.LastModified);
      parsedOriginals += 1;
      addOriginalToMap(discovered, parsed);
    }
  }

  const duplicateSlugItems = [...discovered.values()].filter(item => item.hasDuplicateCategory);
  if (duplicateSlugItems.length > 0) {
    console.warn('[R2 Sync] Duplicate slugs found in multiple original categories:');
    for (const item of duplicateSlugItems) {
      console.warn(`[R2 Sync]   ${item.slug}: ${[...item.sourceCategories].join(', ')}`);
      for (const key of item.sourceKeys) {
        console.warn(`[R2 Sync]     ${key}`);
      }
    }
    throw new Error('Duplicate slugs found across categories. Resolve R2 originals before syncing.');
  }

  let uploadedThumbnails = 0;
  let skippedThumbnails = 0;
  let failedThumbnails = 0;

  for (const item of discovered.values()) {
    if (!item.desktopKey && !item.mobileKey) continue;

    const cacheRecord = previousCacheBySlug.get(item.slug);

    if (item.desktopKey) {
      const desktopResult = await ensureThumbnailIncremental({
        client,
        bucket,
        item,
        type: 'desktop',
        tmpDir,
        thumbnailsPrefix,
        cacheRecord,
      });
      item.desktopThumbKey = desktopResult.key;
      if (desktopResult.failed) failedThumbnails += 1;
      else if (desktopResult.uploaded) uploadedThumbnails += 1;
      else if (desktopResult.skipped) skippedThumbnails += 1;
      await ensureImageMetadata({
        client,
        bucket,
        item,
        type: 'desktop',
        cacheRecord,
        cacheUnchanged: desktopResult.unchanged,
      });
    }

    if (item.mobileKey) {
      const mobileResult = await ensureThumbnailIncremental({
        client,
        bucket,
        item,
        type: 'mobile',
        tmpDir,
        thumbnailsPrefix,
        cacheRecord,
      });
      item.mobileThumbKey = mobileResult.key;
      if (mobileResult.failed) failedThumbnails += 1;
      else if (mobileResult.uploaded) uploadedThumbnails += 1;
      else if (mobileResult.skipped) skippedThumbnails += 1;
      await ensureImageMetadata({
        client,
        bucket,
        item,
        type: 'mobile',
        cacheRecord,
        cacheUnchanged: mobileResult.unchanged,
      });
    }
  }

  const existing = readExistingWallpapers();
  const existingByKey = new Map(existing.map(item => [getExistingKey(item), item]).filter(([key]) => key));
  const touchedKeys = new Set();
  const nextCacheRecords = [];
  let changedWallpapers = 0;
  let movedWallpapers = 0;
  let skippedUnchanged = 0;
  let removedWallpapers = 0;
  const nextWallpapers = existing.map(item => {
    const key = getExistingKey(item);
    const discoveredItem = key ? discovered.get(key) : null;
    if (!discoveredItem || (!discoveredItem.desktopKey && !discoveredItem.mobileKey) || !hasRenderableThumbnail(discoveredItem)) {
      removedWallpapers += 1;
      return null;
    }

    touchedKeys.add(key);
    const cacheRecord = previousCacheBySlug.get(key);
    const moved = item.category !== discoveredItem.category
      || item.desktopOriginalKey !== (discoveredItem.desktopKey || null)
      || item.mobileOriginalKey !== (discoveredItem.mobileKey || null);
    const unchanged = isWallpaperCachedUnchanged(discoveredItem, cacheRecord, thumbnailsPrefix) && !moved;
    if (moved) movedWallpapers += 1;
    else if (unchanged) skippedUnchanged += 1;
    else changedWallpapers += 1;
    nextCacheRecords.push(toCacheRecord(discoveredItem));
    return mergeWallpaperRecord(item, toWallpaperRecord(discoveredItem));
  }).filter(Boolean);

  const newRecords = [];
  for (const item of discovered.values()) {
    if (!item.desktopKey && !item.mobileKey) continue;
    if (!hasRenderableThumbnail(item)) continue;
    if (existingByKey.has(item.id) || existingByKey.has(item.slug) || touchedKeys.has(item.id)) continue;
    newRecords.push(toWallpaperRecord(item));
    nextCacheRecords.push(toCacheRecord(item));
  }

  newRecords.sort((a, b) => a.slug.localeCompare(b.slug));
  writeWallpapers([...nextWallpapers, ...newRecords]);
  writeSyncCache(nextCacheRecords);

  console.log(`[R2 Sync] total originals found: ${parsedOriginals}`);
  console.log(`[R2 Sync] new wallpapers: ${newRecords.length}`);
  console.log(`[R2 Sync] changed wallpapers: ${changedWallpapers}`);
  console.log(`[R2 Sync] moved wallpapers: ${movedWallpapers}`);
  console.log(`[R2 Sync] deleted wallpapers: ${removedWallpapers}`);
  console.log(`[R2 Sync] skipped unchanged: ${skippedUnchanged}`);
  console.log(`[R2 Sync] thumbnails uploaded: ${uploadedThumbnails}`);
  console.log(`[R2 Sync] thumbnails skipped: ${skippedThumbnails}`);
  console.log(`[R2 Sync] failed thumbnails: ${failedThumbnails}`);
  console.log(`[R2 Sync] duplicate slugs: ${duplicateSlugItems.length}`);
  console.log(`[R2 Sync] public/wallpapers.json updated with ${nextWallpapers.length + newRecords.length} records.`);
  console.log(`[R2 Sync] public/sync-cache.json updated with ${nextCacheRecords.length} records.`);
}

main().catch(error => {
  console.error('[R2 Sync] Failed:', error);
  process.exitCode = 1;
});
