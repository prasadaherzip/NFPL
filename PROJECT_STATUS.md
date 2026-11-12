# NFPL Access Control Service — Project Status

## Project objective

Build a functional, tested, documented NFPL Access Control Service using Node.js, Express.js, PostgreSQL via `pg`, plain browser JavaScript, and `node:test`. The service must determine who may see and act on jobs, enforce maker/checker and scope rules, and maintain immutable audit history.

## User-requested architecture change

The supplied assignment brief specifies SQLite via better-sqlite3. The user explicitly requested PostgreSQL while preserving the rest of the behavior, so the implementation now uses PostgreSQL with parameterized queries, pooled connections, PostgreSQL constraints/indexes, and transactional state changes plus audit writes. This is a documented scope deviation from the brief.

## Current user-provided specification

The PDF was read from `/Users/prasad/Downloads/NFPL_Access_Control_Assignment.pdf`. It describes the core workflow and edge cases. The corrected user-provided specification now requires five branches, standard teams only in Mumbai and Delhi, and 18 users including ABM, KRC, PAM, NCU, ADM, and PAR. The existing `ASSIGNMENT_BRIEF.md` was present despite the pasted instructions saying it was missing; this discrepancy is documented in `DESIGN.md`.

The current implementation also adds admin-only `POST /users`, `PATCH /users/:id`, `GET /users/:id/history`, and `GET /grants` endpoints. Profile/access and grant updates are parameterized, transactional, and append audit events with actor, target, change details, reason, and timestamp. The dashboard Admin Controls tab can edit user name, role, branch, direction, client scope, active status, absence, and create/revoke grants.

The corrected seed now creates the five branches Mumbai, Delhi, Kolkata, Pune, and Nagpur; only Mumbai and Delhi receive standard teams. ABM, KRC, PAM, NCU, ADM, and PAR cover the special cases.

Updated the job list so completed actions remain visible: the row's Current Stage is updated in place and the adjacent Action Taken column records the latest successful action instead of removing the job or showing a future action.
- Removed the Assignment column from the Admin Controls user table; user editing and grant management remain available.
- Changed Admin Controls user editing to a modal window opened by clicking the user's name. The modal controls role, branch, direction, client scope, active status, and absence.
- Removed the Manage Grants section from the Admin Controls interface; the user-edit modal remains the admin control surface.

Verification of the corrected specification used a separate `nfpl_corrected` PostgreSQL database: `npm run seed` created 18 users, 5 branches, 10 clients, 300 jobs, and 17 grants; API smoke tests returned 18 users, one KRC queue job, one NCU client-visible job, zero PAM jobs because of absence, and a successful grant listing. `npm test` passes 11/11.

## Current implementation phase

**Phase 11 — Final verification.** The official brief has been added and reconciled. Core implementation, tests, seed data, scale generation, dashboard, and documentation are complete. HTTP network smoke testing is blocked by the sandbox's `EPERM` restriction; application construction and all non-network checks pass.

## Overall completion

**94%** — All required brief/master-prompt artifacts are present and verified except live HTTP smoke testing in this restricted environment.

## Requirements checklist

- [x] Read and reconcile the complete `ASSIGNMENT_BRIEF.md` and extract all 14 design questions.
- [x] Identify required technology stack and mandatory project structure from the master prompt.
- [x] Identify the six mandatory test scenarios: maker/checker conflict, absent owner, changed responsibility, filed-job cancellation/reopening, admin self-escalation, overnight parser behavior.
- [x] Identify required API endpoints and core permission concerns.
- [x] Draft database design and implementation sequence.
- [x] Create persistent instructions in `AGENTS.md`.
- [x] Create this persistent status and handover document.
- [x] Implement project setup and schema.
- [x] Implement centralized permission engine.
- [x] Implement append-only history.
- [x] Implement REST API.
- [x] Create reproducible sample data and scale generator.
- [x] Implement and pass automated tests (7/7).
- [x] Build dashboard and consolidate it to the essential controls/results/history view.
- [x] Write initial design documentation and README.
- [ ] Perform clean-start live HTTP verification (blocked by sandbox networking; documented).

## Phase-by-phase implementation plan

### Phase 0 — Understand and plan

Obtain and read the missing assignment brief, extract all 14 design questions and any field-level rules, reconcile them with the master prompt, then revise this plan if necessary.

### Phase 1 — Setup

Initialize npm, add Express and better-sqlite3, configure scripts for start/test/seed/scale, create the required directories and `.gitignore`, and verify a minimal server starts.

### Phase 2 — Database

Implemented SQLite initialization and migrations for users, clients, branches, jobs, grants, and history. Added foreign keys, checks, indexes, nullable grant scope, active/revoked grants, absence, system/client accounts, and confirmed/prepared/checked/filed/cancelled/reopened stages.

