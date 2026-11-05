import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePost, validateAccount, MAX_POST_LENGTH } from '../src/validation.mjs';

test('posts reject empty and whitespace-only content', () => {
  for (const body of ['', ' ', '\n\t', '\u3000']) assert.ok(validatePost(body));
});
test('posts accept multiline Korean text and enforce the length boundary', () => {
  assert.equal(validatePost('오늘의 생각\n작은 이야기.'), null);
  assert.equal(validatePost('가'.repeat(MAX_POST_LENGTH)), null);
  assert.ok(validatePost('가'.repeat(MAX_POST_LENGTH + 1)));
});
test('posts trim outer whitespace before validation', () => {
  assert.equal(validatePost('  ' + 'a'.repeat(MAX_POST_LENGTH) + '\n'), null);
});
test('signup requires a valid email, 8-character password, and 1–30 character name', () => {
  assert.equal(validateAccount(' user@example.com ', 'password1', '글쓴이', true), null);
  assert.ok(validateAccount('invalid', 'password1', '글쓴이', true));
  assert.ok(validateAccount('user@example.com', 'short', '글쓴이', true));
  assert.ok(validateAccount('user@example.com', 'password1', '  ', true));
  assert.ok(validateAccount('user@example.com', 'password1', '가'.repeat(31), true));
  assert.equal(validateAccount('user@example.com', 'password1', '가'.repeat(30), true), null);
});
test('login accepts existing shorter passwords and requires no nickname', () => {
  assert.equal(validateAccount('user@example.com', '123456', '', false), null);
  assert.ok(validateAccount('user@example.com', '', '', false));
});
