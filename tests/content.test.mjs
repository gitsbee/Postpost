import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTags, matchesSearch } from '../src/content.mjs';

test('hashtags handle Korean, numbers, case normalization and deduplication', () => {
  assert.deepEqual(extractTags('오늘 #일상 #React #react #2026 #밑줄_태그'), ['일상', 'react', '2026', '밑줄_태그']);
  assert.deepEqual(extractTags('word#not-tag # #a-b'), ['a']);
  assert.equal(extractTags(Array.from({length:15},(_,i)=>`#tag${i}`).join(' ')).length,10);
  assert.deepEqual(extractTags('#'+'가'.repeat(31)),[]);
});
test('search uses all words and exact normalized hashtag matches', () => {
  const post={body:'오늘은 React 공부 #개발 #React',authorName:'비비',tags:[]};
  assert.equal(matchesSearch(post,'react 비비'),true);
  assert.equal(matchesSearch(post,'#react'),true);
  assert.equal(matchesSearch(post,'#개'),false);
  assert.equal(matchesSearch(post,'#개발 없는말'),false);
  assert.equal(matchesSearch(post,'   '),true);
});

test('current handles can be searched exactly without exposing internal account IDs', () => {
  const post = { body: 'hello', authorName: '새 이름', authorHandle: 'my_handle', tags: [] };
  assert.equal(matchesSearch(post, '@MY_HANDLE'), true);
  assert.equal(matchesSearch(post, '@my'), false);
  assert.equal(matchesSearch(post, '새 이름'), true);
});
