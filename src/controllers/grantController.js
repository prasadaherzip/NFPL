import { recordHistory } from '../history.js';
import { createGrant, findGrant, listGrants, revokeGrant } from '../models/grantModel.js';
import { findUser } from '../models/userModel.js';
import { transaction } from '../services/transaction.js';
import { fail } from '../utils/http.js';

export async function getGrants(req, res) {
  const db = req.app.locals.db;
  const actor = await findUser(db, req.query.actorId);
  if (!actor || actor.role !== 'admin') return fail(res, 403, 'Only an admin may view grants.');
  res.json({ grants: await listGrants(db) });
}

export async function addGrant(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { actorId, granteeId, role, action, clientId = null, branchId = null, direction = null, mode = null } = req.body;
    const [actor, grantee] = await Promise.all([findUser(db, actorId), findUser(db, granteeId)]);
    if (!actor || !grantee) return fail(res, 404, 'Grantor or grantee not found.');
    if (actor.role !== 'admin' || actor.id === grantee.id || role === 'admin') return fail(res, 403, 'Only an admin may grant non-admin access, and admins cannot self-escalate.');
    if (!action) return fail(res, 400, 'action is required.');
    const id = await transaction(db, async client => { const grant = await createGrant(client, [grantee.id, actor.id, role, action, clientId, branchId, direction, mode]); await recordHistory(client, { actorId: actor.id, grantId: grant.id, action: 'grant_created', newState: JSON.stringify(req.body), allowed: true, reason: 'Admin created grant.' }); return grant.id; });
    res.status(201).json({ id });
  } catch (error) { next(error); }
}

export async function removeGrant(req, res, next) {
  try {
    const db = req.app.locals.db;
    const actor = await findUser(db, req.body.actorId || req.query.actorId);
    const grant = await findGrant(db, req.params.id);
    if (!actor || !grant) return fail(res, 404, 'Grant or actor not found.');
    if (actor.role !== 'admin') return fail(res, 403, 'Only an admin may revoke grants.');
    await transaction(db, async client => { await revokeGrant(client, grant.id, actor.id); await recordHistory(client, { actorId: actor.id, grantId: grant.id, action: 'grant_revoked', previousState: 'active', newState: 'revoked', allowed: true, reason: 'Admin revoked grant.' }); });
    res.json({ revoked: true });
  } catch (error) { next(error); }
}
