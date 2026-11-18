// Render preview.html frame-by-frame with headless Chromium, then encode to MP4 with local ffmpeg.
// Usage: node animation/render.mjs [page.html] [out.mp4] [fps]   e.g. node animation/render.mjs ad-916.html ad-916-15s.mp4
// Defaults: preview.html -> preview-5s.mp4 @30fps. Paths are relative to this folder. No network, no paid services.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const pageFile = process.argv[2] || 'preview.html';
const out = path.join(dir, process.argv[3] || 'preview-5s.mp4');
const fps = Number(process.argv[4] || 30);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(pathToFileURL(path.join(dir, pageFile)).href + '?export=1');
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
console.log(`wrote ${out} (${frames} frames @ ${fps}fps)`);
