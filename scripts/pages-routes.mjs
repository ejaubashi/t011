import { copyFile, mkdir } from 'node:fs/promises';

// GitHub Pages has no SPA rewrites. Publish entry files for the app's routes.
const routes = ['about', 'contact', 'work/prism', 'work/ara-niko', 'work/cosmos', 'work/halvern'];
for (const route of routes) {
  await mkdir(`dist/${route}`, { recursive: true });
  await copyFile('dist/index.html', `dist/${route}/index.html`);
}
await copyFile('dist/index.html', 'dist/404.html');
