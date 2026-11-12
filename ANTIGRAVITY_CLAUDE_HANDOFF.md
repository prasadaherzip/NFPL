# NFPL Access Control Service — Antigravity + Claude Rebuild Handoff

## Purpose

Use this document as the complete rebuild instruction for Claude in Antigravity. The repository's ASSIGNMENT_BRIEF.md remains the primary source of truth. This handoff consolidates the business requirements, current UI decisions, architecture, API behavior, seed data, tests, and acceptance criteria.

### Database variation requested by the user

The official brief specifies SQLite with better-sqlite3. This rebuild handoff intentionally changes the database to PostgreSQL. The current workspace now uses the PostgreSQL implementation; this remains a documented scope deviation in DESIGN.md, PROJECT_STATUS.md, and README.md.

Build the complete working application incrementally. Do not create a mock, replace the stack, or skip verification.

## Required stack

Use only:

- Node.js CommonJS
- Express.js
- PostgreSQL through the official Node.js pg driver
- Plain HTML, CSS, and browser JavaScript
- Node built-in node:test

Do not use React, TypeScript, MongoDB, an ORM, or unnecessary frameworks. Do not introduce an ORM for PostgreSQL; use parameterized SQL through pg.

Required project files:

~~~text
ASSIGNMENT_BRIEF.md
AGENTS.md
PROJECT_STATUS.md
README.md
DESIGN.md
package.json
.gitignore
src/server.js
src/db.js
src/permissions.js
src/history.js
public/index.html
public/app.js
public/style.css
data/users.json
data/clients.json
data/branches.json
data/jobs.json
data/grants.json
scripts/seed.js
scripts/generate-scale.js
test/permissions.test.js
~~~

## Business objective

NFPL is a customs brokerage. Every shipment is a job with:

- One client
- One branch
- One direction: import or export
- One mode: Air, FCL, or LCL
- A stage: Confirmed, Prepared, Checked, Filed, Cancelled, or Reopened

The service must:

1. Manage scoped roles through grants.
2. Answer whether a user may perform an action on a job.
3. Return a human-readable reason with every permission answer.
4. Show jobs relevant to the selected person.
5. Keep immutable audit history.
6. Work efficiently for 500 users and 200,000 jobs.

The central permission contract is:

~~~text
{ allowed: boolean, reason: string }
~~~

Authorization must be centralized in src/permissions.js. Routes must not duplicate policy logic.

## Required personas

The dashboard should show one representative for each required access pattern. Do not show redundant role variants in the human selector.

### Asha [Admin]

- Any client, branch, direction, and mode.
- Can prepare, check, file, cancel, and reopen jobs.
- Can create and revoke grants for other users.
- Cannot use the ordinary grant API to grant herself a new role.
- Every administrative change is audited.

### Maya [Maker + Checker]

- Maker for any client, branch, direction, and mode.
- Checker for Client 1, any branch, direction, and mode.
- Checker for Client 2 imports, any branch, and any mode.
- Cannot check a job she prepared herself.

Model this as a Maker user plus additive Checker grants.

### Ravi [Restricted Checker]

- Checker for Client 2.
- Branch 2 only.
- Imports only.
- Any mode.
- Cannot check other clients, branches, or exports.
- Can file work assigned to him after it is checked.

### Absent Owner [Maker]

- Has Maker responsibility but is absent.
- Must be denied every action while absent.

### Client User [Client viewer]

- May follow jobs belonging to Client 1.
- Cannot perform internal Maker, Checker, filing, cancellation, or reopening actions.

### Overnight Parser [System]

- Non-human background account.
- May import incoming shipment data.
- Cannot check, file, cancel, reopen, or perform human approval actions.
- Keep it in data and backend tests, but hide it from the human dashboard selector.

## Workflow and action rules

Normal flow:

~~~text
Confirmed -> Prepared -> Checked -> Filed
~~~

Exceptional flow:

~~~text
Prepared/Checked/Filed -> Cancelled -> Reopened
~~~

Actions:

- prepare: Maker completes documents/checklist.
- check: Checker reviews Maker work.
- file: Checker submits checked work.
- cancel: Checker or Admin cancels according to policy.
- reopen: Admin reopens a cancelled job.
- import: System parser imports shipment data.
- export: Direction-specific Maker capability only when policy permits.

Stage constraints:

- prepare only on Confirmed, New, or Reopened.
- check only on Prepared.
- file only on Checked.
- reopen only on Cancelled.
- Filed jobs cannot be prepared, checked, or filed again.
- Cancelled jobs may only be reopened.
- Maker/checker separation always wins.
- An explicit job assignment must be honored. A global Maker permission must not override an explicit assignment to another Maker.
- Absent and inactive users fail closed.

## Database

