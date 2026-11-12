# NFPL Access Control Service

## Run

```sh
npm install
createdb nfpl
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/nfpl
npm run seed
npm test
npm start
```

Open http://localhost:3000. The demo uses request-supplied IDs as identity selectors; this is not production authentication.

The application uses PostgreSQL through the `pg` connection pool. The schema is initialized automatically. This is documented as a deliberate storage choice; the supplied PDF leaves storage open, while the older workspace brief mentioned SQLite.

## Branches and users

There are five branches: Mumbai, Delhi, Kolkata, Pune, and Nagpur. Only Mumbai and Delhi have standard branch-direction teams.

| Name | Code | Branch | Direction | Role |
|---|---|---|---|---|
| Mumbai Import Maker | MIM | Mumbai | Import | Maker |
| Mumbai Import Checker | MIC | Mumbai | Import | Checker |
| Mumbai Import Filer | MIF | Mumbai | Import | Filer |
| Mumbai Export Maker | MEM | Mumbai | Export | Maker |
| Mumbai Export Checker | MEC | Mumbai | Export | Checker |
| Mumbai Export Filer | MEF | Mumbai | Export | Filer |
| Delhi Import Maker | DIM | Delhi | Import | Maker |
| Delhi Import Checker | DIC | Delhi | Import | Checker |
| Delhi Import Filer | DIF | Delhi | Import | Filer |
| Delhi Export Maker | DEM | Delhi | Export | Maker |
| Delhi Export Checker | DEC | Delhi | Export | Checker |
| Delhi Export Filer | DEF | Delhi | Export | Filer |
| All-Branch Maker | ABM | All branches | All directions | Maker |
| Kolkata Restricted Checker | KRC | Kolkata | Import | Checker |
| Pune Absent Maker | PAM | Pune | All directions | Maker, absent |
| Nagpur Client User | NCU | Nagpur | Client 2 | Client user |
| Admin | ADM | All | All | Admin |
| Overnight Parser | PAR | System | Approved parser operations | System |

There are 18 users total. All standard teams initially cover all ten clients within their branch and direction. ABM can prepare across all branches and directions but can check only selected clients. KRC is limited to Client 1, Kolkata, Import. PAM is absent and cannot act. NCU can follow only Client 2 in Nagpur and cannot perform internal workflow actions. PAR is a non-human parser account.

## Workflow and permissions

`Confirmed -> Prepared -> Checked -> Filed`. Jobs may also be Cancelled or Reopened. Makers can prepare only, Checkers can check only, Filers can file only, and Admin can perform administrative workflow actions. Branch, direction, client scope, role, stage, active status, and absence are enforced. The maker/checker separation rule prevents the preparer from checking the same job. Confirmation is treated as job creation/system setup because no separate confirmation role is specified.

## API

- `GET /health`
- `GET /users`
- `POST /users` — admin-only user creation
- `PATCH /users/:id` — admin-only profile/access update
- `GET /users/:id/history` — administrative history
- `GET /grants?actorId=ADM` — admin-only grant listing
- `POST /grants` — admin-only grant creation
- `DELETE /grants/:id?actorId=ADM` — grant revocation
- `GET /jobs/for-me/:userId`
- `GET /check?userId=...&jobId=...&action=...`
- `POST /jobs/:id/actions`
- `GET /jobs/:id/history`

All SQL is parameterized. User and grant changes are transactional with append-only history containing actor, target, change details, reason, and timestamp. ADM can update their own profile/access fields through the audited user-management API; ordinary grant self-escalation remains blocked.

## Demo

1. Select `MIM`; show that only Mumbai Import jobs can be prepared.
2. Select `MIC`; show that only prepared Mumbai Import jobs can be checked.
3. Select `MIF`; show that only checked Mumbai Import jobs can be filed.
4. Select `KRC`; try a non-Kolkata, non-Import, or non-Client-1 job and show the denial reason.
5. Select `PAM`; show that absence removes all actionable jobs.
6. Select `NCU`; show the restricted client-side view and greyed internal actions.
7. Select `ADM`, open Admin Controls, click a user name, edit a profile or ADM's own access, and show the audit history.
8. Select a job and show its append-only history.

## Verification

`npm test` runs the permission scenarios. `npm run seed` creates 18 users, five branches, ten clients, and 300 jobs. `npm run scale` creates a deterministic 500-user/200,000-job PostgreSQL dataset and reports insertion/query timings.
