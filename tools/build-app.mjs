// Usage: node tools/build-app.mjs <path to the dashboard index.html> [snapshot.json]
// Writes app.enc: the whole dashboard page, encrypted. The optional snapshot holds the
// saved live feeds, as {"at": ms, "feeds": {"lsk": {"at": ms, "items": [...]}, ...}}.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, seal } from './lib.mjs';

const [src, snapPath] = process.argv.slice(2);
if (!src) { console.error('usage: node tools/build-app.mjs <index.html> [snapshot.json]'); process.exit(1); }
const html = readFileSync(src, 'utf8');
if (!html.includes('/*FLO-DATA-START*/') || !html.includes('/*FLO-DATA-END*/')) { console.error('data block markers not found'); process.exit(1); }
const snap = snapPath ? JSON.parse(readFileSync(snapPath, 'utf8')) : null;
writeFileSync(join(ROOT, 'app.enc'), await seal(JSON.stringify({ html, snap, built: Date.now() })));
console.log('app.enc written,', html.length, 'characters of page source');
