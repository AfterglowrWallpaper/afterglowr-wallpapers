import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://www.afterglowr.com';
const wallpapersFile = path.join(__dirname, 'public', 'wallpapers.json');
const sitemapFile = path.join(__dirname, 'public', 'sitemap.xml');

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

function absoluteUrl(pathValue = '') {
    if (!pathValue) return '';
    if (/^https?:\/\//i.test(pathValue)) return pathValue;
    return `${BASE_URL}${pathValue.startsWith('/') ? pathValue : `/${pathValue}`}`;
}

function safePathSegment(value = '') {
    return xmlEscape(String(value));
}

function generateSitemap() {
    if (!fs.existsSync(wallpapersFile)) {
        console.warn('wallpapers.json not found. Please run npm run sync:r2 first.');
        return;
    }

    let wallpapers = [];
    try {
        wallpapers = JSON.parse(fs.readFileSync(wallpapersFile, 'utf8'));
    } catch (error) {
        console.error('Error reading wallpapers.json:', error);
        return;
    }

    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
    const today = localISOTime.split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/zh/</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.95</priority>\n`;
    xml += `  </url>\n`;

    for (const route of SEO_CATEGORY_ROUTES) {
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/${safePathSegment(route)}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.92</priority>\n`;
        xml += `  </url>\n`;

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/zh/${safePathSegment(route)}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.88</priority>\n`;
        xml += `  </url>\n`;
    }

    const categories = [...new Set(
        wallpapers
            .filter(wp => wp.category)
            .map(wp => String(wp.category).toLowerCase())
    )];

    for (const category of categories) {
        const safeCategory = safePathSegment(category);

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/category/${safeCategory}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
    }

    for (const wp of wallpapers) {
        if (!wp.slug) continue;

        const safeSlug = safePathSegment(wp.slug);

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/wallpaper/${safeSlug}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;

        if (wp.desktopImg) {
            const safeImageUrl = xmlEscape(absoluteUrl(wp.desktopImg));
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
    } catch (error) {
        console.error('Failed to write sitemap.xml:', error);
    }
}

generateSitemap();
