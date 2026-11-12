# Handoff: NFPL Access Control Service

This document is the full brief for building a take-home submission for Nagarkot Forwarders Pvt. Ltd. (NFPL). It consolidates the assignment PDF and the planning decisions made so far. Treat it as the source of truth. Where it is silent, make a reasonable assumption, write it down, and say so in the design document.

Stack: **Node.js, Express, SQLite (better-sqlite3), plain HTML/CSS/JavaScript frontend served by Express, node:test for tests.**

Time budget: about 32 hours total.

---

## 1. The problem

NFPL is a customs brokerage with about 120 staff across 5 branches.

- Each shipment is a **job**.
- A job belongs to one **client**, one **branch**, one **direction** (import or export), and one **mode** (air, FCL, or LCL).
- A job moves through stages: **Confirmed → Prepared → Checked → Filed**. It can also be **Cancelled** or **Reopened**.
- Different people do the work at each stage. Some staff handle many clients. Some handle only a narrow slice.
- A filed shipment was altered last month by someone with no business touching it. Nobody could say who had been allowed to, or why.
- Management wants access that is **strict where it matters and still easy to run day to day**.

### Glossary

- **Maker:** prepares the job (documents, checklist).
- **Checker:** reviews and approves what the Maker prepared.
- **Maker/checker rule:** the person who prepared work cannot approve that same work.
- **Filed:** the customs declaration has been submitted to authorities. A significant, formal step.
- **FCL:** Full Container Load. One customer fills a container.
- **LCL:** Less than Container Load. Shipments from several customers share a container.
- **Overnight parser:** an automated process that reads incoming shipment data and creates or updates jobs without a human.

---

## 2. What to build (minimum)

1. Let someone with the right authority **manage who has what** (grant and revoke roles).
2. Answer whether a given person **may perform a given action on a given job**, and **explain the answer**.
3. Show a person **the jobs that need them**.
4. Keep a **history** that supports the audit questions.

The data model, API, roles, permission names, and extra rules are up to us.

**Key design requirement:** the permission check must return `{ allowed: boolean, reason: string }`, not just true or false. The reason is what gets demoed.

---

## 3. Questions the design document must answer

There is no single right answer. Show reasoning and trade-offs. If a question we did not ask seems important, add it and answer it.

1. Should everyone see everything? If not, who sees what? How does that differ from who may act?
2. How do you describe someone who is a Maker for every client but a Checker for only a few? What about someone who is a Checker for one client at one branch, but only for imports?
3. What if the person who prepared a checklist is also qualified to approve it?
4. What if the person responsible for a job is absent?
5. What happens to jobs a person is halfway through when their responsibilities change?
6. Who should be able to cancel a filed job or reopen a closed one? What should it take?
7. What if a client's own employee needs to follow their shipments?
8. What if an admin needs to fix a stuck job? What if an admin tries to make themselves more powerful?
9. How should an automated parser that creates and updates jobs overnight be treated?
10. How do you answer "why can she do this and he can't?"
11. How do you answer "who could have changed this job on the 3rd?"
12. How would a new kind of role be introduced next quarter while engineering is busy?
13. How do you make sure a person's "jobs waiting for me" count matches what they can actually do?
14. What should happen when the system is unsure?

---

## 4. Constraints

- **Scale:** assume 500 users and 200,000 jobs. Lists must stay fast. Do not compute permissions by scanning every job on each request. Filter in SQL and index the columns used.
- **Timing:** changes to access should take effect when people would expect them to. Decide and document this. Suggested: revocations take effect immediately; new grants take effect immediately too, unless there is a reason to delay. Write down the choice.

---

## 5. Sample data (we create it)

Nagarkot provides no dataset. We create a small, deliberate one.

Target size: 5 branches, about 10 clients, 20 users, a few hundred jobs across directions, modes, and stages.

Must include these awkward cases on purpose:

