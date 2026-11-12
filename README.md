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

Open http://localhost:3000. The demo uses request-supplied IDs as identity selectors; this is explicitly not authentication.

The application uses PostgreSQL through the `pg` connection pool. The schema is initialized automatically. This is a deliberate deviation from the PDF, which permits any storage but the earlier workspace brief specified SQLite.

## Sample users

There are two branches: Mumbai and Delhi. Each branch has Import and Export teams. Each team has a Maker, Checker, and Filer, plus one Admin:

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
| Admin | ADM | All | All | Admin |

All operational users initially have access to all 10 clients within their branch and direction. Client restrictions remain supported by nullable client scopes in grants and the user-management API.

## Workflow

`Confirmed -> Prepared -> Checked -> Filed`. Jobs may also be Cancelled or Reopened. Makers can prepare only, Checkers can check only, Filers can file only, and Admin can perform administrative workflow actions. Branch, direction, client scope, role, stage, active status, and absence are all enforced. Unknown or invalid requests fail closed.

Confirmation is treated as job creation/system setup because the assignment does not define a separate confirmation role.

## API

- `GET /health`
- `GET /users`
- `POST /users` — admin-only user creation
- `PATCH /users/:id` — admin-only profile/access update
- `GET /users/:id/history` — audit history for administrative changes
- `GET /jobs/for-me/:userId`
- `GET /check?userId=...&jobId=...&action=...`
- `POST /jobs/:id/actions`
- `GET /jobs/:id/history`
- `POST /grants`
- `DELETE /grants/:id`

All SQL is parameterized. User changes and grant changes are transactional with append-only history records. Admins cannot change their own access or status through the user-management API.

## Demo

1. Select `MIM` and load jobs; show that only Mumbai Import jobs can be prepared.
2. Select `MIC`; show that only prepared Mumbai Import jobs can be checked.
3. Select `MIF`; show that only checked Mumbai Import jobs can be filed.
4. Select `DIC` and try a Mumbai or Export job; show the human-readable denial reason.
5. Select `ADM`, open Admin Controls, and review all 13 users, their role, branch, direction, client scope, status, and assignment instructions.
6. Select a job and show its append-only Audit History.

## Verification

`npm test` runs the permission scenarios. `npm run seed` creates the 13-user sample data. `npm run scale` creates a deterministic 500-user/200,000-job PostgreSQL dataset and reports insertion/query timings.
