// Shared helpers for the encrypted bundle. No secrets live in this repository:
// content is encrypted to the public key in tools/public.jwk.json and can only be
// opened in the browser with the passphrase that protects the private key.
import { webcrypto as crypto } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const b64 = (buf) => Buffer.from(buf).toString('base64');

export async function publicKey() {
  const jwk = JSON.parse(readFileSync(join(ROOT, 'tools', 'public.jwk.json'), 'utf8'));
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
}

// gzip, then AES-256-GCM with a fresh key, which is wrapped with RSA-OAEP.
export async function seal(text) {
  const pub = await publicKey();
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, gzipSync(Buffer.from(text, 'utf8'), { level: 9 }));
  const wk = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, raw);
  return JSON.stringify({ v: 1, gz: 1, wk: b64(wk), iv: b64(iv), ct: b64(ct) });
}
