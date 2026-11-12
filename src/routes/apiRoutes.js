import { Router } from 'express';
import { checkJobAction, createAdminJob, getAllJobs, getJobsForUser, performJobAction } from '../controllers/jobController.js';
import { addGrant, getGrants, removeGrant } from '../controllers/grantController.js';
import { getJobHistory, getUserHistory } from '../controllers/historyController.js';
import { createUser, getUsers, updateUser } from '../controllers/userController.js';
import { asyncRoute } from '../utils/http.js';

export function createApiRouter() {
  const router = Router();
  router.get('/users', asyncRoute(getUsers));
  router.post('/users', asyncRoute(createUser));
  router.patch('/users/:id', asyncRoute(updateUser));
  router.get('/jobs/all', asyncRoute(getAllJobs));
  router.post('/jobs', asyncRoute(createAdminJob));
  router.get('/jobs/for-me/:userId', asyncRoute(getJobsForUser));
  router.get('/check', asyncRoute(checkJobAction));
  router.post('/jobs/:id/actions', asyncRoute(performJobAction));
  router.get('/jobs/:id/history', asyncRoute(getJobHistory));
  router.get('/users/:id/history', asyncRoute(getUserHistory));
  router.get('/grants', asyncRoute(getGrants));
  router.post('/grants', asyncRoute(addGrant));
  router.delete('/grants/:id', asyncRoute(removeGrant));
  return router;
}
