# Praesidium — Project Rules (for you and any AI coding assistant)

Drop this file in the repo root as `RULES.md` (or copy into `CLAUDE.md` / `.cursorrules`). These rules override convenience.

## 0. Prime directives
1. **Sandbox only.** Never call live PayPal. Never ask for or store live credentials.
2. **Never fabricate APIs.** If unsure of a PayPal endpoint, field, or enum, say so and check docs / `docs/sandbox-findings.md`. Don't invent.
3. **Model proposes, code disposes.** No money-moving action may come from raw LLM text.
4. **Demo path first.** Anything not on the demo path is lower priority.
5. **Small, reviewable changes.** One concern per commit/PR.

## 1. Always
- Read the relevant doc (PRD/TRD/SECURITY/DESIGN) before changing behavior.
- Validate all external data with Zod (requests, webhooks, PayPal responses, LLM output).
- Use integer minor units for money; UTC for time.
- Add an idempotency key to every mutating PayPal call.
- Write an audit entry for every agent step and PayPal call (redacted).
- Handle loading, empty, error, and success states in every UI.
- Add/update tests with the change; keep CI green.
- Use design tokens (08-DESIGN.md); no hard-coded hex/px in components.
- Keep route handlers thin; business logic in `src/server`.
- Update docs when behavior changes.

## 2. Never
- Commit secrets, tokens, `.env`, or real customer data.
- Use `any`, `@ts-ignore`, or disable lint rules without a comment + issue.
- Log tokens, full PII, or raw card data.
- Render model output as HTML.
- Pass untrusted buyer text to a step that has tools.
- Use floats for money or local-time storage.
- Add a dependency without justification (size, maintenance, license).
- Leave `console.log`, dead code, or TODOs without an issue.
- Make a mutating action non-idempotent.
- Silently swallow errors.

## 3. Agent behavior rules (runtime)
- Default mode is **approval required**. Auto-mode only under user-set thresholds.
- Force `needs_human` when: confidence < threshold, required evidence missing, amount > auto limit, deadline imminent with gaps, or any guardrail error.
- Win probability is labelled an **estimate**.
- Every claim in a brief cites an evidence item.

## 4. Workflow rules
- Branch per task; Conventional Commits; squash merge.
- Run `pnpm typecheck && pnpm lint && pnpm test` before every push.
- Prefer deleting code over adding code.
- When blocked > 30 min, write down the question, pick a fallback, move on.
- Re-test the full demo path after each phase.

## 5. AI-assistant instructions
- State assumptions before coding; ask when requirements are ambiguous.
- Match existing patterns, file layout, and naming.
- Explain *why* briefly; don't over-explain.
- Prefer minimal diffs; don't refactor unrelated code.
- Flag security, idempotency, and a11y implications of each change.
- Provide copy-paste-ready code and commands.
- If a requested change violates these rules, say so and propose a compliant alternative.

## 6. Decision log
Record significant choices in `docs/adr/` (context · decision · consequences).
