# Your first request

[Português](README.pt-BR.md) · [Full API reference](api.md)

## 1. Start locally

Install Node.js 24+, clone this repository, then run `npm ci`, `npm run setup` and `npm start` inside it. Open http://127.0.0.1:8787. Setup creates `.env` once; keep it private and back it up with your database. Never replace an existing master key to fix a login error.

## 2. Create your gateway account

Read `ROUTER_ADMIN_TOKEN` in your local `.env`. In **Administration**, enter it and create a short account identifier. Save the generated gateway token securely: it is shown only once. Connect using that gateway token, then choose a provider and save your own API key. Neither token belongs in a GitHub issue or screenshot.

Provider keys and gateway tokens are different: your application uses the gateway token; the gateway uses the encrypted provider key. A provider subscription/API balance and model access are still required. No inference is made when you only register a key.

## 3. Send one explicit-model request

This step **can incur provider charges**. Use a model your OpenAI API account can access. Set `BIZIVA_ROUTER_TOKEN` securely in your client environment and replace the placeholder model:

```sh
curl http://127.0.0.1:8787/v1/chat/completions \
  -H "Authorization: Bearer $BIZIVA_ROUTER_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: first-intentional-operation' \
  -d '{"model":"YOUR_EXACT_CHAT_MODEL","messages":[{"role":"user","content":"Say hello in one sentence."}],"max_tokens":64}'
```

Expect the provider's normal completion response plus `x-biziva-request-id` and `x-biziva-provider` headers. Use `curl -i` to see headers. A repeat of the same operation/key replays an eligible saved JSON response; a different intentional request needs a new key. Timeouts are uncertain: reconcile them instead of blindly resending.

## 4. Enable only the controls you need

- **Repeated, safe plain chat:** add `X-Biziva-Cache: exact`. An identical eligible request with a **different operation key** within five minutes can return `x-biziva-cache: hit` without a new provider call. The cached response retains historical provider usage. The dashboard records cache hits separately. Do not use this for fresh/time-sensitive answers.
- **Exact adjacent instruction repetition:** add `X-Biziva-Deduplicate-Instructions: 1`. It leaves tool/stateful requests untouched.
- **Optional reference documents:** use `/router/context/select`. Required documents are retained or rejected for insufficient budget; optional selection is lossy. It does not automatically modify your SDK history.
- **Cheaper qualified routes:** configure `ROUTER_CATALOG_FILE`, qualify your own compatible models, then explicitly enable switching. The example catalog is a schema example, **not** an approved production catalog or a live price list. An empty catalog refuses automatic routing.

See [the complete optimization contract](optimization.md) and [Codex/Claude configuration](developers.md). Developer tool sessions keep native models and state; they do not use the plain-chat response cache or automatic model switching.

## Common problems

| Result | Action |
| --- | --- |
| `401 unauthorized` | Use your gateway account token in the application; the admin token is only for creating accounts. |
| `409 provider_key_missing` | Save the selected provider's API key in the connected account. |
| `422 no_qualified_route` | Use an explicit model or configure an approved catalog with the required task/capabilities. |
| `409 idempotency_conflict` | The operation key belongs to another body/header/credential combination. Reconcile that operation; do not reuse its key for a new action. |
| `result_uncertain` | Check the original operation/provider result; do not automatically resend a paid generation. |
| Existing database cannot decrypt | Restore its original master key securely. Setup preserves `.env`; recreating secrets will not recover old data. |

Before remote access, follow [operations](operations.md): HTTPS, exact public origin, provider-side spend limits, persistent storage and backups. This preview uses one process per database and has no hosted signup or universal spend cap.
