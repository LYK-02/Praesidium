# Praesidium — Project Memory

## 1. Project Overview & Strategy
- **Product:** Praesidium — Autonomous AI Agent defending merchants against PayPal disputes.
- **Target Event:** PayPal AI Hackathon (Deadline: Nov 12, 2026, 12:00pm PT / Nov 13, 1:30am IST).
- **Architecture Philosophy:** "Model proposes, code disposes" — Sandbox-only, deterministic guardrails, structured Zod decisions, HITL (human-in-the-loop) by default.
- **LLM Provider:** **NVIDIA NIM** (`https://integrate.api.nvidia.com/v1`) using model `meta/llama-3.3-70b-instruct` via Vercel AI SDK (`@ai-sdk/openai`).

---

## 2. Phase Roadmap & Current Status

| Phase | Description | Target Window | Status | Exit Gate |
|---|---|---|---|---|
| **Phase 0** | **Setup & Sandbox Validation** | Oct 9–11 | **COMPLETED** | Repo setup, `.gitignore`, `.env.example`, sandbox findings documented, API contracts verified. |
| **Phase 1** | **Foundation (Core Shell & Config)** | Oct 12–16 | **COMPLETED** | Next.js + TS strict + Tailwind + Drizzle + SQLite + Auth gate + Design tokens + Health check. |
| **Phase 2** | **PayPal Integration & Webhooks** | Oct 17–23 | **COMPLETED** | Webhooks, state machine, provide-evidence & accept-claim executors, idempotency, test suite green. |
| **Phase 3** | **Agent & Evidence Providers** | Oct 24–30 | **NEXT** | Evidence providers, reason playbooks, LLM structured analysis (NIM), guardrails, SSE stream. |
| **Phase 4** | **Dashboard & UX** | Oct 31–Nov 4 | Pending | AG Grid dark theme, stat cards, urgency strip, dispute detail 3-column hero, audit view. |
| **Phase 5** | **Hardening & Docs** | Nov 5–7 | Pending | Security checklist, Playwright happy path, README (< 10 min setup), seed-on-boot. |
| **Phase 6** | **Video & Submission** | Nov 8–10 | Pending | Demo video (≤ 3 min), Devpost submission, clean repo check. |

---

## 3. Technology Stack & Key Decisions

- **Framework:** Next.js 16 (App Router) + TypeScript Strict (`noUncheckedIndexedAccess`, `noImplicitOverride`).
- **Database:** SQLite (`better-sqlite3` in WAL mode) + Drizzle ORM (Zero infra, 8 tables auto-bootstrapped).
- **AI Engine:** NVIDIA NIM (`LLM_PROVIDER=nvidia-nim`, base URL `https://integrate.api.nvidia.com/v1`, key `NVIDIA_NIM_API_KEY`, model `meta/llama-3.3-70b-instruct`) using `@ai-sdk/openai` with structured outputs (`generateObject` + Zod).
- **PayPal Client:** Typed REST client targeting `https://api-m.sandbox.paypal.com` with OAuth client credentials in-memory caching and `PayPal-Request-Id` idempotency.
- **UI Design System:** Minimalist Dark per `08-DESIGN.md`:
  - Surfaces: `#0A0A0F`, `#12121A`, `#1A1A24`, glass card `rgba(26,26,36,0.6)`
  - Accent: Amber `#F59E0B`
  - Typography: Space Grotesk (display), Inter (sans), JetBrains Mono (data/IDs/money/logs)
  - Components: Button, Card, Badge (status pills), Input, AppShell.
- **Security & Auth:** Single-admin login gate (`/login`) with `jose` JWT HttpOnly session cookie, security headers (CSP, frame-ancestors deny, strict nosniff), and PII/token redaction on all audit log writes.
- **Workflow & Review:** Conventional Commits (`type(scope): message`) enforced on all commits; CodeRabbit review (`coderabbit review --plain` / `cr review --plain`) + zero secret leaks pre-check mandated before committing.

---

## 4. Phase 0 Audit & Findings Summary

1. **Repository Hygiene:**
   - Git repository initialized: `LYK-02/Praesidium`
   - `.gitignore` created: strictly ignores `.env*`, `node_modules`, `*.db`, `*.log`, build directories.
   - `.env.example` created: documented sandbox keys, NVIDIA NIM credentials, DB URL, auth defaults.
2. **PayPal Sandbox Exploration (`docs/sandbox-findings.md`):**
   - OAuth 2.0 client credentials token flow documented (`POST /v1/oauth2/token`).
   - Core dispute endpoints mapped: `GET /v1/customer/disputes`, `GET /{id}`, `provide-evidence`, `accept-claim`.
   - Webhook signature verification mapped: `POST /v1/notifications/verify-webhook-signature`.
   - Structured evidence prioritized (`PROOF_OF_FULFILLMENT` + `tracking_info` + `notes`).
3. **Open Questions Resolved:**
   - Decided on direct typed REST client over Agent Toolkit to retain full control over headers, multipart formats, idempotency, and audit trails.
4. **Live Verification Status:**
   - PayPal Sandbox OAuth (`POST /v1/oauth2/token`): **VERIFIED LIVE** (Bearer token granted, 32,400s expiry).
   - PayPal Disputes API (`GET /v1/customer/disputes`): **VERIFIED LIVE** against `https://api-m.sandbox.paypal.com`.
   - Security: `SESSION_SECRET` generated with 256-bit cryptographic entropy.

