import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalsDir = path.join(__dirname, 'private', 'originals');
const outputDir = path.join(__dirname, 'public', 'thumbnails');
const tagsFile = path.join(__dirname, 'tags.json');
const wallpapersOutputFile = path.join(__dirname, 'public', 'wallpapers.json');

function toSlug(str) {
    return str.toLowerCase()
              .replace(/&/g, 'and')
              .replace(/[\s_]+/g, '-')
              .replace(/[^\w-]+/g, '')
              .replace(/--+/g, '-')
              .replace(/^-+/, '')
              .replace(/-+$/, '');
}

let tagsData = {};
if (fs.existsSync(tagsFile)) {
    try {
        tagsData = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
    } catch (e) {
        console.warn('Could not parse tags.json', e);
    }
}

const wallpaperMap = new Map();

async function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function processDirectory(dir, relativePath = '') {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await processDirectory(fullPath, path.join(relativePath, file));
        } else if (stat.isFile() && /\.(png|jpe?g|webp)$/i.test(file)) {
            const outFolder = path.join(outputDir, relativePath);
            await ensureDir(outFolder);
            
            const ext = path.extname(file);
            const fileNameWithoutExt = path.basename(file, ext);
            
            let folderCategory = 'Other';
            if (relativePath) {
                folderCategory = relativePath.split(path.sep)[0];
            }

            let baseName = fileNameWithoutExt;
            let type = 'desktop';

            if (fileNameWithoutExt.endsWith('_MP')) {
                baseName = fileNameWithoutExt.replace('_MP', '');
                type = 'mobile';
            } else if (fileNameWithoutExt.endsWith('_PC')) {
                baseName = fileNameWithoutExt.replace('_PC', '');
                type = 'desktop';
            }

            const slugId = toSlug(baseName);
            
            if (!wallpaperMap.has(slugId)) {
                let readableTitle = baseName;
                if (readableTitle.toLowerCase() === baseName.toLowerCase()) {
                    readableTitle = baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/_/g, ' ');
                }
                
                let itemTags = ['Premium', 'Aesthetic'];
                let itemCategory = folderCategory;
                
                if (tagsData[baseName]) {
                    if (Array.isArray(tagsData[baseName])) {
                        itemTags = tagsData[baseName];
                    } else {
                        itemTags = tagsData[baseName].tags || itemTags;
                        itemCategory = tagsData[baseName].category || itemCategory;
                    }
                }

                wallpaperMap.set(slugId, {
                    id: slugId,
                    slug: slugId,
                    title: readableTitle,
                    tags: itemTags,
                    category: itemCategory,
                    desktopImg: null,
                    mobileImg: null,
                    hasMobile: false,
                    hasDesktop: false,
                    resolution: 'High Resolution'
                });
            }

            const item = wallpaperMap.get(slugId);
            const thumbFilename = `${slugId}_${type === 'mobile' ? 'MP' : 'PC'}.webp`;
            const outPath = path.join(outFolder, thumbFilename);
            
            const thumbPathPart = relativePath ? relativePath.replace(/\\/g, '/') + '/' : '';
            const thumbUrl = `/thumbnails/${thumbPathPart}${thumbFilename}`;
            
            if (type === 'mobile') {
                item.mobileImg = thumbUrl;
                item.hasMobile = true;
            } else {
                item.desktopImg = thumbUrl;
                item.hasDesktop = true;
                try {
                    const metadata = await sharp(fullPath).metadata();
                    item.resolution = `${metadata.width} × ${metadata.height} px`;
                } catch(e) {}
            }

            if (!fs.existsSync(outPath)) {
                console.log(`Generating thumbnail for: ${file} -> ${thumbFilename}`);
                try {
                    await sharp(fullPath)
                        .resize({ width: 800, withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toFile(outPath);
                } catch (e) {
                    console.error(`Failed to process ${file}:`, e);
                }
            }
        }
    }
}

async function main() {
    console.log('Starting data and thumbnail generation with slugs...');
    await ensureDir(outputDir);
    if (fs.existsSync(originalsDir)) {
        await processDirectory(originalsDir);
        
        const wallpapersArray = Array.from(wallpaperMap.values()).filter(wp => wp.hasDesktop);
        fs.writeFileSync(wallpapersOutputFile, JSON.stringify(wallpapersArray, null, 2), 'utf8');
        console.log(`Successfully wrote ${wallpapersArray.length} wallpapers to wallpapers.json`);
        
    } else {
        console.warn('private/originals directory not found!');
    }
}

main();
