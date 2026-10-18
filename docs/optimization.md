# Optimization contract

Optimizations are opt-in and modality-aware. Media generation is stochastic and expensive: two equal prompts can intentionally request two different creations. This gateway never turns an intentional new image/video/audio generation into a cached old asset by default. Use idempotency for technical retries. Do not remove reference images, reduce resolution or alter audio/video conditioning silently.

## Qualified routing

Set `ROUTER_CATALOG_FILE` to a JSON array (see `examples/catalog.example.json`). Every candidate needs an explicit task, provider, model, capabilities, current prices and `approved:true`. Token routes require context limits and input/output prices; JSON media routes require usdPerUnit, priceUnit (image/second/character/request), maxInputBytes, supportedParameters and exact constraints for requested size/quality/voice/resolution/duration. Multipart media uses an explicit model and passes through unchanged. The operator must qualify its own models. The empty default catalog safely refuses automatic routing. Candidate ordering estimates an upper input budget from UTF-8 bytes and the requested output cap; it is deliberately not an exact tokenizer or a quality classifier. Same-protocol/provider routes only. Unknown prices/capabilities fail closed.

## Exact cache

Only plain, stateless, non-streaming Chat Completions and embeddings qualify. Five-minute TTL; SHA-256 over account, credential fingerprint, provider, endpoint, query, full request and supported beta/version headers. Output is encrypted with account/purpose AAD. Tool/state/reasoning/metadata requests bypass cache. Cached responses preserve original provider usage as historical usage; the `X-Biziva-Cache: hit` header and metrics indicate there was no new upstream call. Do not count replayed usage as freshly generated tokens. A provider key rotation changes cache identity.

The gateway does not claim semantic equivalence between different prompts. Explicit idempotency keys are distinct operations; an explicit cache option independently authorizes eligible response reuse.

## Context

Adjacent instructions are removed only when opt-in, same role, and every serialized field is identical. No whitespace rewriting, history truncation, summarization or tool-result removal. Stateful and multimodal requests are untouched.

The context-selection endpoint is an explicit lossy operation over **auxiliary documents**. It selects whole documents using lexical overlap, maintains their original order and lists excluded IDs. Documents marked required must fit; otherwise 422. The caller decides whether the result is appropriate before composing a model request. It is not a proven semantic compressor. Never submit required instructions as optional documents.

## Measurement

Measure cost per successful task and quality, not just input length. Provider usage and any provider-reported USD remain distinct from local byte counts and configured price estimates. Failed/uncertain dispatches are counted; their cost may be unknown. Streaming and realtime cost remain incomplete unless supplied by usage events. A gateway cache hit avoids a new provider call, but does not prove savings against a separately measured baseline.
