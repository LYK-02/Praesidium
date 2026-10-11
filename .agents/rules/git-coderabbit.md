# Git Commit & CodeRabbit Review Rule

## Invariants Before Any Git Commit

1. **Zero Secret Leaks**:
   - Always run and inspect `git status` before committing.
   - Strictly verify that `.env*` (except `.env.example`), private keys, or API credentials are NOT staged.

2. **Code Quality Pre-Checks**:
   - Ensure `pnpm typecheck` and `pnpm lint` pass cleanly before committing.
   - Run relevant unit/integration tests (`pnpm test`).

3. **CodeRabbit CLI Review**:
   - Run AI code review on the working diff:
     ```powershell
     coderabbit review --plain
     # or
     cr review --plain
     ```
   - Address any critical, security, or high-severity feedback flagged by CodeRabbit before finalizing the commit.
   - If CodeRabbit CLI is not yet installed on Windows, install via PowerShell:
     ```powershell
     irm https://cli.coderabbit.ai/install.ps1 | iex
     ```
     Then authenticate once with:
     ```powershell
     cr auth login
     ```

4. **Conventional Commits**:
   - All commit messages MUST follow the Conventional Commits specification:
     - `feat(<scope>): <description>` (e.g., `feat(agent): add guardrail for low confidence`)
     - `fix(<scope>): <description>` (e.g., `fix(paypal): retry on 429 rate limit`)
     - `chore(<scope>): <description>` (e.g., `chore(setup): complete phase 0 foundation`)
     - `docs(<scope>): <description>` (e.g., `docs(sandbox): document disputes api findings`)
     - `test(<scope>): <description>` (e.g., `test(evals): add prompt injection fixture`)

5. **No Blind Commits**:
   - Never run `git commit -a` without explicit inspection of the staged files.
