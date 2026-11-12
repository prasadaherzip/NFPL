# NFPL Access Control Service

NFPL is a customs-brokerage access-control service. It decides who may perform an action on a shipment job, explains the decision, shows jobs relevant to a person, and records audit history.

The implementation uses Node.js, Express, PostgreSQL via `pg`, plain HTML/CSS/JavaScript, and the Node.js built-in test runner. The assignment allows any language, framework, and storage choice; PostgreSQL was selected for the relational permission and audit model.

## Run locally

Requirements: Node.js 18+ and PostgreSQL.

```sh
npm install
createdb nfpl
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/nfpl
export JWT_SECRET=replace-with-a-long-random-secret
npm run seed
npm test
npm start
```

Open <http://localhost:3000>. The schema is initialized automatically. `npm run seed` creates the reproducible demonstration dataset and replaces the contents of the selected database, so run it only against a disposable development/demo database.

The demo profile selector remains for presentation views, but protected API actions use the authenticated JWT identity rather than trusting a different selected employee.

## Authentication

Employees log in with their employee code, such as `MIM`, `KRC`, or `PAM`. Seeded users initially use their branch name as the password (`Mumbai`, `Kolkata`, `Pune`, etc.). Users without a single branch use `All branches`; the parser uses `System`. Passwords are stored as scrypt hashes, and successful login returns an HS256 JWT in an HTTP-only cookie. Set a strong `JWT_SECRET` outside local development.

## Backend structure

The backend uses ES modules and MVC separation: PostgreSQL queries live under `src/models`, request use cases under `src/controllers`, HTTP mappings under `src/routes`, shared transaction utilities under `src/services`, and application/server bootstrap in `src/app.js` and `src/server.js`. Existing routes and frontend behavior are unchanged.

## Assignment requirements covered

The service provides:

- access management for users and scoped grants;
- action decisions with human-readable explanations;
- jobs waiting for a person through `GET /jobs/for-me/:userId`;
- audit events for workflow, grant, and user-management operations;
- deliberate sample data for the awkward cases in the brief;
- a deterministic 500-user/200,000-job scale generator;
- automated permission tests using `node:test`;
- a plain browser dashboard for the five-minute walkthrough.

The current audit also identified follow-up work before production use: employee-code changes currently rewrite history references, and the jobs-for-me SQL should be made exactly equivalent to action authorization. These are documented in `PROJECT_STATUS.md` and should not be represented as production-grade audit guarantees.

## Data model and workflow

Each job belongs to one client, branch, direction, and mode. Its normal lifecycle is:

```text
Confirmed -> Prepared -> Checked -> Filed
                 |           |
                 +-----------+-> Reopened
                              |
                              +-> Cancelled
```

The permission engine is centralized in `src/permissions.js`. It evaluates role, active/absent status, client, branch, direction, mode, job stage, assignment, maker/checker separation, and active grants. It fails closed for unknown users, jobs, actions, scopes, or states.

Roles are:

- Maker: prepares jobs.
- Checker: checks jobs, may cancel under the policy, and may send prepared/checked jobs back for preparation.
- Filer: files checked jobs.
- Client user: follows jobs for their own client but cannot perform internal workflow actions.
- Admin: manages users and access and may perform operational job actions to repair workflow state.
- System parser: performs only the explicitly allowed overnight import operation.

## Sample data

The seed creates five branches, ten clients, 18 users, 309 jobs, grants, and initial job-history events. Standard Maker/Checker/Filer teams are provided for Mumbai and Delhi; the other branches are used for restricted and edge-case examples.

