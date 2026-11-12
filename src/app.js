import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiRouter } from './routes/apiRoutes.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export function createApp(db) {
  const app = express();
  app.locals.db = db;
  app.use(express.json());
  app.use(express.static(path.join(dirname, '..', 'public')));
  app.get('/health', (_, res) => res.json({ ok: true }));
  app.use(createApiRouter());
  app.use((error, _req, res, _next) => res.status(500).json({ error: error.message || 'Internal server error.' }));
  return app;
}