- A Maker everywhere who is a Checker for only a few clients
- A Checker limited to one client, one branch, and imports only
- An absent user
- A client-side user (a client's own employee who follows their shipments)
- An admin
- The overnight parser (a non-human account)

Also provide a **scale generator** that produces 500 users and 200,000 jobs, seeded for repeatability (e.g. a fixed random seed).

The README must state each person's access in plain terms, in this format:

> Person A has role B for client C, branch D, direction E, mode F.

Use "any" or omit the field for unscoped values, and say so.

Suggested files:

```
data/users.json
data/clients.json
data/branches.json
data/jobs.json
data/grants.json
scripts/seed.js            (loads the small sample with one command)
scripts/generate-scale.js  (500 users, 200,000 jobs)
```

---

## 6. Required deliverables

1. **Working code:** runs locally from the README.
2. **Design document:** 2 to 4 pages. Covers model, key decisions, trade-offs, answers to all 14 questions, assumptions, and scope cuts. Save as `DESIGN.md` or a PDF.
3. **Sample data:** loadable with one command, with each person's access written out in the README.
4. **Tests:** automated tests for these edge cases:
   - Maker/checker conflict
   - Absent owner
   - Changed responsibility
   - Filed-job cancel or reopen
   - Admin self-escalation
   - Overnight parser behaviour
5. **Demo:** about 5 minutes, recorded or live. Show the service running, answer "why can she do this and he can't?", and show a job's history.

Where the brief is silent, assume and write it down. If scope must be cut, say what and why.

---

## 7. Suggested architecture

### Stack

- Node.js + Express
- SQLite via `better-sqlite3` (synchronous, simple)
- `node:test` for tests (no extra install)
- Plain HTML, CSS, and JavaScript in `public/`, served by Express

### Layout

```
nfpl-access/
├── package.json
├── README.md
├── DESIGN.md
├── src/
│   ├── server.js         # Express app and routes
│   ├── db.js             # SQLite connection and schema
│   ├── permissions.js    # canAct() returns { allowed, reason }
│   └── history.js        # append-only audit log helpers
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── data/                 # hand-written sample data (JSON)
├── scripts/
│   ├── seed.js
│   └── generate-scale.js
└── test/
    └── permissions.test.js
```

### Suggested data model

- `users` (id, name, kind: staff | client | admin | system, active, absent_until)
- `clients` (id, name)
- `branches` (id, name)
- `jobs` (id, client_id, branch_id, direction, mode, stage, prepared_by, checked_by, filed_by, created_by, updated_at)
- `grants` (id, user_id, role, client_id nullable, branch_id nullable, direction nullable, mode nullable, granted_by, granted_at, revoked_at nullable)
- `history` (id, job_id, actor_id, action, from_stage, to_stage, decision_reason, created_at) — append-only, never updated or deleted

Roles to start with: `Maker`, `Checker`, `Canceller`, `Admin`, `Viewer`, `ClientViewer`, `System`. Adjust as needed and document the choice.

Index: `grants(user_id)`, `jobs(stage)`, `jobs(client_id, branch_id)`, `history(job_id)`.

### Permission check

```javascript
// src/permissions.js
const ACTION_ROLE = { prepare: "Maker", check: "Checker", file: "Checker" };

function canAct(user, action, job, grants) {
  if (user.absent) {
    return { allowed: false, reason: `${user.name} is marked absent` };
  }
  if (action === "check" && job.preparedBy === user.id) {
    return { allowed: false, reason: "Maker cannot check their own work" };
  }

  const needed = ACTION_ROLE[action];
  const match = grants.find(g =>
    g.userId === user.id &&
    g.role === needed &&
    (g.clientId == null || g.clientId === job.clientId) &&
    (g.branchId == null || g.branchId === job.branchId) &&
    (g.direction == null || g.direction === job.direction) &&
    (g.mode == null || g.mode === job.mode)
  );

  if (match) {
    return { allowed: true, reason: `${user.name} is ${needed} for this client, branch, direction and mode` };
  }
  return { allowed: false, reason: `no ${needed} grant covers this job` };
}

module.exports = { canAct };
```

Note: the sketch loads grants into memory. For production-like behaviour, query only the grants for the user (`WHERE user_id = ? AND revoked_at IS NULL`) and evaluate scope in SQL or in a small function. Keep the reason-producing logic either way.

### Jobs-for-me endpoint

```javascript
app.get("/jobs/for-me/:userId", (req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT j.id, j.client_id, j.stage
    FROM jobs j
    JOIN grants g ON g.user_id = ?
      AND g.revoked_at IS NULL
      AND (g.client_id IS NULL OR g.client_id = j.client_id)
      AND (g.branch_id IS NULL OR g.branch_id = j.branch_id)
    WHERE g.role = 'Checker' AND j.stage = 'Prepared'
  `).all(req.params.userId);
  res.json(rows);
});
```

This must match the permission check. The count shown must equal what the person can act on. Ideally both use the same scope-matching logic so they cannot drift apart (question 13). Also exclude absent users and the self-check case, or the count will be wrong.

### Endpoints to provide (minimum)

- `GET /jobs/for-me/:userId`
- `GET /check?user_id=&job_id=&action=` returns `{ allowed, reason }`
- `POST /grants` and `DELETE /grants/:id` (requires an actor with Admin, recorded in history)
- `POST /jobs/:id/actions` (prepare, check, file, cancel, reopen), which runs the permission check, then records history
- `GET /jobs/:id/history`

### Frontend (optional, only after backend and tests pass)

One page with three sections:
1. "Jobs waiting for me" list
2. "Can I act on this job?" form that shows the reason
3. A job's history

Grant management can be done through the API or seed data. State this in the design document.

---

## 8. Running it (target)

```bash
npm init -y
npm install express better-sqlite3
npm test
node scripts/seed.js
node src/server.js
# open http://localhost:3000
node scripts/generate-scale.js   # scale case
```

---

## 9. Build order

1. Schema and `canAct` with reasons, tested on a tiny dataset first.
2. History table, written from the start so every change is recorded.
3. Grant and revoke endpoints, with admin check.
4. Action endpoints that run the check and write history.
5. Jobs-for-me query, aligned with `canAct`.
6. Seed data and README access list.
7. Tests for the six edge cases.
8. Scale generator, then time one list query and note the result.
9. Design document, written alongside the code.
10. Frontend (optional).
11. Deployment (optional, only if everything else is solid; local demo is acceptable).

---

## 10. Scope and optional items

**Must have:** backend core, permission check with reasons, grant management, history, tests for edge cases, seed data, README, local demo.

**Can be simplified:** interface (plain HTML or curl), storage (SQLite), scale case (generate and time one query, no tuning), parser and client user (roles with limited rights, no real parser integration), 14 questions (answer the important ones in depth and briefly note the rest).

**Optional:** a simple frontend, and deployment to Render or Railway. Note in the design document if either is skipped.

Do not integrate with CargoWise, ICEGATE, or any real customs system. Mention them as real-world reference points in the design document only.

---

## 11. Demo script (about 5 minutes)

1. Start the server, show the README access list.
2. Run `/check` for the Maker who is a Checker for some clients, showing a denial with a reason on a job they prepared.
3. Ask "why can she do this and he can't?" and answer from the grants and the reason output.
4. Show a filed job, attempt a cancel as a user without rights, then show the allowed path for an authorised person.
5. Show a job's history and answer "who could have changed this job on the 3rd?" from the history table.
6. Briefly show the scale generator and one timed list query.

---

## 12. Instructions for the builder

- Make reasonable assumptions and record each one in `DESIGN.md`.
- Keep the permission logic in one module, with no duplicated rules across routes.
- Every denial must include a human-readable reason.
- History is append-only. Do not add update or delete paths for it.
- Tests should exercise the permission module directly, not only through HTTP.
- Keep the hand-written sample small enough to check by eye.