### Phase 3 — Permission engine

Implement `canAct(user, action, job) -> { allowed, reason }` as the single authorization decision point. Cover role, maker/checker separation, client/branch/scope, direction/mode, absence, grant revocation, filed jobs, cancellation/reopening, admin, and overnight parser rules. Default to denial on uncertainty.

### Phase 4 — Audit history

Implement append-only history recording for job lifecycle actions, grant changes, and sensitive administrative decisions. Use transactions so successful state changes and their history entries commit together.

### Phase 5 — REST API

Implement and validate `GET /jobs/for-me/:userId`, `GET /check`, `POST /grants`, `DELETE /grants/:id`, `POST /jobs/:id/actions`, and `GET /jobs/:id/history`. Use meaningful status codes and denial reasons, and document demo authentication assumptions.

### Phase 6 — Sample data

Seed five branches, about ten clients, twenty users, a few hundred varied jobs, and deliberate maker/checker, restricted checker, absent employee, client user, admin, and overnight parser cases.

### Phase 7 — Tests

Create `node:test` coverage for the six mandatory scenarios plus grants/revocation, scope matching, unauthorized requests, history, jobs-for-me consistency, and invalid input. Fix every failure before proceeding.

### Phase 8 — Scale

Create a deterministic generator for 500 users and 200,000 jobs, execute a jobs-for-me benchmark, record duration and query/index evidence, and ensure permissions are not computed by loading every job into application memory.

### Phase 9 — Frontend

Build a plain HTML/CSS/JavaScript dashboard for jobs waiting for a user, permission checks, job history, and simple grant management where practical.

### Phase 10 — Documentation

Write `DESIGN.md` answering all assignment design questions, including visibility/action distinction, scope, separation, absence/reassignment, filed jobs, clients, admins, parser behavior, explanations, history, extensibility, consistency, and fail-closed behavior. Complete the README with setup, seed, API, sample-user access, and five-minute demo instructions.

### Phase 11 — Final verification

Run clean install, tests, seed, server startup, API checks, dashboard check, scale generation/benchmark, and README verification. Record exact results here.

## Proposed database design

The initial design uses these entities; exact columns and constraints must be reconciled with `ASSIGNMENT_BRIEF.md` before Phase 2:

- `users`: identity, display name, role classification, client/branch affiliation, active/absent status, system-account flag, and responsibility metadata.
- `clients`: customer identity and active status.
- `branches`: branch identity and active status.
- `jobs`: business reference, client, branch, direction, mode, stage, maker/checker ownership, filed/cancelled/reopened state, timestamps, and relevant responsibility versioning.
- `grants`: grantee, grantor, role/action, optional client/branch/direction/mode scope, active/revoked state, validity timestamps, and revocation metadata.
- `history`: immutable event ID, actor, optional job/grant references, action, previous state, new state, timestamp, permission decision, and reason.

Expected indexes include job client/branch/stage, ownership fields, jobs-for-me filter fields, grant grantee plus active status, and history job plus timestamp. Foreign keys and restrictive checks will be enabled on every connection.

## Architectural assumptions to validate

1. The demo has no real authentication layer; a URL/request user ID selects a seeded identity, but this is not production identity proof.
2. Visibility (`jobs/for-me`) and action authorization are separate decisions; a user may see a job without being allowed to act on it.
3. Grants are additive, explicit, scope-limited, immediately revocable, and never bypass maker/checker separation or hard client restrictions.
4. Absent users cannot act; responsibility reassignment is represented explicitly rather than silently rewriting past history.
5. Filed jobs are immutable for ordinary lifecycle actions; cancellation/reopening requires explicit policy and authorization from the brief.
6. Client users are restricted to their own client and cannot perform internal checker/admin actions unless the brief explicitly permits a narrow action.
7. Admin authority is bounded and cannot be used for self-escalation through ordinary grant APIs.
8. The overnight parser is a system account with only the import behavior explicitly granted to it; it cannot perform human checker/filer actions.
9. Permission explanations are safe, human-readable policy reasons and do not expose secrets.
10. All timestamps are stored consistently (preferably UTC) and rendered in the user's local context.

## Risks and edge cases

- Missing brief may hide mandatory fields, role names, state transitions, or one of the 14 design questions.
- Maker and checker may be the same person through overlapping grants or reassignment; separation must be checked after all effective grants are resolved.
- Revocation must take effect immediately, including for already-open UI pages.
- Scope matching must distinguish omitted scope from an explicit empty or all-value scope.
- Absent owners, inactive clients/branches, deleted references, and system accounts must fail closed.
- Filed-job cancellation/reopening may require special roles and must be audited.
- Concurrent state changes can create invalid transitions unless transactions and conditional updates are used.
- Large jobs-for-me queries must remain index-backed and must not materialize 200,000 rows unnecessarily.
- History must remain readable after user/job state changes and must never be updated or deleted.
- Invalid IDs, malformed actions, unknown stages, and revoked grants need stable error responses.
- Demo authentication shortcuts must not be presented as production security.

