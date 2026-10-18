# Biziva Router ↗

**Your keys. Native protocols. Less waste.**

A self-hosted, multimodal BYOK gateway by [Biziva](https://biziva.com.br). Connect your own provider accounts, keep developer tools on their native protocols, and make cost controls explicit.

**Release status: 0.1.0 — public preview.** Protocols and failure handling are exercised with synthetic providers. This is not a claim of provider certification, universal savings, identical model quality, or production validation of every model.

## What ships

- OpenAI native Chat Completions and **Responses**, including streaming, function calls, reasoning fields and assistant `phase` preservation for **Codex** integrations.
- Anthropic native **Messages**, token counting, thinking, tools, beta headers and SSE for **Claude Code** integrations.
- Images (generation/edits/variations), speech, transcription/translation, embeddings, asynchronous video submission/status/content, file upload/retrieval and native OpenAI realtime WebSocket tunneling.
- Gemini native generate/stream/embedding and long-running prediction endpoints; operation retrieval is scoped to the creating gateway account. Availability depends on the provider model/API.
- OpenRouter native OpenAI-format endpoints; a gateway route does not make an unsupported upstream feature available.
- Web dashboard for encrypted BYOK credentials, account creation and request/cache/uncertainty metrics.
- Explicit qualified routing, exact response cache, conservative context controls and durable idempotency.
- **No runtime npm dependencies.** Node.js 24 or later, built-in SQLite and AES-256-GCM.

## Run locally

```sh
git clone https://github.com/omatheuslop/biziva-router.git
cd biziva-router
npm ci
# Generate independent secrets on your own machine; keep them out of Git/logs.
export ROUTER_MASTER_KEY="$(openssl rand -hex 32)"
export ROUTER_ADMIN_TOKEN="$(openssl rand -hex 32)"
npm start
```

Open `http://127.0.0.1:8787`. In **Administration**, enter the admin token and create an account. Copy its gateway token once, connect the account, then register your provider keys. Credentials are never read back through the API. The browser keeps the gateway token only in memory; the database encrypts provider keys and saved responses. Keep the master key in a secret manager and back it up securely; losing it makes encrypted data unrecoverable.

The server binds to loopback by default. For remote access, use HTTPS at a reverse proxy, set `ROUTER_PUBLIC_ORIGIN=https://your-host`, and configure `ROUTER_HOST` explicitly. See [operations](docs/operations.md). No hosted signup, billing or provider credits are bundled.

## Use your existing SDK

Point the SDK at `http://127.0.0.1:8787/v1`, replace its API key with your **gateway token**, and request the exact model available to your own provider account. OpenAI is the default; send `X-Biziva-Provider: openrouter` to use OpenRouter. `/v1/messages` selects Anthropic; `/v1beta/...` selects Gemini. Provider credentials stay on the server.

[Codex and Claude Code configuration](docs/developers.md) · [HTTP and media examples](docs/api.md) · [optimization contract](docs/optimization.md)

## Four controls, no hidden shortcuts

1. **Cheaper qualified model:** `model: "biziva-auto"`, `X-Biziva-Allow-Model-Switch: 1`, a task label and an output budget select from your configured approved catalog. No model is approved merely because it is cheaper. Explicit models are preserved. Stateful/tool developer sessions use explicit models.
2. **Exact response cache:** `X-Biziva-Cache: exact` enables a five-minute account/credential/request-scoped cache for eligible non-streaming plain chat and embeddings. No semantic cache, no media-generation reuse, no tool-action reuse. New generations remain new by default.
3. **Context:** opt-in removal of exact adjacent instruction duplicates; `/router/context/select` ranks documents that you explicitly identify as optional. Required documents are retained or the request is refused. Conversation/tool history is not silently truncated or summarized.
4. **Duplicate prevention:** `Idempotency-Key` claims the operation durably before dispatch. Ambiguous outcomes are never retried automatically, including after process restart. Streaming/binary output is not retained for replay: a repeated key is refused after completion rather than generating again.

The metrics distinguish known provider cost, unknown cost, cache hits and actual calls. UTF-8 byte reductions are **not** reported as measured token reductions. Lower token count and lower dollar cost are different things. No savings percentage is promised.

## Privacy and scope

The operator controls the installation and can access its secrets. Prompts/outputs must reach the selected provider. Exact cache and JSON idempotency replay store encrypted output locally; metadata includes provider/model/path, usage and timing, never full prompts or provider keys. Metadata retains up to 30 days; idempotency/resource tombstones are retained to prevent unsafe reuse. See [security](SECURITY.md).

This project contains a new standalone gateway and conservative policy helpers. **It does not contain Biziva production source, client data, provider keys, internal prompts or billing rules.** The internal Biziva deployment has separate authentication, qualified model registry, accounting and media validation.

## Verify and contribute

```sh
npm test
npm run check
```

Tests use synthetic credentials, isolated SQLite, mock providers and local-only transports. They never generate billable content. Report a bug with a minimal **redacted** reproduction; never include API keys or private conversations. See [CONTRIBUTING](CONTRIBUTING.md).

Apache-2.0. Provider terms and model access remain your responsibility; a ChatGPT or Claude subscription is not automatically an API credential.
