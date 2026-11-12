export async function jobHistory(db, jobId) {
  return (await db.query('SELECT h.*,u.name actor_name,t.name target_user_name,j.reference job_reference FROM history h JOIN users u ON u.id=h.actor_id LEFT JOIN users t ON t.id=h.target_user_id LEFT JOIN jobs j ON j.id=h.job_id WHERE h.job_id=$1 ORDER BY h.id', [jobId])).rows;
}

export async function userHistory(db, userId) {
  return (await db.query('SELECT h.*,u.name actor_name,t.name target_user_name,j.reference job_reference FROM history h JOIN users u ON u.id=h.actor_id LEFT JOIN users t ON t.id=h.target_user_id LEFT JOIN jobs j ON j.id=h.job_id WHERE h.target_user_id=$1 OR h.actor_id=$1 ORDER BY h.id', [userId])).rows;
}
