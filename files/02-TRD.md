# Praesidium — Technical Requirements Document (TRD)

> PayPal endpoint names below are from public docs/AI research. **Verify each against developer.paypal.com on Day 1** and record results in `docs/sandbox-findings.md`.

## 1. Architecture
```
 PayPal Sandbox ──webhook──▶ /api/webhooks/paypal ─▶ verify ─▶ event store ─▶ job queue
        ▲                                                              │
        │ REST (OAuth2)                                                ▼
   PayPal client  ◀── tool calls ──  Agent Orchestrator  ──▶ Evidence Providers (mock/real)
        ▲                                   │
        │                                   ▼
   Action executor  ◀── decision ──  LLM (structured output, Zod)
        │                                   │
        ▼                                   ▼
     SQLite/Drizzle  ◀──────────── audit log ──────▶ SSE stream ─▶ Next.js UI (AG Grid)
```

## 2. Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript strict | Matches skill set; one deploy |
| UI | Tailwind + AG Grid React (Quartz theme via Theming API) + lucide-react | AG Grid prize; fast styling |
| DB | SQLite (better-sqlite3) + Drizzle ORM | Zero-setup for judges; swap to Postgres via env |
| Validation | Zod everywhere (env, API, LLM output, webhooks) | Single source of truth |
| AI | Vercel AI SDK, provider-agnostic; structured output + tool calling | Swap models via env |
| PayPal | Thin typed REST client + PayPal Agent Toolkit/MCP where tools exist | Control + hackathon alignment |
| Realtime | Server-Sent Events | Simple, no extra infra |
| Jobs | In-process queue (`p-queue`) with DB-backed job table | Durable enough, no Redis |
| Tests | Vitest, Playwright (1 happy path), MSW for PayPal mocks | |
| Tooling | pnpm, ESLint, Prettier, Husky + lint-staged, GitHub Actions | |
| Hosting | Render (web service + disk) or Vercel + Turso | Render also qualifies for sponsor prize |

## 3. Repository layout
```
/src
  /app                 # routes, API handlers (thin)
    /(dashboard)/...   # pages
    /api/webhooks/paypal/route.ts
    /api/disputes/[id]/{approve,accept,stream}/route.ts
  /server
    /paypal            # client.ts, auth.ts, disputes.ts, webhooks.ts, types.ts
    /agent             # orchestrator.ts, tools.ts, prompts/, schemas.ts, scoring.ts
    /evidence          # provider.ts (interface), mock/, paypal-transaction.ts
    /jobs              # queue.ts, handlers/
    /db                # schema.ts, client.ts, migrations/
    /audit             # logger.ts, redact.ts
    /config            # env.ts (Zod-parsed)
  /components          # ui/, grid/, dispute/, charts/
  /lib                 # money.ts, dates.ts, errors.ts, result.ts
/scripts               # seed-sandbox.ts, simulate-webhook.ts
/docs                  # these files + sandbox-findings.md
/tests
```

## 4. Data model (core)
| Table | Key fields |
|---|---|
| `disputes` | id (PayPal dispute_id), reason, stage, status, amount_minor, currency, buyer_ref, transaction_id, due_at, created_at, updated_at, paypal_raw (JSON, redacted) |
| `webhook_events` | id (PayPal event id, **unique**), type, payload, received_at, processed_at, status |
| `evidence_items` | id, dispute_id, kind, source, summary, payload, collected_at |
| `decisions` | id, dispute_id, action, win_probability, confidence, rationale, citations (JSON), model, prompt_version, created_at |
| `actions` | id, dispute_id, type, status, approved_by, idempotency_key (**unique**), request, response, created_at |
| `audit_log` | id, dispute_id?, actor (agent/user/system), event, detail (JSON, redacted), ts |
| `jobs` | id, type, payload, status, attempts, run_at, last_error |
| `settings` | key, value (auto-accept threshold, min confidence, mode) |

Money is stored as **integer minor units** + currency. Timestamps are UTC ISO-8601.

