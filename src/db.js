const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
function openDatabase(filename = path.join(dataDir, 'nfpl.db')) {
  const db = new Database(filename); db.pragma('foreign_keys = ON'); db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)));
CREATE TABLE IF NOT EXISTS branches (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)));
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN('maker','checker','admin','client','system')), client_id TEXT REFERENCES clients(id), branch_id TEXT REFERENCES branches(id), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), absent INTEGER NOT NULL DEFAULT 0 CHECK(absent IN(0,1)), system_account INTEGER NOT NULL DEFAULT 0 CHECK(system_account IN(0,1)));
CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, reference TEXT NOT NULL UNIQUE, client_id TEXT NOT NULL REFERENCES clients(id), branch_id TEXT NOT NULL REFERENCES branches(id), direction TEXT NOT NULL CHECK(direction IN('import','export')), mode TEXT NOT NULL CHECK(mode IN('air','fcl','lcl')), stage TEXT NOT NULL CHECK(stage IN('confirmed','new','prepared','checked','filed','cancelled','reopened')), maker_id TEXT REFERENCES users(id), checker_id TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS grants (id INTEGER PRIMARY KEY, grantee_id TEXT NOT NULL REFERENCES users(id), grantor_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL CHECK(role IN('maker','checker','admin')), action TEXT NOT NULL, client_id TEXT REFERENCES clients(id), branch_id TEXT REFERENCES branches(id), direction TEXT CHECK(direction IN('import','export')), mode TEXT CHECK(mode IN('air','fcl','lcl')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT, revoked_by TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), job_id INTEGER REFERENCES jobs(id), grant_id INTEGER REFERENCES grants(id), action TEXT NOT NULL, previous_state TEXT, new_state TEXT, permission_allowed INTEGER NOT NULL CHECK(permission_allowed IN(0,1)), permission_reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_jobs_work ON jobs(stage,branch_id,client_id,direction,mode); CREATE INDEX IF NOT EXISTS idx_jobs_owners ON jobs(maker_id,checker_id); CREATE INDEX IF NOT EXISTS idx_grants_effective ON grants(grantee_id,active,role,action); CREATE INDEX IF NOT EXISTS idx_history_job ON history(job_id,created_at);`);
  db.exec(`INSERT INTO history(actor_id,job_id,action,previous_state,new_state,permission_allowed,permission_reason) SELECT COALESCE(j.maker_id,'admin'),j.id,'job_created',NULL,j.stage,1,'Initial sample job creation.' FROM jobs j WHERE NOT EXISTS (SELECT 1 FROM history h WHERE h.job_id=j.id);`);
  return db;
}
module.exports = { openDatabase, dataDir };
