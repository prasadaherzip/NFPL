import { Router } from 'express';
import { checkJobAction, createAdminJob, getAllJobs, getJobsForUser, performJobAction } from '../controllers/jobController.js';
import { addGrant, getGrants, removeGrant } from '../controllers/grantController.js';
import { getJobHistory, getUserHistory } from '../controllers/historyController.js';
import { createUser, getUsers, updateUser } from '../controllers/userController.js';
import { currentUser, login, logout } from '../controllers/authController.js';
import { requireAuth, requireSelectedUser } from '../middleware/auth.js';
import { asyncRoute } from '../utils/http.js';

export function createApiRouter() {
  const router = Router();
  router.post('/auth/login', asyncRoute(login));
  router.get('/auth/me', requireAuth, asyncRoute(currentUser));
  router.post('/auth/logout', requireAuth, asyncRoute(logout));
  router.get('/users', requireAuth, asyncRoute(getUsers));
  router.post('/users', requireAuth, requireSelectedUser, asyncRoute(createUser));
  router.patch('/users/:id', requireAuth, requireSelectedUser, asyncRoute(updateUser));
  router.get('/jobs/all', requireAuth, asyncRoute(getAllJobs));
  router.post('/jobs', requireAuth, requireSelectedUser, asyncRoute(createAdminJob));
  router.get('/jobs/for-me/:userId', requireAuth, requireSelectedUser, asyncRoute(getJobsForUser));
  router.get('/check', requireAuth, requireSelectedUser, asyncRoute(checkJobAction));
  router.post('/jobs/:id/actions', requireAuth, requireSelectedUser, asyncRoute(performJobAction));
  router.get('/jobs/:id/history', requireAuth, asyncRoute(getJobHistory));
  router.get('/users/:id/history', requireAuth, asyncRoute(getUserHistory));
  router.get('/grants', requireAuth, asyncRoute(getGrants));
  router.post('/grants', requireAuth, requireSelectedUser, asyncRoute(addGrant));
  router.delete('/grants/:id', requireAuth, requireSelectedUser, asyncRoute(removeGrant));
  return router;
}
