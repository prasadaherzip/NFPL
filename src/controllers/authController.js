import { findLoginUser } from '../models/authModel.js';
import { signJwt, verifyPassword } from '../services/authService.js';
import { fail } from '../utils/http.js';

function cookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `nfpl_token=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export async function login(req, res) {
  const db = req.app.locals.db;
  const { username, password } = req.body;
  const user = await findLoginUser(db, username);
  if (!user || !user.active || !(await verifyPassword(password || '', user.password_hash))) return fail(res, 401, 'Invalid employee code or password.');
  const token = signJwt({ sub: user.id, role: user.role });
  res.setHeader('Set-Cookie', cookie(token, 8 * 60 * 60));
  res.json({ user: { id: user.id, name: user.name, role: user.role, branch_name: user.branch_name } });
}

export async function currentUser(req, res) {
  const user = req.authUser;
  res.json({ user: { id: user.id, name: user.name, role: user.role, branch_name: user.branch_name } });
}

export async function logout(req, res) {
  res.setHeader('Set-Cookie', cookie('', 0));
  res.json({ loggedOut: true });
}

