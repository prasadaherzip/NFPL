export async function findJob(db, id) {
  return (await db.query('SELECT j.*, c.active client_active, b.active branch_active FROM jobs j JOIN clients c ON c.id=j.client_id JOIN branches b ON b.id=j.branch_id WHERE j.id=$1', [id])).rows[0];
}

export async function listAllJobs(db) {
  return (await db.query('SELECT j.*,c.name client_name,b.name branch_name FROM jobs j JOIN clients c ON c.id=j.client_id JOIN branches b ON b.id=j.branch_id WHERE c.active=TRUE AND b.active=TRUE ORDER BY j.updated_at DESC')).rows;
}

export async function listJobsForUser(db, user) {
  return (await db.query(`SELECT DISTINCT j.*,c.name client_name,b.name branch_name FROM jobs j JOIN clients c ON c.id=j.client_id JOIN branches b ON b.id=j.branch_id LEFT JOIN grants g ON g.grantee_id=$1 AND g.active=TRUE AND (g.client_id IS NULL OR g.client_id=j.client_id) AND (g.branch_id IS NULL OR g.branch_id=j.branch_id) AND (g.direction IS NULL OR g.direction=j.direction) AND (g.mode IS NULL OR g.mode=j.mode) WHERE c.active=TRUE AND b.active=TRUE AND ($2='admin' OR (j.maker_id=$1 AND j.stage IN ('confirmed','new','reopened')) OR (j.checker_id=$1 AND j.stage IN ('prepared','checked') AND j.maker_id<>$1) OR (g.action='prepare' AND g.role='maker' AND j.stage IN ('confirmed','new','reopened')) OR (g.action='check' AND g.role='checker' AND j.stage='prepared' AND (j.maker_id IS NULL OR j.maker_id<>$1)) OR (g.action='file' AND g.role='filer' AND j.stage='checked') OR (j.stage NOT IN ('cancelled') AND $2='client' AND j.client_id=$3 AND ($4::text IS NULL OR j.branch_id=$4))) ORDER BY j.updated_at DESC`, [user.id, user.role, user.client_id || '', user.branch_id || null])).rows;
}

export async function createJob(db, values) {
  return (await db.query('INSERT INTO jobs(reference,client_id,branch_id,direction,mode,stage,maker_id,checker_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', values)).rows[0];
}

export async function nextJobReference(db, fallbackReference) {
  const nextId = (await db.query('SELECT COALESCE(MAX(id),0)+1 AS next_id FROM jobs')).rows[0].next_id;
  return fallbackReference || `JOB-${String(nextId).padStart(4, '0')}`;
}

export async function updateJobStage(db, id, stage) {
  return (await db.query('UPDATE jobs SET stage=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [stage, id])).rows[0];
}
