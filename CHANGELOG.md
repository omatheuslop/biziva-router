# Changelog

## 0.4.0 — 2026-10-18 (public preview)

- Fix playground dispatch using the wrong default provider; pin selected provider and validate credentials again before submission.
- Lock local startup before opening SQLite, reopen only a verified live instance, and add authenticated graceful quit with active-request protection.
- Provider-compatible UI, simple media fields, editable routes and price-expiry warnings.
- Authenticated Biziva model/price checks with explicit BRL/USD budgets and no currency conversion or automatic approval.
- Password rotation, single-use local recovery codes, encrypted account backups with merge-safe restoration, opt-in encrypted conversations and read-only request reconciliation.
- Harden provider/profile lookup, session-switch UI isolation and restore boundaries.

## 0.3.1 — 2026-10-18 (public preview)

- Add Biziva API to encrypted key management, chat, route editor and playground.
- Fixed Biziva HTTPS origin and explicit endpoint allowlist; own-key authentication, optimization headers and unique upstream idempotency.
- Document account-specific prices and balance; no bundled shared credentials.

## 0.3.0 — 2026-10-18 (public preview)

- Biziva dashboard with chat, encrypted key management, approved routes, assistants, usage and integration sections.
- Local name/password setup, scrypt hashes, expiring sessions and separate revocable integration tokens.
- Six explicit task assistants and native Gemini JSON playground; no autonomous external actions.
- Public OpenRouter catalog import without credentials or automatic quality approval.
- Bundled desktop executable, macOS app/DMG, Windows installer definition and Linux archive workflow. Packages are not publisher-signed/notarized.
- Synthetic regression tests and isolated desktop startup verification; no paid model benchmark.

## 0.2.0 — 2026-10-18 (public preview)

- Interactive local first-account link: ten-minute, single-use capability; no configuration-file editing for a fresh local start.
- Per-account route/price editor with explicit quality approval, 30-day price freshness and revision-conflict protection.
- Fixed, safe reuse and consented economy profiles; existing native clients remain opt-in.
- Playground with free route/cost preview, explicit paid confirmation, pinned reviewed model, key/revision revalidation and one dispatch per preview.
- Native JSON text/embeddings, image, voice and video test forms; existing Gemini, streaming/tools, uploads and Realtime APIs retained.
- Regression and UI verification with isolated synthetic providers; no paid benchmark or universal savings claim.

## 0.1.2 — 2026-10-18 (public preview)

- Guide first-time users through finding the installation code, creating access, saving their personal code and adding a provider key in plain Portuguese.
- Connect newly created accounts automatically; allow hiding the displayed personal code and explain how to sign in on later visits.
- Explain the difference between installation code, personal code and provider API key; preserve existing authentication and account isolation.

## 0.1.1 — 2026-10-18 (public preview)

- Add a clearer product overview, visual identity, Portuguese guide and first-request walkthrough.
- Add `npm run setup`: generate private local secrets once without overwriting an existing `.env`; load this file on `npm start`.
- Fix empty upstream responses (204/205/304) and their idempotent replays; valid empty deletions no longer become uncertain errors.
- Include every forwarded semantic header in request fingerprints so future Claude features cannot silently reuse an operation with different headers.
- Add regressions for both fixes and setup persistence/secrecy. Synthetic provider coverage; no paid benchmark or universal savings claim.

## 0.1.0 — 2026-10-18 (public preview)

- Initial multimodal BYOK gateway, native developer protocols, encrypted account-scoped storage and four explicit waste-reduction controls.
