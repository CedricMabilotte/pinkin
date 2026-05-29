# Security Policy

Thanks for taking the time to look. Pinkin is built so you don't have to
trust me — but if you find a hole, I want to know.

## Reporting a vulnerability

Email **cedric.mabilotte@gmail.com** with `[pinkin-security]` in the
subject line. Plain text is fine. If you want encryption, my PGP key is
on [keys.openpgp.org](https://keys.openpgp.org/) under that address.

I'll acknowledge within **48 hours** and try to ship a fix within
**7 days** for anything that puts user data at risk.

## What I consider in-scope

- Anything that leaks Google data outside the user's browser without consent.
- Anything that bypasses the OAuth redirect URI verification or token storage.
- Anything that lets an attacker control the page in ways that break the
  CSP guarantees of `pwa/index.html`.
- Anything that lets the encrypted refresh token leak in plaintext.
- Anything that defeats the Limited Use commitments described in
  `JUSTIFICATION_OAUTH.md`.

## What I consider out-of-scope

- The `client_secret` being readable in the distributed binary or via
  `/api/oauth-config`. This is by design — see `JUSTIFICATION_OAUTH.md`.
- Anything that requires physical access to the user's device.
- Issues in third-party services (Google People API, OpenStreetMap
  Nominatim, OSM tiles) — report those upstream.

## Recognition

Pinkin has no money to pay bounties. What I offer instead:

- **A line in `CHANGELOG.md`** under your handle (or anonymous if you
  prefer) for any reported issue, valid or not, that helped me think.
- **A coffee in France** if you ever pass through and want to meet. I'll
  buy. Reach out at the email above.

That's it. Thanks for caring about user data.
