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
| **Phase 1** | **Foundation (Core Shell & Config)** | Oct 12–16 | **NEXT** | Next.js + TS strict + Tailwind + Drizzle + SQLite + Auth gate + Design tokens. |
| **Phase 2** | **PayPal Integration & Webhooks** | Oct 17–23 | Pending | Webhooks, state machine, provide-evidence & accept-claim executors, idempotency. |
| **Phase 3** | **Agent & Evidence Providers** | Oct 24–30 | Pending | Evidence providers, reason playbooks, LLM structured analysis (NIM), guardrails, SSE stream. |
| **Phase 4** | **Dashboard & UX** | Oct 31–Nov 4 | Pending | AG Grid dark theme, stat cards, urgency strip, dispute detail 3-column hero, audit view. |
| **Phase 5** | **Hardening & Docs** | Nov 5–7 | Pending | Security checklist, Playwright happy path, README (< 10 min setup), seed-on-boot. |
| **Phase 6** | **Video & Submission** | Nov 8–10 | Pending | Demo video (≤ 3 min), Devpost submission, clean repo check. |

---

## 3. Technology Stack & Key Decisions

- **Framework:** Next.js (App Router) + TypeScript Strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **Database:** SQLite (`better-sqlite3`) + Drizzle ORM (Zero infra, self-contained for judges).
- **AI Engine:** NVIDIA NIM (`LLM_PROVIDER=nvidia-nim`, base URL `https://integrate.api.nvidia.com/v1`, key `NVIDIA_NIM_API_KEY`, model `meta/llama-3.3-70b-instruct`) using `@ai-sdk/openai` with structured outputs (`generateObject` + Zod).
- **PayPal Client:** Typed REST client targeting `https://api-m.sandbox.paypal.com` with OAuth client credentials in-memory caching and `PayPal-Request-Id` idempotency.
- **UI Design System:** Minimalist Dark:
  - Surfaces: `#0A0A0F`, `#12121A`, `#1A1A24`, glass card `rgba(26,26,36,0.6)`
  - Accent: Amber `#F59E0B`
  - Typography: Space Grotesk (display), Inter (sans), JetBrains Mono (data/IDs/money/logs)
  - Grid: AG Grid React Community with Quartz theme customized via Theming API.
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

## 5. Next Immediate Action: Phase 1 Kickoff
- Initialize Next.js project with TypeScript strict, Tailwind CSS, Lucide React, and AG Grid.
- Configure Zod environment parsing (`src/server/config/env.ts`) integrating NVIDIA NIM credentials.
- Set up SQLite schema with Drizzle ORM (`src/server/db/schema.ts`).
- Build design tokens in Tailwind and CSS variables as defined in `08-DESIGN.md`.
