# Praesidium — Product Requirements Document (PRD)

**Version:** 1.0 · **Owner:** Laik · **Target:** PayPal AI Hackathon (submit by Nov 12, 2026, 12:00pm PT / Nov 13, 1:30am IST)

## 1. Summary
Praesidium is an AI agent that defends merchants against PayPal disputes. It ingests a new dispute, gathers evidence from fulfilment systems, scores the chance of winning, then either **contests** (submits an evidence package) or **accepts/refunds** (when the merchant is clearly liable) through PayPal's Disputes APIs. A dark, data-dense dashboard (AG Grid) gives merchants full visibility and control.

## 2. Problem
- Small DTC merchants lose money on disputes they could win: assembling evidence takes ~30–45 min per case, and deadlines are strict.
- Low-value disputes are often abandoned because the labour costs more than the order.
- Merchants lack a single place to see disputes, deadlines, evidence quality, and recovered revenue.

## 3. Target users
| Persona | Need |
|---|---|
| Solo/SMB merchant (primary) | Respond to disputes fast without hiring a specialist |
| Ops/support lead | See queue, deadlines, win rate; approve or override the agent |
| Judge/reviewer (hackathon) | Understand and run the product in minutes |

## 4. Goals and non-goals
**Goals**
1. Real PayPal sandbox integration: list/get disputes, webhooks, submit evidence, accept claim, (optional) refund/tracking.
2. A genuinely agentic loop: classify → gather → reason → decide → act, with an explainable audit trail.
3. Human-in-the-loop by default; autonomy is opt-in per rule.
4. A polished, complete product experience (not a prototype screen).

**Non-goals (v1)**
- Production/live-money PayPal accounts.
- Multi-tenant SaaS billing, org management, SSO.
- Real carrier/warehouse integrations (these are mocked behind clean interfaces).
- Card-network (Visa/Mastercard) direct integrations.

## 5. User stories
- As a merchant, I see new disputes appear live with the deadline and amount.
- As a merchant, I open a dispute and watch the agent gather evidence and explain its reasoning.
- As a merchant, I approve or edit the evidence package before it is submitted.
- As a merchant, I let the agent auto-accept disputes under a threshold I set.
- As a merchant, I see recovered revenue, win rate, and hours saved.
- As a reviewer, I can run the whole demo with one seed command.

## 6. Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Receive PayPal dispute webhooks (verified) and persist events idempotently | P0 |
| FR-2 | Sync and list disputes from PayPal sandbox | P0 |
| FR-3 | Classify dispute reason and stage | P0 |
| FR-4 | Collect evidence from pluggable sources (order, tracking, delivery proof, chat logs) | P0 |
| FR-5 | Produce structured decision: `contest` / `accept` / `needs_human`, with win probability, confidence, rationale, and cited evidence | P0 |
| FR-6 | Submit evidence to PayPal (`provide-evidence`) after approval | P0 |
| FR-7 | Accept claim via PayPal (`accept-claim`) | P0 |
| FR-8 | Dashboard: stats, urgency strip, AG Grid disputes table | P0 |
| FR-9 | Dispute detail: facts, evidence timeline, live agent reasoning, actions | P0 |
| FR-10 | Audit log of every agent step and PayPal call (request/response, redacted) | P0 |
| FR-11 | Approval gate with auto-mode rules (amount threshold, min confidence) | P1 |
| FR-12 | Deadline alerts (in-app) for disputes due < 48h | P1 |
| FR-13 | Settings: thresholds, evidence sources, sandbox status | P1 |
| FR-14 | Export audit log / evidence package as PDF or JSON | P2 |

## 7. Success metrics (demo-level)
- End-to-end dispute handled in < 90 seconds on screen.
- ≥ 8 seeded disputes covering ≥ 3 reasons.
- ≥ 90% of agent decisions pass schema validation first try.
- Zero secrets in the repo; fresh clone runs in < 10 minutes.

## 8. Hackathon requirement mapping
| Requirement | How Praesidium satisfies it |
|---|---|
| PayPal meaningfully used | Disputes API, webhooks, OAuth, (optional) Agent Toolkit/MCP, tracking/refund |
| AI meaningfully used | LLM agent with tools + structured decisions + reasoning trace |
| Working demo | Run instructions + seed script (+ hosted URL if possible) |
| Public repo + license | MIT, visible in About |
| Video < 3 min on YouTube | Script in 06-PHASES.md |
| Docs | README + these documents |

## 9. Demo narrative (≤ 3 min)
1. 0:00 Dashboard, queue of disputes, urgency strip.
2. 0:30 New webhook arrives; toast; agent starts.
3. 0:50 Detail view: evidence timeline fills, reasoning streams, win probability appears.
4. 1:30 Approve → evidence submitted → status flips in PayPal sandbox.
5. 2:00 A second dispute where merchant is liable → agent accepts.
6. 2:20 Dashboard stats update; audit log shows every PayPal call.
7. 2:45 Close with impact: time saved, revenue recovered.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Sandbox disputes hard to create/advance | Seed on Day 1; documented manual flow; fallback adapter clearly labelled in UI |
| Evidence endpoint restrictions | Validate Day 1; use structured notes + tracking info if files fail |
| LLM nondeterminism | Zod schemas, low temperature, retries, deterministic pre-checks |
| Scope creep | P0 only until Phase 4 |
