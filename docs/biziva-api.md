# Using the optimization controls in the hosted Biziva API

The standalone gateway uses your own provider accounts. The hosted Biziva API has its own account, credits, qualified models and billing contract. They are separate products.

On the hosted `/v1/chat/completions` endpoint (also `/api/v1/chat/completions`), use your **Biziva API key** and optionally send:

```json
{
  "model": "biziva-auto",
  "messages": [{"role":"user","content":"Use only the attached product information."}],
  "max_tokens": 256,
  "biziva_optimization": {
    "cache": "exact",
    "deduplicateInstructions": true
  }
}
```

Equivalent headers are `X-Biziva-Cache: exact` and `X-Biziva-Deduplicate-Instructions: 1`. Keep a unique `Idempotency-Key` for each intentional operation and reuse it only for technical replay of that same operation.

Eligible exact cache is private to the account/key/full request/current route, lasts5minutes and stores at most100entries/account,128KiB/entry. Tool/state/multimodal/streaming requests and experimental/economic commercial profiles bypass it. The legacy translated `/v1/messages` endpoint also bypasses this response cache; the standalone gateway exposes native Anthropic for Claude integrations.

A hosted cache hit reports `biziva.optimization.cacheHit:true`, zero newly consumed tokens and zero execution charge in the existing billing receipt. Historical usage may appear as `reusedUsage`; it is not newly consumed. Existing authorization, reservation/ledger controls and published customer prices remain in force. Cache availability does not waive authentication or the existing balance/reservation checks.

For auxiliary documents, `biziva_optimization.context` accepts `{query,items:[{id,text,required?}],maxBytes}`. This is explicit lossy selection over optional documents only. Required documents must fit; system/developer instructions and original turns remain intact. The selected documents are added as untrusted user data. Do not use this with tools/session state or mark critical instructions optional.

The existing automatic route continues to use qualified models. Exact `biziva-model-*` profile IDs stay exact; third-party model names may normalize to an automatic route and do not preserve the original model. Lower prices do not grant quality approval. No image reference/resolution, voice or video quality setting is reduced by this integration. Media technical retries continue to use the existing idempotency/request recovery contracts; intentional new generations remain new.

A failed/uncertain operation is never silently redispatched under the same key, even after its receipt becomes old. Reconcile the original outcome. A new intentional execution requires a new operation identifier. This reduces duplicate spend; it is not a universal token discount or a promise of identical output between different models.

## Connect Biziva in the Router dashboard

Select **Biziva API** in **Minhas chaves**, paste your own Biziva API key and save. The key is encrypted like the other providers; no Biziva shared key is bundled. Create/manage it at https://api.biziva.com.br/console. Saving makes no paid inference.

In **Rotas e economia**, choose **Biziva API**, register the model/task and current prices from your own Biziva account, and approve its quality. Then choose **Biziva API** in chat or the playground. Supported gateway paths are chat completions, embeddings, image generations, speech and video creation/status/content. No arbitrary upstream URL or provider administration is exposed. Do not import OpenRouter prices as Biziva prices; your Biziva contract, balance and model access apply. Preview remains a local estimate, not the final Biziva charge.

For SDK calls send `X-Biziva-Provider: biziva`. Optimization cache/dedup headers are forwarded to Biziva when explicitly selected. A unique upstream idempotency key is generated per dispatch; Router account isolation and no uncertain automatic retries remain in force.

## Video with a Biziva key

The hosted Biziva API already generates video. Router 0.4.1 enables that existing capability for the Biziva provider; 0.3.1 omitted it from the adapter.

Create with `POST /v1/videos`, `X-Biziva-Provider: biziva`, your Router bearer token and a unique `Idempotency-Key`. Example body:

```json
{"model":"biziva-video","prompt":"An orange ball bounces on a blue studio floor, with audible impacts.","seconds":5,"resolution":"720p","audio":true}
```

A 202 response accepts the job; it does not mean the file is ready. Keep its `id`. Use authenticated `GET /v1/videos/ID` with the same provider header until `status` is `succeeded`, then `GET /v1/videos/ID/content` to download. The Router uses its own fixed paths and checks resource ownership; it does not follow returned status/content URLs. GET only reads or reconciles the original job, never submits a new generation. DELETE and unrelated Biziva endpoints remain disabled.

In the dashboard, approve a Biziva video route using the model and current price from your own account. Select Video, enter the parameters above, preview and explicitly confirm paid creation. Use **Consultar andamento** and **Baixar vídeo** afterward. No background creation/retry occurs; a new intentional generation requires a new preview. After reloading, saved job ownership remains in the local database and the same ID can be queried through the API.

Original contract: 5 seconds, 720p and required audio. Availability, tariffs and file retention depend on the current Biziva contract. This Router update was tested with synthetic providers, without spending customer credits.

## Public prices, comparisons and integration

Hosted Biziva API information is available without login:

- [Current public prices](https://api.biziva.com.br/precos) and [machine-readable pricing](https://api.biziva.com.br/public/pricing.json): BRL, units, validity and contract limits. Automatic multi-step routes have variable costs; a media reservation estimate is not a fixed final price.
- [Customer price estimates](https://api.biziva.com.br/comparativos): compare Biziva profiles for the same token budget using customer selling prices. Estimates are not executed generations or a guarantee of equivalent quality.
- [Operational transparency](https://api.biziva.com.br/transparencia): scoped qualification and privacy-protected observations. HTTP acceptance does not prove final delivery, and an unavailable measurement is not 100% uptime.
- [Python, JavaScript and cURL migration guide](https://api.biziva.com.br/integrar) with idempotency and no uncertain automatic retries. Production examples incur charges only when the developer executes them; opening these pages starts no generation.

Compare the same task, contractual units and the final customer charge, including applicable taxes and payment conditions. We do not claim to be universally cheaper than OpenAI or OpenRouter, or endorsed by ChatGPT. This repository is maintained by Biziva and is not an independent review.