## Files created or modified

- `AGENTS.md` — created with persistent project instructions.
- `PROJECT_STATUS.md` — created as the handover and progress tracker.

No application source, package manifest, database, or test files have been created yet because Phase 0 is the requested starting point and the assignment brief is missing.

## Database schema status

Implemented in `src/db.js`; schema includes required entities, constraints, foreign keys, indexes, nullable grant scope, and lifecycle stages. Reconciled with the supplied brief.

## API implementation status

Implemented in `src/server.js` for all required endpoints, with demo identity assumptions documented.

## Automated test results

`npm test`: 9 passing, 0 failing, including assigned-maker preparation across branch scope and assigned-checker filing.
`npm run seed`: successful; 300 jobs and 20 users. Seed now safely removes stale SQLite WAL/SHM files before rebuilding.
`npm run scale`: successful; 500 users, 200,000 jobs, 1,016 ms insert benchmark, 0 ms measured indexed count query, 10,000 matching jobs.
`node src/server.js`: startup callback printed the expected listening message. Binding/HTTP smoke test is blocked in this sandbox by `EPERM` on localhost sockets.

## Known bugs and unresolved issues

- Live API integration smoke test remains outstanding because the execution sandbox prohibits localhost socket binding.

## Architectural decisions and assumptions

See `DESIGN.md` for the reconciled answers to all 14 questions, assumptions, trade-offs, and scope cuts.

## Last successful commands

- `rg --files -g '!*node_modules*'` — confirmed the workspace is currently empty.
- `npm install express better-sqlite3` — dependencies installed successfully.
- `npm test` — 7/7 passing after fixing overnight parser import policy.
- `npm run seed` — successful.
- `npm run scale` — successful with 200,000 jobs.
- `cp /Users/prasad/Downloads/Pasted%20text.txt ASSIGNMENT_BRIEF.md` — official brief added to the project.
- `npm test` — 7/7 passing after brief-specific role/scope and lifecycle updates.
- `npm run seed` — successful after adding deliberate grants and confirmed-stage sample jobs.
- `npm test && npm run scale` — successful after fixing seed database cleanup and stage-specific permission tests.
- `npm test && npm run seed` — successful after correcting assigned ownership/file permissions exposed by the user's screenshots.
- `node --check public/app.js && node --check src/server.js && npm test` — successful after UI simplification; 9/9 tests pass.
- `npm run seed` — successful after persona consolidation; 20 users, 300 jobs, and 300 initial audit rows.
- UI layout updated so Jobs for Me is the left panel and Permission Check is the right panel; responsive fallback stacks them on small screens.
- Jobs list now renders all available jobs inside a scrollable card sized for approximately 10 visible rows, with a sticky header.
- Removed the overnight parser from the human dashboard selector; it remains available as a backend system account for automated imports and permission tests.
- Job rows now show Client ID, Branch, Mode, Direction, and Stage alongside the job reference.
- Job rows now show the current stage and calculated next action; the row Check button selects that action automatically.
- Jobs panel title now shows the selected person's name and role, with a pending-job total above the scrollable list.
- Simplified user labels to `Name [Role]` and changed the job count to a bold number without the “pending jobs” label.
- Added all human sample users to the dashboard selector and simplified displayed job references to `J1`, `J3`, etc.
- Renamed the column to `Job No.` and capitalized displayed mode, direction, stage, and next-action values.
- Renamed the UI section/actions to `Audit History` and seeded one initial `job_created` audit event for each of the 300 sample jobs; verified 300 audit rows after seeding.
- Added role-aware action choices and a `Perform` button; successful actions call the server-side permission endpoint and remove the completed job from the current visible list.
- Repositioned the jobs card header: selected person and role are top-left; total job count is larger, bold, and top-right.
- Removed the per-row Check button, shortened the row link to `History`, and made each `J<number>` clickable to select its next action and open its Audit History.
- Removed the separate Check/Perform controls; each row now has one direct next-action button, which calls the server-side action endpoint and removes the job from the visible list after success.
- Applied an Apple SF Pro/system font stack throughout the dashboard with adjusted weights, sizes, spacing, table headers, buttons, and status text.
- Updated mode display so `LCL` and `FCL` remain uppercase; `Air` remains title case.
- Improved Audit History visibility: database startup backfills an initial audit event for any job without history, and opening a job scrolls directly to its history; verified 300 history rows.
- Removed row-level History buttons; added a right-side Next Actions card. Clicking an action performs the server-side check and displays the allowed/denied reason in that card. Audit History remains a single section below.
- Next Actions card now always shows Prepare, Check, File, Cancel, and Reopen; actions that do not apply to the selected person/job are disabled, grey, and struck through.
- Non-applicable actions are now grey but clickable; clicking one performs a permission lookup and shows the denial reason plus the exact active users allowed for that action/job. The strike-through styling was removed.
- Reconciled visible sample personas with the brief: removed redundant Maker/Checker variants from the dashboard selector, retained the required global Maker+scoped Checker, restricted Checker, absent user, client user, Admin, and parser cases. README now documents each user's access and workflow actions in detail.
- Added Client, Branch, Status, Direction, and Mode filters above the jobs list. Access-denial notifications now show a reason code, human-readable reason, and the exact active users allowed for the selected action/job.
- Audit History is now a table with timestamp, user, action, state change, decision, and reason. Denied workflow action attempts are also recorded; seed verification reports 300 jobs and 300 initial history rows.
- Re-verified the consolidated last UI changes together: filters/notifications, audit table, role-aware grey actions, SF Pro typography/capitalization, and consolidated user personas. `npm test` passes 9/9 and `node --check public/app.js` passes.
- Renamed sample and scale branches to Mumbai, Delhi, Nagpur, Pune, and Gujrat. Seed verification confirms B1-B5 use the new names; `npm test` passes 9/9.
- Restarted local demo with `npm run seed && npm start`; seed completed with 300 jobs and 20 users, and port 3000 is listening according to `lsof`.
- Created `ANTIGRAVITY_CLAUDE_HANDOFF.md`, a self-contained rebuild instruction covering the brief, architecture, roles, workflow, API, UI, audit history, seed/scale data, tests, commands, demo, and acceptance checklist.
- Updated the Antigravity/Claude handoff with a deliberate PostgreSQL + pg variant. The current NFPL workspace remains SQLite to preserve compliance with the official brief; the PostgreSQL variation is documented as a scope deviation.
- `npm run seed && npm start` was run successfully for seed/start output; this execution environment did not keep the server process listening after the command returned. A normal local Terminal session must keep `npm start` open for browser access.
- `node src/server.js` — startup message verified; live socket test blocked by environment permissions.

