import { recordHistory } from '../history.js';
import { transaction } from '../services/transaction.js';
import { findUser, insertUser, listUsers, renameUser, updateUser as updateUserRecord } from '../models/userModel.js';
import { fail } from '../utils/http.js';

const ROLES = ['maker', 'checker', 'filer', 'admin', 'client', 'system'];

export async function getUsers(req, res) {
  res.json({ users: await listUsers(req.app.locals.db) });
}

export async function createUser(req, res, next) {
  try {
    const { actorId, id, name, role, clientId = null, branchId = null, direction = null, active = true, absent = false } = req.body;
    const db = req.app.locals.db;
    const actor = await findUser(db, actorId);
    if (!actor || actor.role !== 'admin') return fail(res, 403, 'Only an admin may create users.');
    if (!id || !name || !ROLES.includes(role)) return fail(res, 400, 'id, name, and a valid role are required.');
    if (active === true && absent === true) return fail(res, 400, 'A user cannot be both active and absent.');
    const result = await transaction(db, async client => {
      const created = await insertUser(client, [id, name, role, clientId, branchId, direction, absent === true ? false : Boolean(active), Boolean(absent)]);
      await recordHistory(client, { actorId: actor.id, targetUserId: id, action: 'user_created', changeDetails: JSON.stringify(req.body), allowed: true, reason: 'Admin created user.' });
      return created;
    });
    res.status(201).json({ user: result });
  } catch (error) { next(error); }
}

export async function updateUser(req, res, next) {
  try {
    const db = req.app.locals.db;
    const actor = await findUser(db, req.body.actorId);
    const target = await findUser(db, req.params.id);
    if (!actor || actor.role !== 'admin') return fail(res, 403, 'Only an admin may update users.');
    if (!target) return fail(res, 404, 'User not found.');
    const allowed = { name: 'name', role: 'role', clientId: 'client_id', branchId: 'branch_id', direction: 'direction', active: 'active', absent: 'absent' };
    const fields = Object.keys(allowed).filter(key => Object.prototype.hasOwnProperty.call(req.body, key));
    const newId = String(req.body.id || target.id).trim();
    if (!newId) return fail(res, 400, 'Employee code is required.');
    if (req.body.role && !ROLES.includes(req.body.role)) return fail(res, 400, 'Invalid role.');
    if (req.body.active === true && req.body.absent === true) return fail(res, 400, 'A user cannot be both active and absent.');
    if (newId !== target.id && await findUser(db, newId)) return fail(res, 409, 'That employee code is already in use.');
    if (req.body.absent === true) { if (!fields.includes('active')) fields.push('active'); req.body.active = false; }
    if (req.body.active === true) { if (!fields.includes('absent')) fields.push('absent'); req.body.absent = false; }
    if (!fields.length && newId === target.id) return fail(res, 400, 'No supported user fields supplied.');
    const result = await transaction(db, async client => {
      let updated;
      if (newId !== target.id) await renameUser(client, target.id, newId);
      if (fields.length) updated = await updateUserRecord(client, newId, Object.fromEntries(fields.map(key => [allowed[key], req.body[key]])));
      else updated = await findUser(client, newId);
      await recordHistory(client, { actorId: actor.id === target.id ? newId : actor.id, targetUserId: newId, action: 'user_updated', previousState: JSON.stringify(target), newState: JSON.stringify(updated), changeDetails: JSON.stringify({ ...req.body, id: newId }), allowed: true, reason: 'Admin updated user profile, employee code, or access.' });
      return updated;
    });
    res.json({ user: result });
  } catch (error) { next(error); }
}
