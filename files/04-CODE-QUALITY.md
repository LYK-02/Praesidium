# Praesidium — Code Quality and Engineering Practices

## 1. Language and compiler
- TypeScript `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
- No `any` (lint-enforced); use `unknown` + Zod narrowing.
- Shared types derive from Zod schemas (`z.infer`) — one source of truth.

## 2. Tooling (enforced in CI and pre-commit)
| Tool | Purpose |
|---|---|
| ESLint (typescript-eslint strict, import, react-hooks, jsx-a11y) | Static analysis |
| Prettier | Formatting (no style debates) |
| Husky + lint-staged | Pre-commit checks |
| Vitest | Unit/integration |
| Playwright | E2E happy path |
| gitleaks / pnpm audit | Security hygiene |
| Conventional Commits + commitlint | History clarity |

CI pipeline: `install → typecheck → lint → test → build → e2e (smoke)`. Main must always be green.

## 3. Architecture rules
- **Layers:** `app` (routes/UI) → `server` (domain logic) → `lib` (pure utils). No upward imports.
- Route handlers are thin: parse → call service → map result.
- External systems (PayPal, LLM, evidence sources) sit behind interfaces; business logic never imports SDKs directly.
- Pure functions for scoring, guardrails, money, dates — trivially testable.
- No global mutable state except the cached OAuth token (encapsulated, single-flight).
- Prefer composition over inheritance; small modules (< 250 lines), small functions (< 40 lines).

## 4. Naming and structure
- Files `kebab-case.ts`; components `PascalCase.tsx`; hooks `useThing`; constants `SCREAMING_SNAKE` only for true constants.
- Names say intent: `collectEvidence`, `applyGuardrails`, not `process`, `handle`, `doStuff`.
- Colocate tests: `thing.ts` ↔ `thing.test.ts`.
- One export style per module (named exports; default only for Next.js pages/layouts).

## 5. Error handling
- Errors are typed and carry context (`code`, `disputeId`, `cause`).
- Use `Result<T, E>` for expected failures (provider timeout, validation); throw only for programmer errors.
- Never swallow errors; log once at the boundary with correlation id.
- User-facing messages are friendly; technical detail goes to logs/audit.

## 6. Testing standards
- Pyramid: many unit, some integration, one E2E.
- Every bug fix ships with a regression test.
- No network in unit tests; PayPal via MSW fixtures from recorded sandbox responses.
- LLM tests assert **schema validity and decision class** on fixed fixtures, not exact wording.
- Coverage target: ≥ 80% on `server/agent`, `server/paypal`, `lib`; don't chase UI coverage.
- Deterministic time (`vi.useFakeTimers`) and IDs in tests.

## 7. Performance
- Server-side pagination/filtering for the grid; never ship all rows by default.
- Memoise AG Grid column defs; stable row IDs (`getRowId`).
- Stream with SSE; avoid polling loops.
- Parallelise independent evidence providers with timeouts (`Promise.allSettled`).
- Budget: dashboard interactive < 2s on seeded data.

## 8. Accessibility (non-negotiable)
- Semantic HTML, labelled controls, visible `focus-visible` rings (amber).
- Keyboard-navigable grid and dialogs; ARIA live region for agent stream updates.
- Contrast ≥ AA; never convey status by colour alone (icon + text).
- Respect `prefers-reduced-motion`.

## 9. Git workflow
- Trunk-based with short-lived branches: `feat/…`, `fix/…`, `chore/…`.
- Commits: `feat(agent): add guardrail for low confidence`.
- PR template checklist: tests added, docs updated, no secrets, screenshots for UI.
- Squash merge; tags per phase (`v0.1-foundation`, …).

## 10. Documentation
- README: what/why, quick start (< 10 min), env, seed, run, architecture diagram, sandbox notes, limitations, license.
- ADRs (`docs/adr/NNN-title.md`) for significant decisions (SQLite vs Postgres, SSE vs WebSocket).
- JSDoc on public service functions; comments explain *why*, not *what*.

## 11. Definition of Done
- [ ] Typecheck, lint, tests green
- [ ] Error and empty/loading states handled
- [ ] Audit log entries emitted for new actions
- [ ] Accessibility checked (keyboard + contrast)
- [ ] Docs/README updated
- [ ] No TODOs without an issue reference
- [ ] Demo path still works end-to-end

## 12. Code review checklist
Correctness · security (inputs, secrets, idempotency) · failure modes · naming · duplication · test quality · UX states · bundle impact.