| Name | Code | Access in plain terms |
|---|---|---|
| Mumbai Import Maker | `MIM` | Maker for Mumbai, Import, all ten clients. |
| Mumbai Import Checker | `MIC` | Checker for Mumbai, Import, all ten clients. |
| Mumbai Import Filer | `MIF` | Filer for Mumbai, Import, all ten clients. |
| Mumbai Export Maker/Checker/Filer | `MEM`, `MEC`, `MEF` | The corresponding role for Mumbai, Export, all ten clients. |
| Delhi Import Maker/Checker/Filer | `DIM`, `DIC`, `DIF` | The corresponding role for Delhi, Import, all ten clients. |
| Delhi Export Maker/Checker/Filer | `DEM`, `DEC`, `DEF` | The corresponding role for Delhi, Export, all ten clients. |
| All-Branch Maker | `ABM` | Maker across all branches and directions; Checker only for selected clients. |
| Kolkata Restricted Checker | `KRC` | Checker only for Client 1, Kolkata, Import. |
| Pune Absent Maker | `PAM` | Maker scope exists for Pune, but absence prevents action. |
| Nagpur Client User | `NCU` | Read/follow access only for Client 2 in Nagpur. |
| Admin | `ADM` | Administrative access and bounded operational repair access. |
| Overnight Parser | `PAR` | System identity limited to approved import behavior. |

Load the sample data with one command:

```sh
npm run seed
```

Generate the assignment scale case with:

```sh
npm run scale
```

The scale script creates 500 users and 200,000 jobs and measures insertion plus an indexed query. It also rebuilds the selected database, so use a separate scale database.

## API

- `POST /auth/login` - employee-code and branch-password JWT login.
- `GET /auth/me` - current authenticated employee.
- `POST /auth/logout` - clear the HTTP-only JWT cookie.
- `GET /health` - service health check.
- `GET /users` - users and their scopes.
- `POST /users` - admin-only user creation.
- `PATCH /users/:id` - admin-only profile/access update.
- `POST /jobs` - admin-only job creation and assignment.
- `GET /users/:id/history` - user-related audit events.
- `GET /grants?actorId=ADM` - admin-only grant listing.
- `POST /grants` - admin-only scoped grant creation.
- `DELETE /grants/:id?actorId=ADM` - grant revocation.
- `GET /jobs/for-me/:userId` - jobs visible/actionable for a selected demo identity.
- `GET /check?userId=...&jobId=...&action=...` - permission decision, reason, and active allowed users.
- `POST /jobs/:id/actions` - rechecks and performs a permitted workflow action.
- `GET /jobs/:id/history` - job audit history.

All SQL uses parameters. State changes and their audit inserts are performed in transactions. Access changes are read on each request, so active grant revocation takes effect without restarting the service.

## Answers to the 14 design questions

### 1. Should everyone see everything? If not, who sees what? How does that differ from who may act?

No. Staff see jobs assigned to them or matching an active, scoped grant. A client user sees jobs for their own client and permitted branch. Admins can view active-client and active-branch jobs. Visibility and action are separate: a person may see a job for operational awareness while the permission engine denies the requested action because of role, stage, scope, absence, or maker/checker separation.

### 2. How would you describe someone who is a Maker for every client but a Checker for only a few? What about a Checker for one client at one branch, but only for imports?

Access is represented by a primary user role plus additive grants. A Maker grant with null client scope means all clients within its other scopes. Separate Checker grants restrict the same person to the selected clients. A checker limited to one client, one branch, and imports has a grant with `client_id`, `branch_id`, and `direction = import`; omitted fields mean any value, not an empty scope.

### 3. What if the person who prepared a checklist is also qualified to approve it?

Maker/checker separation wins. The user recorded as `maker_id` cannot check that same job, even if the user has a matching Checker grant. The decision returns an explicit separation-denial reason.

### 4. What if the person responsible for a job is absent?

An absent or inactive user cannot act. The job remains auditable and visible to an explicitly authorized replacement or another matching grant. Absence does not silently rewrite the original assignment or history.

### 5. What happens to jobs a person is halfway through when responsibilities change?

Existing ownership and history remain recorded. Every new action is authorized against the current user status, role, scope, grant, assignment, and job stage. An administrator must make an explicit reassignment where policy allows; past audit events are not supposed to be rewritten.

### 6. Who should be able to cancel a filed job or reopen a closed one? What should it take?

