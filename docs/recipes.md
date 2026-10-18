# Three practical recipes / Três exemplos práticos

[Start here](start-here.md) · [Developer integrations](developers.md) · [API reference](api.md)

These examples describe supported controls, not measured savings or model-quality claims. Use fictional inputs first. Provider calls can incur charges.

## 1. Summarize with a model you already trust

Add your provider key in the dashboard. Approve a route for the summary task using an exact model available to your account and current contract prices. Keep the fixed-model profile. Ask for a three-bullet summary of a short public text, preview, then explicitly confirm once. Check the response and the usage page. This establishes a useful baseline before changing models.

## 2. Avoid an eligible repeated call

Use non-streaming, plain chat with the same account, key, model and request body. Opt in with `X-Biziva-Cache: exact`. Repeat within five minutes using a **new** operation key only when you intentionally request the same safe, non-time-sensitive answer. A cache hit returns `x-biziva-cache: hit` without another upstream call. Historical usage in the response is not a second bill. Changing the prompt, credential or relevant parameters can miss the cache. Media, tools and stateful sessions are not eligible for this plain-chat cache.

Ten identical eligible requests can mean one provider call plus nine cache hits within the cache window. This is a conditional illustration, not a benchmark or a promise of 90% savings on your workload. Compare actual calls and known charges in your own provider records.

## 3. Compare a lower-cost route without assuming equal quality

Use the same small set of fictional tasks for your current model and a candidate. Record the provider/model, date, input/output usage, known charge, whether the answer met your requirements and any paid retries. Compare **total cost of acceptable results**, not just price per token. Keep the fixed model until the candidate meets your requirements. Only then approve that route for that task and explicitly authorize economy routing. There is no universal quality threshold or automatic certification.

For Codex/Claude tool sessions, use the [native integration guide](developers.md). Preserve explicit models and state; do not apply the plain-chat recipe blindly.

## Portuguese prompts to try

- Resumo: “Resuma o texto em três tópicos e preserve todos os horários informados.”
- Escrita: “Reescreva este anúncio em até 80 palavras, sem inventar benefícios.”
- Planejamento: “Transforme estas cinco tarefas em uma lista ordenada, sem executar ações.”

Assistants generate responses. They do not execute code, browse websites or send messages on your behalf.
