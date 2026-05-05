import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const sourceIndex = path.join(distDir, 'index.html');

if (!fs.existsSync(sourceIndex)) {
  console.error('[postbuild] dist/index.html not found.');
  process.exit(1);
}

const routes = [
  'zh',
  'cyberpunk-wallpapers',
  'dark-wallpapers',
  'rainy-city-wallpapers',
  'minimal-wallpapers',
  'anime-wallpapers',
  'zh/cyberpunk-wallpapers',
  'zh/dark-wallpapers',
  'zh/rainy-city-wallpapers',
  'zh/minimal-wallpapers',
  'zh/anime-wallpapers'
];

for (const route of routes) {
  const dir = path.join(distDir, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(sourceIndex, path.join(dir, 'index.html'));
  console.log(`[postbuild] created ${route}/index.html`);
}

console.log('[postbuild] SPA fallback files created.');