Use PostgreSQL 14+ or a compatible current PostgreSQL release. Connect through the official pg package with a connection pool. Read DATABASE_URL from the environment and never hard-code credentials. Use parameterized SQL everywhere.

Use migrations or an idempotent schema initializer. PostgreSQL transactions must cover each job state change plus its audit insert. Use database constraints and indexes rather than relying only on application validation.

Tables:

### clients

id, name, active.

### branches

id, name, active.

### users

id, name, role, client_id nullable, branch_id nullable, active, absent, system_account.

Primary roles are maker, checker, admin, client, and system. Multiple effective roles come from active grants.

### jobs

id, reference, client_id, branch_id, direction, mode, stage, maker_id nullable, checker_id nullable, created_at, updated_at.

Accept stages confirmed, new, prepared, checked, filed, cancelled, and reopened.

### grants

id, grantee_id, grantor_id, role, action, nullable client_id, nullable branch_id, nullable direction, nullable mode, active, created_at, revoked_at, revoked_by.

A null scope means any value. Revoke immediately by setting active to zero; never delete the grant.

### history

id, actor_id, nullable job_id, nullable grant_id, action, previous_state, new_state, permission_allowed, permission_reason, created_at.

History is append-only. Never add update or delete endpoints.

Required indexes:

- jobs by stage, branch, client, direction, and mode
- jobs by maker/checker
- grants by grantee, active, role, and action
- history by job and timestamp
- partial or composite indexes for active grants and active users where useful

## Permission engine

Implement:

~~~text
canAct(user, action, job, activeGrants) -> { allowed, reason }
~~~

Fail closed in this order:

1. User and job exist.
2. Action is recognized.
3. User is active and not absent.
4. Client and branch are active.
5. Client users are limited to their own client.
6. Stage supports the action.
7. Maker/checker separation holds.
8. Explicit maker/checker assignment holds.
9. System account restrictions hold.
10. Client-user restrictions hold.
11. Admin, cancellation, and reopening restrictions hold.
12. An active scoped grant or direct assignment matches.
13. Otherwise deny.

Examples of useful reasons:

- Maker/checker separation prevents the maker from checking the same job.
- Only prepared jobs can be checked.
- Only the assigned maker may prepare this job.
- No active checker permission matches this action and job scope.
- The overnight parser may import only.
- Client users cannot perform internal workflow actions.

## Audit history

Record:

- Initial job creation
- Successful prepare, check, file, cancel, and reopen actions
- Denied workflow action attempts
- Grant creation
- Grant revocation
- Permission-sensitive administrative actions

Every record contains actor, job or grant reference, action, previous state, new state, decision, reason, and timestamp.

Use a transaction for a job state update plus its successful history insert. Seed one initial job_created record for every sample job.

The UI must show a table with:

- Time
- User
- Action
- State change
- Decision
- Reason

## API

Implement:

- GET /jobs/for-me/:userId
- GET /check
- POST /grants
- DELETE /grants/:id
- POST /jobs/:id/actions
- GET /jobs/:id/history
- GET /health

GET /check should accept both userId/jobId and user_id/job_id. Return allowed, reason, user, job, action, and allowedUsers. allowedUsers must be calculated with the same permission engine for active users.

POST /grants:

- only Admin may grant
- reject missing identities
- reject non-admin grantor
- reject admin self-grant
- reject admin-role grants through the normal API
- record grant creation

DELETE /grants/:id:

- only Admin may revoke
- set active to zero
- retain the row
- record revocation

POST /jobs/:id/actions:

~~~text
{ "userId": "maker1", "action": "prepare" }
~~~

Run canAct server-side. Denials return HTTP 403 with a reason and create a denied audit record. Successful changes and history commit together.

Authentication is deliberately out of scope. Request user IDs are demo identity selectors, not production authentication.

## Jobs-for-me

Filter in SQL and use indexes. Do not load all 200,000 jobs into application memory.

The list must align with current eligibility:

- Makers see Confirmed/New/Reopened work they own or are scoped to prepare.
- Checkers see Prepared work to check and Checked work to file when assigned or scoped.
- Client users see their client jobs but cannot perform internal workflow actions.
- Absent users receive an empty work list.
- The action endpoint always rechecks permission.

## Frontend

Serve public/index.html through Express at http://localhost:3000. Never open the HTML directly using file:// because API requests will fail.

Layout:

1. Header with title, person selector, and Load jobs.
2. Two-column main area:
   - left jobs card
   - right Actions card
3. Audit History table below.

Jobs card:

- top-left selected person and role, for example Maya [Maker + Checker]
- top-right large bold count
- filters for Client, Branch, Status, Direction, and Mode
- approximately ten visible rows with scrolling and sticky header
- columns: Job No., Client ID, Branch, Mode, Direction, Current Stage, Next Action
- display J1, J3, etc.
- LCL and FCL uppercase; Air title case
- clicking a job number selects it and opens its history
- no history button in every row