Normal filed jobs are immutable for prepare, check, and file actions. Cancellation is restricted to the checker/admin policy, and reopening is restricted to an admin policy. Each permitted transition is transactional and records actor, previous stage, new stage, reason, and timestamp. The endpoint rejects invalid stage transitions.

### 7. What if a client’s own employee needs to follow their shipments?

Use the Client user role with a client and optional branch scope. The user can follow jobs for that client, but cannot prepare, check, file, cancel, or reopen internal workflow jobs unless a future policy explicitly adds a narrowly scoped action.

### 8. What if an admin needs to fix a stuck job? What if an admin tries to make themselves more powerful?

Admins can manage users/access and perform operational repair actions. Admin management operations are audited. The ordinary grant API rejects admin self-granting and rejects grants that assign the admin role. Admin authority is intentionally bounded by the explicit action policy.

### 9. How should an automated parser that creates and updates jobs overnight be treated?

The parser is a system account, not a human employee. It receives only an explicit import capability and cannot check, file, cancel, reopen, or impersonate a human. Parser actions must use the same history mechanism as other state changes.

### 10. How do you answer “why can she do this and he can’t?”

Every permission check returns `allowed` plus a human-readable reason. The reason identifies the relevant role/grant/scope or the denial cause, such as inactive status, wrong branch, wrong stage, missing grant, or maker/checker separation. The UI displays the decision and, where useful, the active users who could perform that action.

### 11. How do you answer “who could have changed this job on the 3rd?”

Job history records the actor, action, previous state, new state, permission decision, reason, and timestamp. The job-history endpoint shows the recorded actor and job reference. The permission-check endpoint can evaluate which active users could perform a specified action under current policy; historical investigations should use the recorded history and the access state available for the relevant time.

### 12. How would a new kind of role be introduced next quarter while engineering is busy?

Represent roles and scoped grants as data, keep the policy mapping small and centralized, add the new action/state rules to the permission engine, and add focused tests. Avoid adding authorization logic to individual routes. A production version would add migrations and an admin-managed policy registry with review controls.

### 13. How do you make sure a person’s “jobs waiting for me” count matches what they can actually do?

The jobs-for-me query is intended to filter by active user state, role, assignment, active grant, job stage, scope, and maker/checker separation. The action endpoint always rechecks the centralized permission engine immediately before changing state, because queues can become stale. The current audit identified that the assigned-maker/checker SQL paths need tightening so role, branch, direction, and current grant changes cannot leave stale jobs in the queue.

### 14. What should happen when your system is unsure?

Fail closed. Missing identity, unknown action, missing job, inactive client/branch, absent user, invalid stage, unclear scope, or any other uncertainty denies the action or returns a validation error. The response includes a safe reason without exposing secrets.

## Five-minute demo

1. Select `MIM`; filter Mumbai/Import jobs and show that it can prepare eligible jobs.
2. Select `MIC`; show a prepared job that it can check and a maker/checker conflict that it cannot check.
3. Select `MIF`; show that only checked jobs can be filed.
4. Select `KRC`; demonstrate denial for a non-Kolkata, non-Import, or non-Client-1 job.
5. Select `PAM`; show that absence produces no actionable jobs.
6. Select `NCU`; show Client 2/Nagpur visibility and disabled internal actions.
7. Select `ADM`; open Admin Controls, update a profile or access field, and show the audit event.
8. Select a job and show its history, including actor, action, state transition, decision, reason, and timestamp.

## Verification

Run:

```sh
npm test
node --check src/server.js
node --check src/permissions.js
npm run seed
npm run scale
```

The permission suite currently passes 11 tests. Seed and scale require a reachable PostgreSQL database. Live HTTP smoke testing should verify `/health`, users, grants, jobs-for-me, permission checks, workflow actions, grant revocation, and history on a normal local environment.

See [DESIGN.md](DESIGN.md) for the shorter architecture summary and [PROJECT_STATUS.md](PROJECT_STATUS.md) for implementation status, known gaps, and verification history.
