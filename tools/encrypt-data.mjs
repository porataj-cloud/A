// Usage: node tools/encrypt-data.mjs <data.json>
// Writes data.enc: the small daily update, encrypted. data.json has the shape
//   {"block": "<text from /*FLO-DATA-START*/ through /*FLO-DATA-END*/>",
//    "snap": {"at": ms, "feeds": {"lsk": {"at": ms, "items": [{"t": ms, "s": "subject", "from": "sender", "ev": 0}]}}}}
// Either field may be left out. The loader applies each part only if it is newer than what app.enc holds.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, seal } from './lib.mjs';

const [src] = process.argv.slice(2);
if (!src) { console.error('usage: node tools/encrypt-data.mjs <data.json>'); process.exit(1); }
const d = JSON.parse(readFileSync(src, 'utf8'));
if (d.block !== undefined) {
  if (typeof d.block !== 'string' || !d.block.startsWith('/*FLO-DATA-START*/') || !d.block.trimEnd().endsWith('/*FLO-DATA-END*/')) { console.error('block must run from /*FLO-DATA-START*/ through /*FLO-DATA-END*/'); process.exit(1); }
  if (!/var FLS="\d\d\.\d\d\.\d{4}, \d\d:\d\d";/.test(d.block) || !/var FD=\[/.test(d.block)) { console.error('block must define FLS and FD'); process.exit(1); }
  try { new Function(d.block + ';return [FLS,FD];')(); } catch (e) { console.error('block is not valid JavaScript:', e.message); process.exit(1); }
}
if (d.snap !== undefined && (typeof d.snap !== 'object' || !d.snap || typeof d.snap.feeds !== 'object')) { console.error('snap must be {"at": ms, "feeds": {...}}'); process.exit(1); }
writeFileSync(join(ROOT, 'data.enc'), await seal(JSON.stringify({ block: d.block, snap: d.snap, built: Date.now() })));
console.log('data.enc written');
