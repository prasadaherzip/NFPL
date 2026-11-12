import { canAct } from '../permissions.js';
import { recordHistory } from '../history.js';
import { createGrant, listActiveGrants } from '../models/grantModel.js';
import { createJob, findJob, listAllJobs, listJobsForUser, nextJobReference, updateJobStage } from '../models/jobModel.js';
import { findUser } from '../models/userModel.js';
import { transaction } from '../services/transaction.js';
import { fail } from '../utils/http.js';

const STAGES = ['confirmed', 'new', 'prepared', 'checked', 'filed', 'cancelled', 'reopened'];
const ACTIONS = { maker: 'prepare', checker: 'check', filer: 'file' };

export async function getAllJobs(req, res) {
  res.json({ jobs: await listAllJobs(req.app.locals.db) });
}

export async function getJobsForUser(req, res) {
  const db = req.app.locals.db;
  const user = await findUser(db, req.params.userId);
  if (!user) return fail(res, 404, 'User not found.');
  if (!user.active || user.absent) return res.json({ user: { id: user.id, name: user.name }, jobs: [] });
  res.json({ user: { id: user.id, name: user.name }, jobs: await listJobsForUser(db, user) });
}

export async function createAdminJob(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { actorId, reference = null, clientId, branchId, direction, mode, stage = 'new', assigneeId } = req.body;
    const actor = await findUser(db, actorId);
    const assignee = await findUser(db, assigneeId);
    if (!actor || actor.role !== 'admin') return fail(res, 403, 'Only an admin may create jobs.');
    if (!assignee) return fail(res, 404, 'Assigned employee not found.');
    if (!['maker', 'checker', 'filer'].includes(assignee.role)) return fail(res, 400, 'The assigned employee must have a Maker, Checker, or Filer role.');
    if (!clientId || !branchId || !['import', 'export'].includes(direction) || !['air', 'fcl', 'lcl'].includes(mode) || !STAGES.includes(stage)) return fail(res, 400, 'Client, branch, direction, mode, and a valid stage are required.');
    const result = await transaction(db, async client => {
      await client.query('SELECT pg_advisory_xact_lock(731204);');
      const jobReference = await nextJobReference(client, reference);
      const makerId = assignee.role === 'maker' ? assignee.id : null;
      const checkerId = assignee.role === 'checker' ? assignee.id : null;
      const created = await createJob(client, [jobReference, clientId, branchId, direction, mode, stage, makerId, checkerId]);
      await recordHistory(client, { actorId: actor.id, jobId: created.id, action: 'job_created', newState: stage, changeDetails: JSON.stringify(req.body), allowed: true, reason: 'Admin created and assigned a job.' });
      const action = ACTIONS[assignee.role];
      const grant = await createGrant(client, [assignee.id, actor.id, assignee.role, action, clientId, branchId, direction, mode]);
      await recordHistory(client, { actorId: actor.id, jobId: created.id, grantId: grant.id, action: 'grant_created', newState: 'active', changeDetails: JSON.stringify({ employeeId: assignee.id, role: assignee.role, action }), allowed: true, reason: `Admin assigned ${assignee.role} permission for this job.` });
      return created;
    });
    res.status(201).json({ job: result, assignedRole: assignee.role });
  } catch (error) { next(error); }
}

export async function checkJobAction(req, res) {
  const db = req.app.locals.db;
  const userId = req.query.userId || req.query.user_id;
  const jobId = req.query.jobId || req.query.job_id;
  const [user, job] = await Promise.all([findUser(db, userId), findJob(db, jobId)]);
  if (!user || !job) return fail(res, 404, 'User or job not found.');
  const decision = canAct(user, req.query.action, job, await listActiveGrants(db, user.id));
  const candidates = (await db.query('SELECT * FROM users WHERE active=TRUE AND absent=FALSE ORDER BY name')).rows;
  const allowedUsers = [];
  for (const candidate of candidates) if (canAct(candidate, req.query.action, job, await listActiveGrants(db, candidate.id)).allowed) allowedUsers.push({ id: candidate.id, name: candidate.name, role: candidate.role });
  res.json({ allowed: decision.allowed, reason: decision.reason, user: user.name, job: job.reference, action: req.query.action, allowedUsers });
}

export async function performJobAction(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { userId, action } = req.body;
    const [user, job] = await Promise.all([findUser(db, userId), findJob(db, req.params.id)]);
    if (!user || !job) return fail(res, 404, 'User or job not found.');
    const decision = canAct(user, action, job, await listActiveGrants(db, user.id));
    if (!decision.allowed) { await recordHistory(db, { actorId: user.id, jobId: job.id, action, previousState: job.stage, newState: job.stage, allowed: false, reason: decision.reason }); return fail(res, 403, decision.reason, { allowed: false, reason: decision.reason }); }
    const nextStage = { prepare: 'prepared', check: 'checked', file: 'filed', cancel: 'cancelled', reopen: 'reopened', send_back: 'reopened' }[action] || job.stage;
    await transaction(db, async client => { await updateJobStage(client, job.id, nextStage); await recordHistory(client, { actorId: user.id, jobId: job.id, action, previousState: job.stage, newState: nextStage, allowed: true, reason: decision.reason }); });
    res.json({ allowed: true, job: await findJob(db, job.id), reason: decision.reason });
  } catch (error) { next(error); }
}
