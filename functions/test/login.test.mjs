import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHandle } from '../login.mjs';
const user = { uid: 'private-id', email: 'private@example.com', disabled: false };

test('handle resolution returns email only after password and account ID verification', async () => {
  const result = await resolveHandle({ handle: '@USER', password: 'correct' }, {
    lookup: async handle => { assert.equal(handle, 'user'); return user; },
    verify: async (email, password) => { assert.equal(email, user.email); assert.equal(password, 'correct'); return { localId: user.uid, email, idToken: 'not-returned', refreshToken: 'not-returned' }; },
  });
  assert.deepEqual(result, { email: user.email });
});
test('unknown users, wrong passwords, disabled users, MFA and wrong-project IDs disclose no email', async () => {
  const cases = [
    { lookup: async () => null, verify: async () => null },
    { lookup: async () => user, verify: async () => null },
    { lookup: async () => ({ ...user, disabled: true }), verify: async () => null },
    { lookup: async () => user, verify: async () => ({ localId: user.uid, email: user.email, idToken: 'token', mfaPendingCredential: 'mfa-required' }) },
    { lookup: async () => user, verify: async () => ({ localId: 'wrong-project', email: user.email, idToken: 'token' }) },
  ];
  for (const dependencies of cases) await assert.rejects(resolveHandle({ handle: 'user', password: 'invalid' }, dependencies), { message: 'invalid-login' });
});
test('malformed identifiers and excessive password payloads are rejected before lookup', async () => {
  const dependencies = { lookup: async () => { throw new Error('lookup must not run'); }, verify: async () => null };
  for (const data of [{ handle: '../profiles', password: 'x' }, { handle: 'user', password: '' }, { handle: 'user', password: 'x'.repeat(4097) }]) await assert.rejects(resolveHandle(data, dependencies), { message: 'invalid-login' });
});