---

## 5. Phase 1 Foundation Summary & Verification

1. **Scaffolding & Config**:
   - Next.js 16 App Router, TypeScript strict, PostCSS, and Tailwind CSS configured with exact color tokens, glowing shadows, and typography tokens from `08-DESIGN.md`.
   - Environment parsing via Zod (`src/server/config/env.ts`) hard-guarding live host unless explicitly enabled.
2. **Database & Schema**:
   - Drizzle ORM schema with 8 core tables: `disputes`, `webhook_events`, `evidence_items`, `decisions`, `actions`, `audit_log`, `jobs`, `settings`.
   - Auto-bootstrap on boot via `src/server/db/client.ts`.
3. **PayPal Client Skeleton**:
   - `src/server/paypal/client.ts` with OAuth token caching, exponential backoff for 429/5xx, idempotency headers, and audit logger integration.
4. **Auth Gate & Middleware**:
   - `/login` with atmospheric glassmorphism and amber CTA.
   - `src/middleware.ts` protecting internal pages and mutating routes.
   - `/api/health` reporting subsystem health (PayPal sandbox connected, LLM NIM configured).
5. **Gate Verification**:
   - `pnpm typecheck` passed (0 errors).
   - `pnpm build` passed (all routes compiled in 3.2s).
   - Health endpoint tested live (`status: healthy`, `paypal: connected`).
   - Login tested live (wrong password -> 401; correct password -> 200 + secure HttpOnly JWT session cookie).
   - Audit logging tested live (persisted to SQLite `audit_log` with PII redaction).

---

## 6. Phase 2 PayPal Integration & Webhooks Summary & Verification

1. **Money & Date Utilities**:
   - `src/lib/money.ts`: Integer minor units (cents) conversion, avoiding floating-point errors, ISO currency formatting.
   - `src/lib/dates.ts`: UTC ISO-8601 timestamps, `hoursRemaining`, `formatRemainingTime`, and deadline urgency flags.
   - `src/lib/errors.ts` & `src/lib/result.ts`: Typed domain errors and `Result<T, E>` pattern.
2. **PayPal Client Expansion**:
   - `provideEvidence`: Structured JSON fulfillment/delivery evidence submission targeting `/v1/customer/disputes/{id}/provide-evidence` with `PayPal-Request-Id` idempotency.
   - `acceptClaim`: Refund and liability settlement targeting `/v1/customer/disputes/{id}/accept-claim` with idempotency.
   - `verifyWebhookSignature`: Verifies incoming webhook signatures against PayPal's verification API.
3. **Dispute Lifecycle State Machine**:
   - `src/server/disputes/state-machine.ts`: Deterministic transitions (`received` → `classified` → `evidence_collecting` → `analysed` → `awaiting_approval` → `submitted` / `accepted` / `needs_human` → `resolved`).
   - Guarded illegal transitions throwing `StateTransitionError`. Emits audit log on each state change.
4. **Dispute Ingestion & Sync Service**:
   - `src/server/disputes/sync.ts`: Synchronizes disputes from sandbox, converts amounts to integer minor units, normalizes stages/reasons, persists redacted payload.
5. **Durable Job Queue**:
   - `src/server/jobs/queue.ts`: Asynchronous in-process queue powered by `p-queue` backed by SQLite `jobs` table with exponential backoff retries and dead-letter handling.
6. **Mutating Action Executors**:
   - `src/server/actions/executor.ts`: `executeProvideEvidence` and `executeAcceptClaim` with replay protection via local `idempotencyKey` checking and database audit logging.
7. **Webhook Endpoint & Simulation**:
   - `POST /api/webhooks/paypal`: Content-Type validation, signature verification, event deduplication by ID, durable insert into `webhook_events`, fast 200 response, background job enqueueing.
   - Simulation tool: `scripts/simulate-webhook.ts` and `scripts/simulate-webhook.mjs`.
8. **Internal API Routes**:
   - `POST /api/sync`: Pulls sandbox disputes on demand.
   - `GET /api/disputes`: Filtered and paginated dispute query.
   - `GET /api/disputes/[id]`: Full dispute details, evidence, decisions, actions, and audit trail.
   - `POST /api/disputes/[id]/approve`: Authorizes and submits evidence to PayPal.
   - `POST /api/disputes/[id]/accept`: Authorizes and refunds/closes claim.
9. **Exit Gate Verification**:
   - `pnpm typecheck` passed (0 errors).
   - `pnpm test` passed (23 unit & integration tests across 5 test suites).
   - `pnpm build` passed (production compilation in ~3.2s).

---

## 7. Next Immediate Action: Phase 3 (Agent & Evidence Providers)
- Build evidence provider interface and mock providers (`tracking`, `delivery_proof`, `order_history`, `chat_log`).
- Reason playbooks per PayPal dispute category.
- LLM structured analysis using NVIDIA NIM (`meta/llama-3.3-70b-instruct`) via `@ai-sdk/openai` + Zod `DecisionSchema`.
- Deterministic guardrails (code rules over prompt).
- Realtime Server-Sent Events (SSE) stream (`GET /api/disputes/[id]/stream`).

