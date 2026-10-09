# Praesidium — Build Phases

**Today:** Oct 9, 2026 · **Hard deadline:** Nov 12, 12:00pm PT = **Nov 13, 1:30am IST** · **Plan to submit by Nov 10** (2-day buffer).

Each phase has an exit gate. Do not start the next phase until the gate passes (except Phase 6 prep).

## Phase 0 — Setup and sandbox validation (Oct 9–11)
- [ ] PayPal dev account, sandbox REST app, Business + Personal sandbox accounts
- [ ] Public GitHub repo, MIT license, `.gitignore`, `.env.example`
- [ ] Seed 8–10 real sandbox disputes (varied reasons) via buyer account
- [ ] Test: list/get dispute, provide-evidence, accept-claim, webhook delivery (tunnel)
- [ ] Install Agent Toolkit/MCP; confirm which dispute tools exist
- [ ] Write `docs/sandbox-findings.md` (what works / what doesn't / workarounds)
- [ ] Register for webinars or watch recordings (Oct 12–13)

**Gate:** At least list + get + one mutating call proven against sandbox. Scope adjusted to findings.

## Phase 1 — Foundation (Oct 12–16)
- [ ] Next.js + TS strict + Tailwind + ESLint/Prettier/Husky/CI
- [ ] Zod env config, Drizzle schema + migrations, SQLite
- [ ] Design tokens + base UI kit (08-DESIGN.md): button, card, input, badge, layout shell
- [ ] Auth gate (single admin) + security headers
- [ ] PayPal client skeleton (token cache, typed errors, audit hook)

**Gate:** `pnpm dev` shows styled shell behind login; CI green.

## Phase 2 — PayPal integration (Oct 17–23)
- [ ] Sync disputes → DB; map PayPal enums to domain types
- [ ] Webhook endpoint: verify, dedupe, store, enqueue
- [ ] Job queue + dispute state machine
- [ ] Executors: provide-evidence, accept-claim (idempotent, audited)
- [ ] `scripts/simulate-webhook.ts` + MSW fixtures from real responses

**Gate:** Real webhook → stored → state transition; evidence submit works against sandbox (or documented fallback).

## Phase 3 — Agent (Oct 24–30)
- [ ] Evidence provider interface + mock providers (tracking, delivery proof, chat log, order history)
- [ ] Playbooks per reason; deterministic classifier
- [ ] LLM analysis with Zod `Decision`, prompt v1, retries
- [ ] Guardrails + approval gate + auto-mode settings
- [ ] SSE stream of agent steps; audit log entries
- [ ] Eval fixtures (≥ 10) incl. prompt-injection case

**Gate:** 3 dispute types run end-to-end headless with correct decisions; injection fixture passes.

## Phase 4 — Dashboard and UX (Oct 31–Nov 4)
- [ ] Dashboard: stat cards, urgency strip, AG Grid (themed, server-side filter/sort)
- [ ] Dispute detail: facts, evidence timeline, live reasoning, approve/accept actions
- [ ] Audit log grid, settings page
- [ ] Empty/loading/error states; toasts; keyboard + a11y pass
- [ ] Motion polish per design system (subtle)

**Gate:** Full demo path clickable with zero dead ends; Lighthouse a11y ≥ 90.

## Phase 5 — Hardening and docs (Nov 5–7)
- [ ] Security checklist (03-SECURITY.md) complete
- [ ] Playwright happy-path; fix flakiness
- [ ] README: quick start < 10 min, architecture, limitations, sandbox notes
- [ ] Deploy (Render) + hosted demo URL; seed data on boot
- [ ] Fresh-clone test on a clean machine/container

**Gate:** Stranger can run it from README alone.

## Phase 6 — Video and submission (Nov 8–10) · Buffer (Nov 11–12)
- [ ] Final script (below), rehearse ≥ 3 times, record in 1080p, clean desktop
- [ ] Upload to YouTube (public), no copyrighted music/trademarks
- [ ] Devpost: description, tools used + how, repo link, demo URL, video link
- [ ] Confirm license visible in repo About; repo is public
- [ ] Submit ≥ 24h before deadline; re-open submission to verify

### Demo video script (≤ 3:00)
| Time | Screen | Narration |
|---|---|---|
| 0:00–0:20 | Dashboard | "Merchants lose winnable disputes because evidence takes 45 minutes and deadlines don't wait." |
| 0:20–0:45 | Webhook toast → detail | "A real PayPal sandbox dispute arrives. Praesidium starts working immediately." |
| 0:45–1:30 | Evidence timeline + reasoning stream | "It gathers tracking, delivery proof, and order history, then explains its reasoning with citations." |
| 1:30–2:00 | Approve | "The merchant approves; evidence goes to PayPal's Disputes API." Show sandbox status change. |
| 2:00–2:25 | Second dispute (accept) | "When the merchant is liable, it recommends accepting and protects account health." |
| 2:25–2:45 | Dashboard + audit log | "Every PayPal call is auditable. Time saved and revenue recovered update live." |
| 2:45–3:00 | Closing | Impact, who it's for, repo link. |

## Cut list (drop in this order if behind)
1. Export PDF 2. Deadline alerts 3. Auto-mode rules 4. Settings page 5. Hosted deploy (keep README run steps)

## Weekly checkpoint questions
Is the demo path still intact? What's the riskiest unknown left? What can be cut?
