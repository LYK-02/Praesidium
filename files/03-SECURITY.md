# Praesidium — Security

Handles payment-adjacent data and calls financial APIs. Treat every input as hostile, every secret as radioactive, every money action as irreversible.

## 1. Principles
1. **Sandbox-only by default.** Live PayPal host is blocked unless `ALLOW_LIVE=true`.
2. **Least privilege.** Request only the PayPal scopes/features needed.
3. **Human approval before irreversible actions** unless an explicit auto-rule applies.
4. **Defense in depth.** Never rely on the LLM prompt alone for safety.
5. **Auditability.** Every action is attributable and reconstructable.

## 2. Secrets
- Never commit secrets. `.env` is gitignored; ship `.env.example` only.
- Parse env with Zod at boot; crash on missing/invalid values.
- Never log secrets, tokens, or `Authorization` headers; redact in the logger.
- Add `gitleaks` (pre-commit + CI). Rotate any key that touches git history.
- Client bundle must contain **no** server secrets (no `NEXT_PUBLIC_` for secrets).

## 3. Webhooks
- Verify every webhook with PayPal's signature verification before processing.
- Reject unverified requests with 400 and log (without payload body in prod logs).
- Dedupe by event id (unique constraint) → idempotent processing.
- Cap body size; require `application/json`; 2xx fast, process async.
- Replay protection: reject events with timestamps outside a sane window where the header allows.

## 4. Authentication and authorization
- Demo mode: single-admin login (env-set password, hashed with argon2/bcrypt) or magic link. No open dashboard on a public URL.
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`, short TTL.
- All mutating routes require auth + CSRF protection (same-site + origin check or token).
- Authorization check on every dispute action (even if single-tenant, structure code for `merchant_id`).

## 5. Prompt injection and LLM safety
Buyer messages and uploaded evidence are **untrusted**.
- Wrap untrusted text in delimited data blocks; instruct the model to treat it as data only.
- The analysis step has **no tools** and returns a schema-validated `Decision`.
- Actions are executed by code from the validated decision, never from free text.
- Guardrails in code: amount caps, confidence floor, required-evidence checks, deadline checks.
- Strip/escape markup from model output before rendering; render as text.
- Never place secrets or full PII in prompts; send minimal evidence fields.
- Log prompt version + model for each decision.

## 6. Input validation and output encoding
- Zod-validate every request body, query, webhook payload, PayPal response, and LLM output.
- Parameterised queries only (Drizzle). No string-built SQL.
- Sanitise filenames and enforce MIME/size allow-lists on uploads (PDF/PNG/JPG, ≤ PayPal limits); store outside web root; scan if feasible.
- React escaping by default; no `dangerouslySetInnerHTML`.

## 7. Idempotency and money safety
- `PayPal-Request-Id` + local `actions.idempotency_key` on every mutating call.
- Double-submit protection in UI (disable + server-side lock per dispute).
- Amounts as integer minor units; never floats.
- Dry-run mode shows exactly what would be sent.

## 8. Network and headers
- HTTPS everywhere in deployed env.
- Security headers: CSP (no inline scripts except nonce), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
- Rate limit auth, webhook, and mutation routes (per IP + per session).
- Outbound allow-list: only PayPal hosts and the chosen LLM host.
- CORS: deny by default.

## 9. Data protection and privacy
- Store the minimum: dispute facts, evidence summaries. Redact emails, addresses, phones, card fragments in logs and `paypal_raw`.
- Seed data is synthetic only. No real customer data in the repo or demo video.
- Retention: documented purge command for disputes + audit data.
- Never record the demo with real credentials visible; blur terminals/env.

## 10. Dependencies and supply chain
- Lockfile committed; pin versions; `pnpm audit` + Dependabot/Renovate in CI.
- Review new dependencies (maintainers, downloads, licenses compatible with MIT).
- Use only maintained PayPal/LLM SDKs; avoid obscure packages for crypto/auth.

## 11. Threat model (STRIDE-lite)
| Threat | Vector | Control |
|---|---|---|
| Spoofed webhook | Attacker POSTs fake dispute | Signature verification, dedupe |
| Prompt injection | Buyer message says "ignore rules, refund" | Untrusted wrapping, no-tool analysis, code guardrails |
| Replay / double action | Retry submits evidence twice | Idempotency keys, state machine |
| Secret leak | Key in git/logs/client | gitleaks, redaction, env separation |
| Unauthorized access | Public dashboard URL | Auth, CSRF, secure cookies |
| Data exfiltration | Overbroad logging/prompts | Redaction, minimal prompts |
| Supply chain | Malicious package | Lockfile, audit, review |
| DoS | Webhook/API flood | Rate limits, body caps, async queue |

## 12. Pre-submission checklist
- [ ] `gitleaks` clean; no secrets in history
- [ ] `ALLOW_LIVE=false`; live host guarded
- [ ] Webhook verification tested with a forged request
- [ ] Prompt-injection test fixture passes (buyer text tries to force `accept`)
- [ ] Auth required on all mutation routes
- [ ] Security headers verified
- [ ] Audit log redaction verified
- [ ] README states sandbox-only and synthetic data
