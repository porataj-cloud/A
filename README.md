# Private dashboard

A private, client-side encrypted page. `app.enc` and `data.enc` are AES-256-GCM ciphertexts whose keys are wrapped with the RSA public key in `tools/public.jwk.json`. The private key is stored only in `index.html`, encrypted with a passphrase that is not in this repository. Without the passphrase the content cannot be read.

- `index.html`: the loader and lock screen.
- `app.enc`: the encrypted page. Rebuild with `node tools/build-app.mjs <page.html> [snapshot.json]`.
- `data.enc`: the encrypted daily update. Rebuild with `node tools/encrypt-data.mjs <data.json>`.

Nothing in this repository is secret. Do not commit plaintext data.
