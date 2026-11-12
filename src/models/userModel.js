export async function findUser(db, id) {
  return (await db.query('SELECT * FROM users WHERE id=$1', [id])).rows[0];
}

export async function listUsers(db) {
  return (await db.query("SELECT u.id,u.name,u.role,u.client_id,u.branch_id,u.direction,u.active,u.absent,u.system_account,c.name client_name,b.name branch_name FROM users u LEFT JOIN clients c ON c.id=u.client_id LEFT JOIN branches b ON b.id=u.branch_id ORDER BY CASE u.role WHEN 'admin' THEN 1 WHEN 'maker' THEN 2 WHEN 'checker' THEN 3 WHEN 'filer' THEN 4 WHEN 'client' THEN 5 WHEN 'system' THEN 6 ELSE 7 END,u.name")).rows;
}

export async function insertUser(db, values) {
  return (await db.query('INSERT INTO users(id,name,role,client_id,branch_id,direction,active,absent) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', values)).rows[0];
}

export async function updateUser(db, id, fields) {
  const entries = Object.entries(fields);
  const values = entries.map(([, value]) => value);
  const assignments = entries.map(([key], index) => `${key}=$${index + 1}`).join(',');
  return (await db.query(`UPDATE users SET ${assignments} WHERE id=$${values.length + 1} RETURNING *`, [...values, id])).rows[0];
}

export async function renameUser(db, oldId, newId) {
  await db.query('INSERT INTO users(id,name,role,client_id,branch_id,direction,active,absent,system_account) SELECT $1,name,role,client_id,branch_id,direction,active,absent,system_account FROM users WHERE id=$2', [newId, oldId]);
  await db.query('UPDATE jobs SET maker_id=$1 WHERE maker_id=$2', [newId, oldId]);
  await db.query('UPDATE jobs SET checker_id=$1 WHERE checker_id=$2', [newId, oldId]);
  await db.query('UPDATE grants SET grantee_id=$1 WHERE grantee_id=$2', [newId, oldId]);
  await db.query('UPDATE grants SET grantor_id=$1 WHERE grantor_id=$2', [newId, oldId]);
  await db.query('UPDATE grants SET revoked_by=$1 WHERE revoked_by=$2', [newId, oldId]);
  await db.query('UPDATE history SET actor_id=$1 WHERE actor_id=$2', [newId, oldId]);
  await db.query('UPDATE history SET target_user_id=$1 WHERE target_user_id=$2', [newId, oldId]);
  await db.query('DELETE FROM users WHERE id=$1', [oldId]);
}
