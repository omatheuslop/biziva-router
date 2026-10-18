# Changelog

## 0.1.1 — 2026-10-18 (public preview)

- Add a clearer product overview, visual identity, Portuguese guide and first-request walkthrough.
- Add `npm run setup`: generate private local secrets once without overwriting an existing `.env`; load this file on `npm start`.
- Fix empty upstream responses (204/205/304) and their idempotent replays; valid empty deletions no longer become uncertain errors.
- Include every forwarded semantic header in request fingerprints so future Claude features cannot silently reuse an operation with different headers.
- Add regressions for both fixes and setup persistence/secrecy. Synthetic provider coverage; no paid benchmark or universal savings claim.

## 0.1.0 — 2026-10-18 (public preview)

- Initial multimodal BYOK gateway, native developer protocols, encrypted account-scoped storage and four explicit waste-reduction controls.
