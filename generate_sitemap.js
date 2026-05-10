import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wallpapersFile = path.join(__dirname, 'public', 'wallpapers.json');
const sitemapFile = path.join(__dirname, 'public', 'sitemap.xml');

// 您可以隨時在此處修改為您的正式上線網域
const BASE_URL = 'https://afterglowr-wallpapers.vercel.app';

const SEO_CATEGORY_ROUTES = [
    'cyberpunk-wallpapers',
    'dark-wallpapers',
    'rainy-city-wallpapers',
    'minimal-wallpapers',
    'anime-wallpapers'
];

function xmlEscape(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function generateSitemap() {
    if (!fs.existsSync(wallpapersFile)) {
        console.warn('wallpapers.json not found. Please run npm run sync:r2 first.');
        return;
    }

    let wallpapers = [];
    try {
        wallpapers = JSON.parse(fs.readFileSync(wallpapersFile, 'utf8'));
    } catch (e) {
        console.error('Error reading wallpapers.json:', e);
        return;
    }

    // 取得「本地時區」的當天日期 (YYYY-MM-DD)
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
    const today = localISOTime.split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    
    // 1. 首頁 (Home)
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 中文首頁
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/zh/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.95</priority>\n`;
    xml += `  </url>\n`;

    // SEO Category Landing Pages
    for (const route of SEO_CATEGORY_ROUTES) {
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/${route}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.92</priority>\n`;
        xml += `  </url>\n`;

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/zh/${route}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.88</priority>\n`;
        xml += `  </url>\n`;
    }

    // 2. 分類頁 (Category Pages)
    const categories = [...new Set(wallpapers.filter(wp => wp.category).map(wp => wp.category.toLowerCase()))];
    for (const cat of categories) {
        const safeCat = cat.replace(/&/g, '&amp;')
                           .replace(/</g, '&lt;')
                           .replace(/>/g, '&gt;')
                           .replace(/"/g, '&quot;')
                           .replace(/'/g, '&apos;');

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/category/${safeCat}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
    }

    // 3. 獨立桌布頁 (Wallpaper Pages)
    for (const wp of wallpapers) {
        if (!wp.slug) continue;
        
        // 為了確保 XML 格式安全，替換可能出現的特殊符號
        const safeSlug = wp.slug.replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&apos;');

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/wallpaper/${safeSlug}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        if (wp.desktopImg) {
            const safeImageUrl = xmlEscape(`${BASE_URL}${wp.desktopImg}`);
            const safeImageTitle = xmlEscape(`${wp.title || wp.slug} 4K Wallpaper`);
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${safeImageUrl}</image:loc>\n`;
            xml += `      <image:title>${safeImageTitle}</image:title>\n`;
            xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    try {
        fs.writeFileSync(sitemapFile, xml, 'utf8');
        console.log(`Successfully generated sitemap.xml with 1 homepage, ${categories.length} category pages, and ${wallpapers.length} wallpaper pages.`);
    } catch (e) {
        console.error('Failed to write sitemap.xml:', e);
    }
}

generateSitemap();