## Current blockers

- PostgreSQL migration completed and verified locally with PostgreSQL 15: seed created 300 jobs and 20 users; `/health`, `/users`, and `/jobs/for-me/admin` returned successfully, with 20 users and 300 Admin-visible jobs. The full permission test suite remains 9/9 passing.
- Added a top header Job No. search field supporting `J1`, `1`, and `JOB-0001` formats; it filters the selected user's loaded jobs without changing the existing scope filters.
- Expanded the PostgreSQL seed matrix to 51 users: 45 scoped users cover Maker, Checker, and Filer permissions for every branch, each with Import, Export, and Both-direction variants. Both-direction access is stored as separate Import and Export grants.

- Added a plain-language role definition beneath the selected user in the dashboard. Definitions are specific to Asha, Maya, Ravi, Absent Owner, and Client User.
- Moved the selected user's role definition to the bottom of the Actions panel.
- Formatted the Actions-panel role definition as a distinct bottom section with a label, spacing, border, and readable text styling.
- Added the Overnight Parser to the dashboard user selector with a System role definition; it remains restricted to import-only behavior by the centralized permission engine.
- Fixed the jobs-for-me query so Admin users can see all active-client and active-branch jobs, including jobs not assigned to them.
- Added an Admin Controls tab for Asha. It loads all seeded users and generated employees from `GET /users` and displays role, scope, status, and plain-language assignment instructions.
- Improved Admin Controls loading feedback when an outdated server process returns the HTML page instead of the `/users` JSON response.
- Updated job numbers to use bold blue SF Pro styling consistent with the emphasized total job count.

Only live HTTP smoke testing remains blocked by the restricted execution environment. A screenshot-driven policy mismatch was fixed: explicit job assignment now takes precedence over default branch scope, and assigned checkers may file checked jobs.

## Exact next steps for the next session

1. On a normal local machine, run `npm install`, `npm test`, `npm run seed`, and `npm start`.
2. Open `http://localhost:3000` and follow the README demo script.
3. Run live API smoke checks for `/check`, `/jobs/for-me`, actions, grants, and history.
4. Run `npm run scale` if the scale benchmark is needed for the demonstration.

### HANDOVER TO NEXT SESSION

The official brief is now present as `ASSIGNMENT_BRIEF.md` and all 14 design questions are answered in `DESIGN.md`. Core implementation exists across `src/`, `scripts/`, `public/`, `data/`, and `test/`; the full suite passes. The next task is simply live HTTP/dashboard verification on a normal local environment.
