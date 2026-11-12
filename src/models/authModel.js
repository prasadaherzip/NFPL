export async function findLoginUser(db, id) {
  return (await db.query('SELECT u.*,b.name branch_name FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=$1', [id])).rows[0];
}
