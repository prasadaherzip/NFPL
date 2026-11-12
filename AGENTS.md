# NFPL Access Control Service — Persistent Project Instructions

## Source of truth

`ASSIGNMENT_BRIEF.md` is the primary specification. The master implementation prompt supplied with the task defines the required phases, files, technology stack, test scenarios, and handover process. If the two conflict, preserve the assignment's mandatory requirements and document the decision in `PROJECT_STATUS.md`.

## Required workflow

1. At the start of every session, read `PROJECT_STATUS.md`, `AGENTS.md`, and `ASSIGNMENT_BRIEF.md` before modifying code.
2. Work phase by phase: planning, setup, database, permissions, history, API, seed data, tests, scale generation, frontend, design documentation, final verification.
3. Update `PROJECT_STATUS.md` after each phase, major feature, test run, discovered error, architectural change, and before stopping.
4. Do not claim a feature works without running the relevant command or test.
5. Keep authorization centralized in `src/permissions.js`; routes must not duplicate authorization rules.
6. Use parameterized SQL and transactions for state changes plus audit-history writes.
7. Keep audit history append-only and preserve reproducible sample data.
8. Prefer the Node.js built-in test runner (`node:test`) and the specified stack: Node.js, Express, better-sqlite3, SQLite, and plain HTML/CSS/JavaScript.

## Safety and scope

- Do not introduce React, TypeScript, MongoDB, or unnecessary frameworks.
- Treat request-supplied user IDs as demo inputs only; document authentication assumptions and fail closed when identity or authorization is uncertain.
- Do not remove required behavior to simplify implementation without recording the scope cut and reason.
- Preserve existing user changes if the repository is no longer empty.

## Verification expectations

At minimum, verify startup, the full `node:test` suite, seed execution, required API endpoints, history behavior, grant/revoke behavior, jobs-for-me consistency, and the deterministic scale benchmark before declaring completion.
