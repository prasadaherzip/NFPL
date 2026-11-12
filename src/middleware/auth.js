import { findLoginUser } from '../models/authModel.js';
import { verifyJwt } from '../services/authService.js';

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(value => {
    const index = value.indexOf('=');
    return [value.slice(0, index).trim(), decodeURIComponent(value.slice(index + 1).trim())];
  }));
}

export async function requireAuth(req, res, next) {
  const token = cookies(req).nfpl_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const claims = verifyJwt(token);
  const user = claims ? await findLoginUser(req.app.locals.db, claims.sub) : null;
  if (!user || !user.active) return res.status(401).json({ error: 'Login required.' });
  req.authUser = user;
  next();
}

export function requireSelectedUser(req, res, next) {
  const selected = req.body?.userId || req.body?.actorId || req.query?.userId || req.query?.user_id || req.params?.userId;
  if (selected && selected !== req.authUser.id) return res.status(403).json({ error: 'The selected user does not match the authenticated employee.' });
  next();
}