## 5. PayPal integration
- **Base URL:** `https://api-m.sandbox.paypal.com` (hard-guarded; reject `api-m.paypal.com` unless `ALLOW_LIVE=true`).
- **Auth:** OAuth2 client-credentials (`POST /v1/oauth2/token`); cache token in memory until ~60s before expiry; single-flight refresh.
- **Disputes (verify):** `GET /v1/customer/disputes`, `GET /v1/customer/disputes/{id}`, `POST .../provide-evidence` (multipart), `POST .../accept-claim`, `POST .../send-message`, `POST .../make-offer`.
- **Webhooks:** subscribe `CUSTOMER.DISPUTE.CREATED`, `.UPDATED`, `.RESOLVED`; verify via `POST /v1/notifications/verify-webhook-signature`; dedupe by event id.
- **Optional:** shipment tracking, refund (`/v2/payments/captures/{id}/refund`), transaction lookup for evidence.
- **Client rules:** typed responses (Zod parse), retry with jittered backoff on 429/5xx only, `PayPal-Request-Id` idempotency header on mutating calls, per-call audit entry.

## 6. Agent design
**Pipeline (state machine, persisted per dispute):** `received → classified → evidence_collecting → analysed → awaiting_approval → submitted | accepted | needs_human → resolved`.

1. **Classify (deterministic first):** map PayPal `reason` + stage to a playbook; LLM only for ambiguous text.
2. **Collect:** run evidence providers in parallel with timeouts; each returns `EvidenceItem[]` or a typed failure.
3. **Analyse:** LLM gets *only* structured evidence + the playbook; outputs a Zod-validated `Decision`.
4. **Guardrails (code, not prompt):** override to `needs_human` if confidence < threshold, evidence missing for the playbook's required items, amount > auto limit, or deadline < N hours with gaps.
5. **Act:** executor performs the PayPal call after approval (or auto-mode rule), with idempotency key.
6. **Narrate:** every step emits an SSE event + audit entry.

```ts
Decision = {
  action: 'contest' | 'accept' | 'needs_human',
  winProbability: number,           // 0..1
  confidence: number,               // 0..1
  rationale: string,                // short, user-facing
  citations: { evidenceId: string; supports: boolean; note: string }[],
  missingEvidence: string[],
}
```
**Prompting:** versioned prompt files, temperature ≤ 0.2, buyer text wrapped as untrusted data, no tool access for the analysis step. Win probability is a model estimate blended with a rule-based score (document it honestly as an estimate).

## 7. API surface (internal)
| Route | Purpose |
|---|---|
| `POST /api/webhooks/paypal` | Verify, store, enqueue |
| `GET /api/disputes` | Grid data (server-side filter/sort) |
| `GET /api/disputes/:id` | Detail + evidence + decisions |
| `GET /api/disputes/:id/stream` | SSE agent events |
| `POST /api/disputes/:id/approve` | Submit evidence (idempotent) |
| `POST /api/disputes/:id/accept` | Accept claim |
| `POST /api/sync` | Pull disputes from PayPal |
| `GET/PUT /api/settings` | Auto-mode rules |
| `GET /api/health` | Liveness + PayPal reachability |

## 8. Error handling and resilience
- Typed errors (`PayPalError`, `ValidationError`, `ProviderTimeout`); `Result<T,E>` at module boundaries.
- Webhook handler returns 2xx fast after durable write; processing is async and retryable.
- Job retries: 3 attempts, exponential backoff, dead-letter status visible in UI.
- Graceful degradation: if an evidence provider fails, continue and record `missingEvidence`.

## 9. Observability
Structured JSON logs (pino) with correlation id = dispute id; `/api/health`; audit log is the primary product-visible trace.

## 10. Configuration
`.env.example`: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox`, `PAYPAL_WEBHOOK_ID`, `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `DATABASE_URL`, `PUBLIC_BASE_URL`, `ALLOW_LIVE=false`. All parsed in `config/env.ts`; app fails fast on invalid config.

## 11. Testing strategy
- Unit: money, dates, scoring, guardrails, schema parsing.
- Integration: PayPal client against MSW fixtures; webhook idempotency; state machine transitions.
- Contract: record real sandbox responses once; replay in tests.
- E2E (Playwright): seeded dispute → decision → approve → status updated.
- LLM: golden-file evals on 10 fixtures; assert schema + decision class, not exact text.

## 12. Deployment
Docker multi-stage image; `docker compose up` for local; Render blueprint (`render.yaml`); migrations run on boot; webhook URL documented in README.

## 13. Open questions (resolve in Phase 0)
1. Which dispute endpoints work for sandbox business accounts?
2. Can evidence files upload, or only structured evidence?
3. Does the Agent Toolkit expose all needed dispute tools, or do we call REST directly?
