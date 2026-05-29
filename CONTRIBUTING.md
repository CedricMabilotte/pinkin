# Contributing to Pinkin

Pinkin is a single-author project right now. Pull requests, issues,
and feedback are all welcome, but please read this first to save us
both time.

## Before you open an issue

- **Bug?** Include: your OS, browser/Chrome version, extension version
  (from `chrome://extensions`), the exact step that fails, and what you
  expected. A console screenshot (F12) helps.
- **Feature request?** Pinkin is single-purpose by design: contacts on a
  map, no analytics, no virality. Features that compromise that posture
  will be politely declined. Features that strengthen it are welcome.
- **Security issue?** Don't open a public issue. See
  [`SECURITY.md`](SECURITY.md).

## Before you open a pull request

1. **Open an issue first** if the change is more than a typo or a
   one-line fix. Saves you from doing work I won't merge.
2. **Tests must pass**: `npm test` (vitest, ~120 unit/DOM tests),
   `npm run test:e2e` (Playwright, PWA in headless Chromium).
3. **No new dependencies** without discussion. Pinkin is intentionally
   lean — Leaflet is the only runtime dep and it's bundled local.
4. **No analytics, no telemetry, no third-party calls beyond Google,
   Nominatim, and OSM tiles.** Period.

## Setting up local dev

```bash
git clone https://github.com/CedricMabilotte/pinkin.git
cd pinkin
npm install
npm run install-leaflet                    # bundles Leaflet into lib/

# OAuth secrets
cp extension/background/secrets.example.js extension/background/secrets.js
# Edit secrets.js with your own Google Cloud OAuth client values

# Run the PWA dev server
npm run dev:pwa

# Run tests
npm test
npm run test:e2e
```

You need your own Google Cloud OAuth 2.0 Client ID + secret for the
extension client. The PWA in production uses Cloudflare env vars; in
local dev, the PWA needs its own mechanism — see
[`HANDOFF_S9-ter.md`](HANDOFF_S9-ter.md) §"Décisions en attente" for the
state of that work.

## Code style

- ES modules everywhere. No bundler in source — what you see is what runs.
- Comments in French or English, your call. Prefer explaining *why* over
  *what*.
- No prettier or eslint enforcement right now. Look at existing code,
  match the style.

## License

Pinkin is licensed under **AGPL-3.0** (see [`LICENSE`](LICENSE)). By
contributing, you agree your code will be released under the same
license. If you fork Pinkin and serve it as a web service, you must
publish your modified source code — that's the AGPL clause that makes
it stronger than GPL for browser-based apps.
