# Developer tools

## Codex: native Responses

Use an API model your OpenAI account can access, preserving its exact model ID. Example `config.toml`:

```toml
model = "YOUR_EXACT_CODE_MODEL"
model_provider = "biziva_router"

[model_providers.biziva_router]
name = "Biziva Router"
base_url = "http://127.0.0.1:8787/v1"
env_key = "BIZIVA_ROUTER_TOKEN"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false
request_max_retries = 0
stream_max_retries = 0
```

Set `BIZIVA_ROUTER_TOKEN` to your gateway account token. Register your OpenAI API key in the gateway dashboard. This configuration uses HTTP Responses/SSE; native `/v1/realtime` WebSocket tunneling is a separate feature. This gateway does not implement Responses-over-WebSocket.

The gateway preserves request fields, tools, reasoning inclusion and assistant phases. A `previous_response_id` must have been created by the same gateway account. Conversations API is not exposed; use stateless inputs or gateway-owned response chaining. Turn off automatic client retries when a request can be paid; explicit idempotency is required for replay protection.

Official references: [custom providers](https://learn.chatgpt.com/docs/config-file/config-advanced), [Responses](https://developers.openai.com/api/reference/resources/responses/methods/create).

## Claude Code: native Messages

```sh
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
export ANTHROPIC_AUTH_TOKEN="$BIZIVA_ROUTER_TOKEN"
# Avoid conflicting provider credentials in the client environment.
unset ANTHROPIC_API_KEY
claude
```

Register the Anthropic API key in the gateway. Requests to `/v1/messages` and `/v1/messages/count_tokens` use Anthropic format end to end. Beta/version headers, tool blocks, thinking and streamed events are passed through. This is protocol fixture coverage, not a claim that every Claude Code version has been certified. Unsupported endpoints return an explicit error. OpenAI models are not advertised as Claude replacements.

Official references: [gateway connection](https://code.claude.com/docs/en/llm-gateway), [compatibility](https://code.claude.com/docs/en/llm-gateway-protocol).

## Safe developer savings

Keep a stable instruction prefix to benefit from upstream prompt caching where supported. The gateway records cache-read/cache-write usage when the provider reports it; it does not invent discounts. Avoid copying whole repositories into every turn; explicitly select auxiliary files using the context endpoint. Keep instructions, recent turns, tool arguments/results, reasoning items, images and required evidence intact.

Responses/Claude stateful and tool requests do not use the plain-response cache or automatic model switching. Model changes during a developer session can alter behavior and invalidate state. Select a cheaper exact model deliberately or qualify a stateless workflow in your catalog first.
