# Contributing

Use Node24+, run `npm ci`, `npm test`, and `npm run check`. Keep changes small and add regressions for behavior/security changes. All tests must use synthetic identities and mocked/local-only provider transports: no paid generations, customer keys or client data.

Preserve native protocol fields and byte-for-byte SSE/media behavior. Never silently switch explicit models, merge intentional generations, retry an ambiguous paid submission, weaken tenant isolation or record credentials. New providers require fixed-origin adapters, capability documentation and native protocol fixtures. New optimization claims require representative quality and cost measurements; byte reductions are not measured token savings.

Open an issue with a redacted minimal reproduction. By submitting a contribution, you agree to license it under Apache-2.0. Report vulnerabilities privately as described in SECURITY.md.
