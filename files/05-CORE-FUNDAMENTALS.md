# Praesidium — Core Fundamentals

Concepts you must be solid on before and while building.

## 1. Disputes domain
**What is a dispute?** A buyer challenges a payment. PayPal mediates; the merchant responds with evidence or accepts liability.

**Stages (verify exact enums in docs):** `INQUIRY` (cheap, early; often resolvable by messaging) → `CHARGEBACK` (formal, funds held) → `PRE_ARBITRATION` → `ARBITRATION`.

**Status:** `OPEN` · `WAITING_FOR_BUYER_RESPONSE` · `WAITING_FOR_SELLER_RESPONSE` · `UNDER_REVIEW` · `RESOLVED`. Only some statuses allow seller actions.

**Common reasons → playbooks**
| Reason | What wins it |
|---|---|
| Item not received | Tracking showing delivery to the address, signature/proof of delivery |
| Unauthorized transaction | Order/IP/device history, delivery to buyer's confirmed address, prior orders |
| Not as described | Product listing, photos, communications, return policy, buyer didn't return |
| Duplicate/credit not processed | Transaction records, refund proof |

**Merchant actions:** provide evidence · accept claim (refund) · make offer (partial) · message buyer · appeal (where available).

**Key truth:** deadlines are strict; late = auto-loss. Surface time-to-deadline everywhere.

## 2. Evidence principles
- Evidence is claim-specific: gather what the playbook requires, not everything.
- Prefer verifiable third-party proof (carrier scan) over self-reported notes.
- Every claim in the brief must cite an evidence item.
- Missing evidence is a first-class output (`missingEvidence`), not a silent gap.

## 3. Win probability (be honest)
It is an **estimate**, not a prediction from historical PayPal outcomes. Blend: playbook coverage score (rules) + LLM judgement. Present with confidence and rationale; never imply guarantees. In the video, call it "estimated win likelihood".

## 4. Event-driven systems
- Webhooks are **at-least-once** and may arrive out of order or duplicated → dedupe by event id, make handlers idempotent, re-fetch current state from the API instead of trusting payload alone.
- Persist first, process later. Respond 2xx quickly.
- Model workflows as explicit state machines; illegal transitions are errors.

## 5. Idempotency
A retried request must not repeat its side effect. Use idempotency keys (`PayPal-Request-Id` + local unique key). Always ask: "what if this runs twice?"

## 6. Money and time
- Money = integer minor units + ISO currency. Never floats. Format only at the edge.
- Store UTC; render in the user's locale/timezone. Deadlines display relative ("14h left") and absolute.
- Round deliberately and document rounding.

## 7. OAuth2 client credentials
Exchange client id/secret for a short-lived bearer token; cache until near expiry; refresh single-flight; never expose to the browser.

## 8. Agentic AI fundamentals
- **Agent = loop of perceive → reason → act**, constrained by tools and guardrails.
- Use deterministic code wherever the answer is knowable (routing, deadlines, validation); use the LLM for judgement over messy text.
- **Structured output** (schema-validated) beats free text for anything that triggers actions.
- **Separation of duties:** the model proposes; code disposes (guardrails, approval, idempotent executor).
- **Prompt injection** is expected: untrusted text is data, never instructions.
- **Explainability** builds trust: reasoning + citations visible to the user.
- Evaluate with fixtures; version prompts; log model + prompt version.

## 9. Real-time UX
SSE streams one-way server events (agent steps) with auto-reconnect; simpler than WebSockets for this need. Always provide a non-streaming fallback (refetch on reconnect).

## 10. Product fundamentals for judging
Five equal criteria: Technological Implementation, Design, Potential Impact, Innovation, Presentation. Ask of every feature: *Does it make the demo clearer, the integration deeper, or the product more complete?* If not, cut it.

## 11. Glossary
**Chargeback** buyer-initiated reversal via the card issuer/PayPal · **Representment** merchant's evidence response · **Idempotency** safe repeats · **HITL** human-in-the-loop · **SSE** server-sent events · **ADR** architecture decision record.
