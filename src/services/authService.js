import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash?.startsWith('scrypt:')) return false;
  const [, salt, expectedHex] = storedHash.split(':');
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const secret = () => process.env.JWT_SECRET || 'nfpl-development-jwt-secret-change-me';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');

export function signJwt(payload, expiresInSeconds = 8 * 60 * 60) {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds });
  const unsigned = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyJwt(token) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) return null;
  const unsigned = `${header}.${body}`;
  const expected = crypto.createHmac('sha256', secret()).update(unsigned).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}
