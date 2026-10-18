# Configure and test without editing files

[Português: jornada completa](README.pt-BR.md)

## First access

Run `npm ci`, `npm run setup`, then `npm start` in an interactive terminal. On a new local installation, startup shows a **private first-access link**, valid for ten minutes and one account. Open it on the same computer, choose an account name and create a password, and add your provider API key. No `.env` editing is required. The link is an authorization capability: never share it or publish a terminal capture containing it. The browser removes the fragment from the URL immediately and keeps it in memory only.

The shortcut is only issued by `npm start` (`--onboard`) on an interactive terminal, with a loopback bind, no configured public origin and an empty account database. Redirected/service output and remote/container startup do not issue it. For an administered installation, the administrator creates an account using the existing authenticated administration endpoint/panel and delivers its personal code securely. The shortcut cannot create more accounts after the first one. If it expires before use, restart locally to obtain a new link; never regenerate your master key or delete the database. Return with your name/password. Older administered accounts still accept personal codes. Generate a separate integration token in the dashboard for external applications.

## Routes belong to your account

Open **Seu espaço de trabalho → Rotas aprovadas**. Add the provider, exact model identifier, task and endpoint. Enter prices from your own current provider contract in US dollars, context limits and, for media, the approved unit price and supported parameters/quality values. Mark the approval checkbox only after checking model suitability for that task. Saving/previewing does not call a provider or certify model quality. The project does not silently import a model approval or current price list.

Prices older than30days are excluded from automatic selection and playground pricing. Remove/re-add a route to update its price/approval. Media constraints preserve size, quality, voice and duration; incompatible requests fail. A cheaper route remains within the selected provider, task and native protocol. Gemini native calls, file uploads and Realtime remain available through their existing API endpoints; the graphical route editor/playground supports OpenAI/OpenRouter native JSON, Anthropic Messages and Gemini generateContent. Streaming, tools/state, previous responses and multiple outputs are intentionally excluded from the paid playground quote, while the existing native APIs remain available.

Settings persist in SQLite per account. Revision checks prevent a stale tab from overwriting changes from another tab. A configured account catalog replaces the installation catalog for that account, including when it is intentionally empty. Server file catalogs remain a legacy optional operator facility.

## Three clear profiles

- `fixed`: exact model, no response cache or instruction deduplication applied by the profile.
- `reuse`: exact model, eligible five-minute exact cache and exact adjacent instruction deduplication. Do not choose this for time-sensitive or deliberately fresh responses.
- `economy`: the same controls plus automatic routing when the request uses `model: "biziva-auto"`. Requires explicit model/quality-change consent. Explicit model IDs are still preserved.

Saving a preferred profile selects the default for **new playground tests**; it does not silently change existing client integrations. To select a profile through an SDK, send `X-Biziva-Profile: fixed|reuse|economy`. For automatic routing, also send `X-Biziva-Allow-Model-Switch: 1`, `X-Biziva-Task: your-task`, an explicit output limit and `model: "biziva-auto"`. Keep native developer sessions on explicit models. Profile headers do not execute tool actions or change paid retry rules.

## Simulate first, confirm second

Choose provider, endpoint, model/task, profile, prompt, output limit and a maximum **estimate** in dollars. For media, specify exact native parameters in the form's JSON box. Press **Simular sem gastar**. The server prices an approved compatible route and shows the actual model to be used; no inference occurs. Output is capped at16,384tokens for playground text tests. Quotes need an approved priced route even for an exact model; missing/expired prices fail closed.

The estimate assumes your configured prices and conservative UTF-8 input sizing; bytes are not measured tokens. It is not an enforced provider billing cap, includes no promised upstream discount and may omit provider-specific extras. Configure provider-side spending limits separately. Preview is not a benchmark or measured savings. Review the result, tick the paid-consent box and press **Confirmar e enviar uma vez**. This can incur real charges on your provider account.

A preview is account-bound, expires in five minutes, is kept only in process memory and is consumed before dispatch. Changed keys or settings invalidate it; the reviewed model is pinned for execution, and the configuration revision is rechecked before forwarding. Duplicate confirmations never cause another dispatch. Restart loses pending previews without creating a new inference. An uncertain result requires reconciliation before you intentionally create another test; it never authorizes an automatic paid retry.

JSON results display as text; binary results offer a download. Asynchronous video results may be a job ID; retrieve that owned job through the native API. The dashboard refreshes known cost/cache/call metrics after a completed test. Unknown cost is not zero; a cached native response can contain historical usage.

## Management endpoints

Authenticated, owner-scoped and same-origin checked for browser mutations:

- `GET /router/settings`: routes, revision, preferred playground profile and profile descriptions.
- `PUT /router/settings`: `{revision,profile,routes}`; compare-and-swap,50routesmaximum.
- `POST /router/playground/preview`: `{provider,path,profile,task,body,allowSwitch,maxEstimatedUsd}`; no provider call.
- `POST /router/playground/run`: `{previewId,confirmPaid:true}`; one dispatch/replay contract, native response.

The unauthenticated `GET /router/setup` exposes only availability, never its secret. Creating the **first** account with `POST /router/setup` requires the short-lived private capability as bearer credential; all later accounts require normal administration. It is not a public signup service.
