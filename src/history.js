async function recordHistory(db,e){const result=await db.query(`INSERT INTO history(actor_id,job_id,grant_id,action,previous_state,new_state,permission_allowed,permission_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[e.actorId,e.jobId??null,e.grantId??null,e.action,e.previousState??null,e.newState??null,Boolean(e.allowed),e.reason]);return result.rows[0];}
module.exports={recordHistory};
