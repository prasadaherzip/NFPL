import { jobHistory, userHistory } from '../models/historyModel.js';
import { findJob } from '../models/jobModel.js';
import { findUser } from '../models/userModel.js';
import { fail } from '../utils/http.js';

export async function getJobHistory(req, res) {
  const db = req.app.locals.db;
  if (!await findJob(db, req.params.id)) return fail(res, 404, 'Job not found.');
  res.json({ history: await jobHistory(db, req.params.id) });
}

export async function getUserHistory(req, res) {
  const db = req.app.locals.db;
  if (!await findUser(db, req.params.id)) return fail(res, 404, 'User not found.');
  res.json({ history: await userHistory(db, req.params.id) });
}
