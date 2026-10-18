# API contract

All API calls except `/healthz` require `Authorization: Bearer GATEWAY_TOKEN` (Anthropic-style `x-api-key` is also accepted). All stored provider credentials belong to the authenticated account. Browser mutations require a matching Origin. No arbitrary upstream URLs, redirects or forwarded client credentials.

| Endpoint | Purpose |
| --- | --- |
| POST /router/admin/clients | Admin-only `{id}`; returns a gateway token once |
| GET /router/providers | List configured provider names, no key values |
| PUT /router/providers/:provider | Save own `{key}` encrypted |
| DELETE /router/providers/:provider | Remove own key and account cache |
| GET /router/metrics | Own last 1000 metadata events, up to 30 days |
| POST /router/context/select | `{query, items:[{id,text,required?}], maxBytes}` |
| POST /v1/chat/completions | OpenAI format; default OpenAI, optional OpenRouter header |
| POST /v1/responses, /v1/responses/compact | Native Responses, including SSE |
| POST /v1/messages, /v1/messages/count_tokens | Native Anthropic |
| POST /v1/images/generations, /edits, /variations | Native OpenAI image endpoints |
| POST /v1/audio/speech, /transcriptions, /translations | JSON/binary or multipart preserved |
| POST /v1/embeddings | Native embeddings |
| POST /v1/videos, /v1/files | Native async video or file upload |
| GET/DELETE /v1/responses/:id, /v1/files/:id, /v1/videos/:id | Only resources created by this gateway account |
| GET /v1/responses/:id/input_items, /v1/files/:id/content, /v1/videos/:id/content | Account-scoped retrieval |
| WS /v1/realtime?model=EXACT_MODEL | Authenticated native OpenAI frame tunnel; no browser query-string token |
| POST /v1beta/models/:model:generateContent or :streamGenerateContent | Gemini native; `?alt=sse` supported |
| POST /v1beta/models/:model:embedContent, :batchEmbedContents, :predictLongRunning | Gemini native embedding/video prediction |
| GET /v1beta/operations/:id | Own Gemini operation |

An allowed endpoint is not proof that the provider/account/model supports it. Provider errors are passed back; no paid fallback is generated.

Example (replace model with an available exact provider ID):

```sh
curl http://127.0.0.1:8787/v1/chat/completions \
 -H "Authorization: Bearer $BIZIVA_ROUTER_TOKEN" \
 -H 'Content-Type: application/json' \
 -H 'Idempotency-Key: operation-001' \
 -d '{"model":"YOUR_EXACT_MODEL","messages":[{"role":"user","content":"Hello"}]}'
```

Media requests use the provider's body and supported model. Multipart file fields are not recompressed or re-encoded. A 32 MiB request/JSON-response buffer limit applies; binary and SSE responses stream. Large file uploads exceeding this limit are refused explicitly; resumable uploads are not implemented.

Request headers: `X-Biziva-Provider`, `X-Biziva-Cache: exact`, `X-Biziva-Deduplicate-Instructions: 1`, `X-Biziva-Allow-Model-Switch: 1`, `X-Biziva-Task`, `Idempotency-Key`. Upstream authentication headers are created by the gateway; user-supplied vendor keys/URLs are never forwarded.

A repeated idempotency key with a different body/credential conflicts. A complete JSON response up to 1 MiB can replay. Streaming/binary completion, interrupted streams and unknown dispatch outcomes do not redispatch. Inspect the provider's request/session/job status when a result is uncertain. Use a **new** key only for an intentional new operation after reconciliation.
