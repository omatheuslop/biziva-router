# Operations

Use Node 24+ and one server process per SQLite database. Keep `data/` on persistent local storage, directory mode0700/database0600. The master key and database backups are sensitive. Rotate/revoke vendor keys at the provider if exposed. Key rotation changes replay fingerprints; reconcile old operations before rotating. Revocation of gateway clients is currently an operator database operation; no public deletion API is exposed.

This release is self-hosted. It does not configure domains, TLS, hosting subscriptions, customer billing, distributed locks or multi-replica failover. Do not launch multiple processes against the same database: startup converts unfinished claims to uncertain. Scale with a reviewed shared state backend before horizontal replication.

`npm run setup` creates `.env` with private permissions without replacing an existing file. `npm start` loads it; environment variables already present take precedence. The Docker image uses injected environment variables instead. Keep the same master key and persistent database across restarts.

`ROUTER_DATA_DIR`, `ROUTER_MASTER_KEY`, `ROUTER_ADMIN_TOKEN`, optional `ROUTER_HOST`, `PORT`, `ROUTER_PUBLIC_ORIGIN`, `ROUTER_CATALOG_FILE` configure the server. Bind defaults127.0.0.1:8787. Remote exposure must be behind HTTPS with a configured exact public origin. Keep the admin token separate from gateway tokens.

Metadata retains30days and reads at most1000events. Exact cache removes expired entries as new entries are written. Operations/resource ownership records deliberately persist: do not prune uncertain claims or reuse idempotency keys casually. For high volume, add a reviewed retention/reconciliation policy before growing the database. There is no universal spend budget: concurrency is capped4HTTP +2realtime sessions/account, but provider spend limits must also be configured in provider accounts.

On an uncertain result, retrieve an already-known provider response/job ID or inspect the provider's records. Never retry a generation merely because a timeout occurred. Realtime disconnects do not reconnect automatically. HTTP timeout is5minutes; large binary/SSE responses stream, request and JSON buffering are bounded. Provider errors and unsupported features are returned to the caller.

No application payload logging or cloud analytics SDK is installed. The operator still controls reverse-proxy/access logs: redact Authorization, x-api-key and all query credentials there. No secret is accepted in an inference query string.

Upgrading from0.1.0: retain `.env`, the master key and database. The0.1.1 fingerprint includes additional forwarded headers; an older operation key may return409conflict instead of replaying. Reconcile old operations with provider records; never delete idempotency history or blindly create a new paid request to work around that conflict.
