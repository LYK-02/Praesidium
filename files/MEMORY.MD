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
| **Phase 2** | **PayPal Integration & Webhooks** | Oct 17–23 | **NEXT** | Webhooks, state machine, provide-evidence & accept-claim executors, idempotency. |
| **Phase 3** | **Agent & Evidence Providers** | Oct 24–30 | Pending | Evidence providers, reason playbooks, LLM structured analysis (NIM), guardrails, SSE stream. |
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

## 6. Next Immediate Action: Phase 2 (PayPal Integration & Webhooks)
- Ingest and sync disputes from PayPal Sandbox into SQLite `disputes` table.
- Build webhook endpoint (`POST /api/webhooks/paypal`): signature verification, deduplication by event id, durable write.
- Implement dispute state machine and in-process queue (`p-queue`).
- Implement mutation executors: `provide-evidence` and `accept-claim` with `PayPal-Request-Id` and audit log trails.
- Create webhook simulation script (`scripts/simulate-webhook.ts`).
