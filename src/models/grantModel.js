export async function listActiveGrants(db, userId) {
  return (await db.query('SELECT * FROM grants WHERE grantee_id=$1 AND active=TRUE', [userId])).rows;
}

export async function listGrants(db) {
  return (await db.query("SELECT g.*,u.name grantee_name,a.name grantor_name,c.name client_name,b.name branch_name FROM grants g JOIN users u ON u.id=g.grantee_id JOIN users a ON a.id=g.grantor_id LEFT JOIN clients c ON c.id=g.client_id LEFT JOIN branches b ON b.id=g.branch_id ORDER BY g.active DESC,g.id")).rows;
}

export async function createGrant(db, values) {
  return (await db.query('INSERT INTO grants(grantee_id,grantor_id,role,action,client_id,branch_id,direction,mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', values)).rows[0];
}

export async function revokeGrant(db, id, actorId) {
  await db.query('UPDATE grants SET active=FALSE,revoked_at=CURRENT_TIMESTAMP,revoked_by=$1 WHERE id=$2', [actorId, id]);
}

export async function findGrant(db, id) {
  return (await db.query('SELECT * FROM grants WHERE id=$1', [id])).rows[0];
}
