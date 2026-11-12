# NFPL Access Control Service

## Run

```sh
npm install
createdb nfpl
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/nfpl
npm run seed
npm start
```

The application uses PostgreSQL through the `pg` connection pool. Set `DATABASE_URL` for the local PostgreSQL instance before running the seed or server commands. The schema is initialized automatically. This is a deliberate deviation from the supplied assignment brief, which specified SQLite.

Open http://localhost:3000. The demo uses request-supplied IDs as identity selectors; this is explicitly not authentication.

Important endpoints: `GET /jobs/for-me/:userId`, `GET /check?userId=...&jobId=...&action=...`, `POST /jobs/:id/actions`, `GET /jobs/:id/history`, `POST /grants`, and `DELETE /grants/:id`.

Sample access list:

- Asha has role Admin for any client, any branch, any direction, and any mode.
- Maya has role Maker for any client, any branch, any direction, and any mode; she is also Checker for Client 1 and for Client 2 imports.
- Ravi Checker has role Checker for Client 2, Branch 2, imports only, any mode.
- Absent Owner has role Maker for any client, Branch 1, any direction, and any mode, but is absent and cannot act.
- Client User has role ClientViewer for Client 1, any branch, direction, and mode.
- Overnight Parser has role System for import jobs only; it cannot perform human workflow actions.

The seeded PostgreSQL demo also creates 45 scoped permission users: for each of Mumbai, Delhi, Nagpur, Pune, and Gujrat there is a Maker, Checker, and Filer for Import, Export, and Both directions. “Both” is represented by separate Import and Export grants. These users are visible in Asha's Admin Controls tab.

Branches are Mumbai (B1), Delhi (B2), Nagpur (B3), Pune (B4), and Gujrat (B5).

## What each user can do

- **Asha [Admin]:** may prepare, check, file, cancel, and reopen jobs. She can create and revoke grants for other users, but cannot grant herself a new role. Every administrative change is audited.
- **Maya [Maker + Checker]:** may prepare jobs for any client, branch, direction, and mode. She may check only Client 1 jobs and Client 2 import jobs. She cannot check a job she prepared herself.
- **Ravi [Restricted Checker]:** may check Client 2 imports at the Delhi branch only. He cannot check other clients, branches, or exports. He can file work assigned to him after it has been checked.
- **Absent Owner [Maker]:** has a Maker assignment, but absence blocks every action until the user becomes active.
- **Client User [ClientViewer]:** may follow Client 1 jobs but cannot perform internal workflow actions.
- **Overnight Parser [System]:** is a background account, not a dashboard user. It may import incoming shipment data and cannot check, file, cancel, or reopen jobs.

The dashboard shows one person for each required access pattern. Redundant role variants were removed from the visible selector; the required distinctions are represented by Maya's multiple grants and Ravi's restricted grant.

The sample JSON files under `data/` document the core persona dataset; `npm run seed` generates the reproducible PostgreSQL demo dataset with 51 users, 300 jobs, and the grants above.

## Verification

`npm test` runs the permission scenarios. `npm run scale` creates a deterministic 500-user/200,000-job PostgreSQL dataset and reports insertion/query timings.
