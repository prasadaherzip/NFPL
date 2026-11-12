# Design

The service separates visibility from action authorization. Jobs-for-me is an indexed operational list based on ownership and basic scope; every requested action is re-evaluated by the centralized permission engine. Denials return a human-readable reason and authorization fails closed when identity, scope, state, or role is uncertain.

Roles are maker, checker, admin, client, and system. Grants are additive and may be scoped by client, branch, direction, and mode. A maker cannot check their own job. Absent users cannot act, and explicit owner assignments prevent a changed responsibility from silently granting the former owner access. Client users remain within their client. Admin actions are bounded; the normal grant API prevents self-granting and admin grants.

Filed jobs cannot be prepared, checked, or filed again. Cancellation is limited to checker/admin policy and reopening is admin-only. The overnight parser is a system account with import-only behavior. Permission reasons are persisted with history so an operator can understand a decision later. History is append-only and state changes plus history are transactional.

The demo has no authentication middleware; user IDs in URLs/bodies are a deliberate demonstration shortcut and must be replaced by verified session identity in production. SQLite indexes cover ownership, work queues, grants, and history. The scale generator uses SQL predicates rather than scanning all jobs in JavaScript.

## Answers to the 14 design questions

1. Not everyone sees everything. Staff see assigned or scoped operational work; client users see their own client; action permission is evaluated separately and can deny a visible job.
2. A person has a primary staff identity plus additive grants. A global Maker assignment and scoped Checker grants model Maya; nullable client/branch/direction/mode fields mean “any”.
3. The maker/checker rule wins: the person recorded as maker cannot check that job, even if a Checker grant matches.
4. Absence immediately removes action eligibility. The job remains auditable and can be reassigned explicitly by an authorised administrator.
5. Existing assignments remain recorded, but every new action is checked against current active responsibility and the recorded maker/checker IDs. Responsibility changes do not rewrite history.
6. Cancellation is restricted to checker/admin policy; reopening is admin-only. Filed-job changes are explicit actions and always create history.
7. A client-side user is a read/follow user restricted to that client and cannot perform internal maker/checker workflow actions.
8. Admins can repair approved workflow state, but the grant endpoint rejects self-escalation and admin-role grants. All such changes are audited.
9. The overnight parser is a non-human system identity with import-only capability. It cannot check, file, cancel, reopen, or act as a human.
10. The permission result includes a stable human-readable reason naming the matching grant, scope, separation rule, absence, or denial.
11. The append-only history records actor, action, state transition, permission decision, reason, and timestamp; it supports “who could have changed it” investigations.
12. New roles should be represented as data-driven grants/actions plus a small policy mapping, with focused tests and no route-level authorization duplication.
13. Jobs-for-me is filtered in SQL using the same role, scope, stage, assignment, absence, and maker/checker constraints that the permission engine applies. The action endpoint still rechecks at execution time.
14. Uncertainty fails closed with a reason. Unknown users, jobs, actions, inactive entities, absent users, and invalid state transitions are denied or rejected.

Access changes are immediate: active grants are read on each request and revocations set `active=FALSE` transactionally. PostgreSQL indexes support the 200,000-job scale target. The demo frontend is intentionally simple; grant management is provided through the API.

## PostgreSQL migration

The user requested PostgreSQL instead of the SQLite stack specified by the assignment. The implementation uses the `pg` pool, `DATABASE_URL`, PostgreSQL constraints and indexes, parameterized `$1` queries, and transactions that include both job state changes and audit-history writes. The frontend and permission behavior remain unchanged.

The seed also includes a distinct Filer role. A Filer can file checked jobs only, and branch/direction scope is represented as Import, Export, or two grants for Both.

## Current specification reconciliation

The PDF describes five branches and asks for about twenty deliberate users. The corrected user-provided specification now defines five branches, standard teams only for Mumbai and Delhi, and 18 users: twelve standard users plus ABM, KRC, PAM, NCU, ADM, and PAR. The current seed follows that corrected model. The PDF's core workflow and edge cases remain implemented. `ASSIGNMENT_BRIEF.md` was present in the workspace despite the pasted instruction saying it was missing; the PDF was read and its discrepancy is documented here.

Confirmation is treated as job creation/system setup because no separate confirmation role is defined. Client scope is initially all ten clients for standard teams and can be narrowed later through admin-managed grants. ABM's checker grants are limited to selected clients; KRC is limited to one client, branch, and direction; NCU is restricted to one client and branch.
