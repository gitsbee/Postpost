import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHandle, validateProfile, validSocialUrl } from '../src/profileValidation.mjs';

test('handles normalize and have a clear case-insensitive format', () => {
  assert.equal(normalizeHandle(' @My_Name '), 'my_name');
  assert.equal(validateProfile('이름', 'my_name', '', []), null);
  for (const handle of ['ab', '1name', 'with space', 'name-with-dash', '가나다', 'a'.repeat(21)]) {
    assert.ok(validateProfile('이름', handle, '', []));
  }
});
test('profile biographies and safe unique social links respect boundaries', () => {
  assert.equal(validateProfile('이름', 'my_name', '가'.repeat(1000), ['https://example.com/me']), null);
  assert.ok(validateProfile('이름', 'my_name', '가'.repeat(1001), []));
  for (const link of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'not a url']) assert.equal(validSocialUrl(link), false);
  assert.ok(validateProfile('이름', 'my_name', '', Array.from({length:6},(_,i)=>`https://example.com/${i}`)));
  assert.ok(validateProfile('이름', 'my_name', '', ['https://example.com', 'https://example.com']));
});
