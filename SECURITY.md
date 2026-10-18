# Security

Do not post keys, prompts, customer records or unredacted logs in public issues. For a security concern, contact Biziva through its official support channel at https://biziva.com.br, describe the issue without secrets, and request a private reporting channel.

Threat boundaries: authenticated gateway account → its encrypted provider keys/cache/resources; fixed HTTPS provider origins; no arbitrary upstream host/redirect; JSON/request size caps; no automatic paid retry; exact origin checks for browser mutations; local-only bind by default. AES-GCM uses fresh96-bit nonces and account/purpose AAD. Tokens have256random bits and only their hashes are stored.

The operator can decrypt data with the master key. This is not end-to-end encryption against the operator. SQLite state is single-process; provider feature access/terms remain separate. Synthetic test coverage is not a third-party security audit or provider certification. File uploads/media and optional documents are data, not executable instructions. Do not add OAuth/subscription-token sharing without a separate security and terms review.
