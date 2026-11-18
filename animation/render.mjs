// Render preview.html frame-by-frame with headless Chromium, then encode to MP4 with local ffmpeg.
// Usage: node animation/render.mjs [page.html] [out.mp4] [fps]   e.g. node animation/render.mjs ad-916.html ad-916-15s.mp4
// Defaults: preview.html -> preview-5s.mp4 @30fps. Paths are relative to this folder. No network, no paid services.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const pageFile = process.argv[2] || 'preview.html';
const out = path.join(dir, process.argv[3] || 'preview-5s.mp4');
const fps = Number(process.argv[4] || 30);

// Serve this folder over localhost so images (e.g. a logo) don't taint the canvas
const types = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.js':'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(base + pageFile + '?export=1');
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.DURATION);
const frames = Math.round(duration * fps);

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });

for (let i = 0; i < frames; i++) {
  const dataUrl = await page.evaluate(t => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png'); }, i / fps);
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
await browser.close();
server.close();
console.log(`wrote ${out} (${frames} frames @ ${fps}fps)`);
