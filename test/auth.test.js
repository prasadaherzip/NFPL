import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, signJwt, verifyJwt, verifyPassword } from '../src/services/authService.js';

test('passwords are hashed and verified without storing plaintext', async () => {
  const hash = await hashPassword('Mumbai');
  assert.notEqual(hash, 'Mumbai');
  assert.equal(await verifyPassword('Mumbai', hash), true);
  assert.equal(await verifyPassword('Delhi', hash), false);
});

test('JWT claims are signed and expire', () => {
  const token = signJwt({ sub: 'MIM', role: 'maker' }, 60);
  assert.deepEqual(verifyJwt(token)?.sub, 'MIM');
  assert.equal(verifyJwt(`${token}x`), null);
});
