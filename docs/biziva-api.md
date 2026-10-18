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

A hosted cache hit reports `biziva.optimization.cacheHit:true`, zero newly consumed tokens and zero execution charge in the existing billing receipt. Historical usage may appear as `reusedUsage`; it is not newly consumed. Existing authorization, reservation/ledger controls and approved model margins remain in force. Cache availability does not waive authentication or the existing balance/reservation checks.

For auxiliary documents, `biziva_optimization.context` accepts `{query,items:[{id,text,required?}],maxBytes}`. This is explicit lossy selection over optional documents only. Required documents must fit; system/developer instructions and original turns remain intact. The selected documents are added as untrusted user data. Do not use this with tools/session state or mark critical instructions optional.

The existing automatic route continues to use qualified models. Exact models stay exact; lower prices do not grant quality approval. No image reference/resolution, voice or video quality setting is reduced by this integration. Media technical retries continue to use the existing idempotency/request recovery contracts; intentional new generations remain new.

A failed/uncertain operation is never silently redispatched under the same key, even after its receipt becomes old. Reconcile the original outcome. A new intentional execution requires a new operation identifier. This reduces duplicate spend; it is not a universal token discount or a promise of identical output between different models.