Actions card:

- always show Prepare, Check, File, Cancel, and Reopen
- applicable action is blue/clickable
- non-applicable action remains clickable but is greyed out; do not strike it out
- click any action: call GET /check first
- if denied, show a red notification with a short code, reason, and exact allowed users
- if allowed, call POST /jobs/:id/actions, show completion, remove the job from the visible list, and refresh history

Use the font stack:

~~~css
-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif
~~~

Show a clear in-page error if the API cannot be reached, telling the user to start the server.

## Seed and scale

Small seed:

- 5 branches
- 10 clients
- 20 users
- 300 jobs
- all directions, modes, and stages
- required personas and grants
- 300 initial history records

npm run seed must safely rebuild the demo database in a transaction. In development, use an explicit reset/schema command or DROP/CREATE of only the NFPL tables; never delete an unrelated database. Do not use SQLite WAL/SHM cleanup logic.

Scale:

- 500 users
- 200,000 jobs
- 5 branches
- multiple clients
- imports and exports
- Air, FCL, LCL
- multiple stages
- deterministic generation
- benchmark an indexed jobs-for-me query

## Tests

Use node:test. Cover:

1. Maker/checker conflict
2. Absent owner
3. Changed responsibility
4. Filed-job cancel/reopen
5. Admin self-escalation
6. Overnight parser
7. Grant and revoke
8. Scope matching
9. Unauthorized actions
10. Job history
11. Jobs-for-me consistency
12. Invalid requests

Run:

~~~text
npm test
~~~

## Documentation

DESIGN.md must answer all 14 questions from the brief:

1. Visibility versus action permission.
2. Multiple roles and scope.
3. Maker/checker separation.
4. Absence.
5. Responsibility changes.
6. Filed cancellation and reopening.
7. Client users.
8. Admin repairs and self-escalation.
9. Overnight parser.
10. Explain why one user can act and another cannot.
11. Historical investigation.
12. Adding new roles.
13. Jobs-for-me consistency.
14. Fail-closed behavior.

README.md must include setup, seed, scale, API endpoints, plain-language user access, demo steps, and the localhost warning.

## Build order

1. Read ASSIGNMENT_BRIEF.md, AGENTS.md, PROJECT_STATUS.md, and this handoff.
2. Inspect repository before editing.
3. Install dependencies and configure scripts.
4. Implement schema and indexes.
5. Implement canAct and unit tests.
6. Implement history and transactions.
7. Implement APIs.
8. Implement seed data and grants.
9. Add all tests and fix failures.
10. Add scale generator and benchmark.
11. Build the dashboard.
12. Add filters, actions, notifications, and audit table.
13. Complete README and DESIGN.
14. Run clean-start verification and update PROJECT_STATUS.md.

## Commands

~~~bash
npm install
createdb nfpl_access
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/nfpl_access
npm test
npm run seed
npm start
~~~

The exact PostgreSQL credentials are environment-specific. Document macOS, Linux, and Docker setup options in README.md without committing secrets.

Open http://localhost:3000 and keep the terminal running. If the browser says the site cannot be reached, the server is stopped.

Scale:

~~~bash
npm run scale
~~~

## Five-minute demo

1. Start the server.
2. Select Maya and load jobs.
3. Show filters and the bold job count.
4. Select a job and show its stage, next action, and Audit History.
5. Click the allowed action and show completion plus removal from the list.
6. Click a grey action and show the reason code, explanation, and allowed-user list.
7. Select Ravi and show restricted Client 2 / Branch 2 / Import work.
8. Show an audit row with timestamp, user, action, decision, and reason.
9. Run the scale generator and state the benchmark.

Key message:

> The system explains why access is allowed or denied, who is allowed, and what happened afterward.

## Acceptance checklist

- [ ] Required stack only.
- [ ] All required files exist.
- [ ] Six database areas exist with foreign keys and indexes.
- [ ] canAct returns allowed and reason.
- [ ] Multiple scoped grants work.
- [ ] Maker/checker separation works.
- [ ] Absence fails closed.
- [ ] Client restrictions work.
- [ ] Admin self-escalation is blocked.
- [ ] Parser is import-only.
- [ ] Filed/cancelled/reopened rules work.
- [ ] All mutations and denied attempts are audited.
- [ ] Jobs-for-me is SQL-filtered and consistent.
- [ ] Filters work.
- [ ] Grey actions explain denial when clicked.
- [ ] Allowed-user list is shown.
- [ ] Audit table shows timestamps.
- [ ] Seed is reproducible.
- [ ] Scale reaches 200,000 jobs.
- [ ] npm test passes.
- [ ] Localhost startup works.
- [ ] README and DESIGN are complete.

