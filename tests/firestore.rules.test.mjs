import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

let environment;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run npm run test:rules to start the emulator.');
  environment = await initializeTestEnvironment({
    projectId: 'demo-postpost',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => environment.clearFirestore());
after(async () => environment?.cleanup());

const validPost = () => ({ body: '오늘의 작은 이야기', authorId: 'writer', authorName: '글쓴이', createdAt: serverTimestamp() });
const writer = () => environment.authenticatedContext('writer').firestore();

test('authenticated author can publish and anonymous visitors can read', async () => {
  await assertSucceeds(setDoc(doc(writer(), 'posts/first'), validPost()));
  await assertSucceeds(getDoc(doc(environment.unauthenticatedContext().firestore(), 'posts/first')));
});
test('anonymous visitors cannot publish', async () => {
  await assertFails(setDoc(doc(environment.unauthenticatedContext().firestore(), 'posts/first'), validPost()));
});
test('authors cannot impersonate another UID', async () => {
  await assertFails(setDoc(doc(writer(), 'posts/first'), { ...validPost(), authorId: 'someone-else' }));
});
test('empty, whitespace-only, non-string and oversized bodies are rejected', async () => {
  for (const body of ['', '  \n\t', 123, '가'.repeat(2001)]) {
    await assertFails(setDoc(doc(writer(), 'posts/first'), { ...validPost(), body }));
  }
  await assertSucceeds(setDoc(doc(writer(), 'posts/limit'), { ...validPost(), body: '가'.repeat(2000) }));
});
test('extra fields and missing fields are rejected', async () => {
  await assertFails(setDoc(doc(writer(), 'posts/extra'), { ...validPost(), isAdmin: true }));
  const missing = validPost();
  delete missing.authorName;
  await assertFails(setDoc(doc(writer(), 'posts/missing'), missing));
});
test('client timestamps and invalid author names are rejected', async () => {
  await assertFails(setDoc(doc(writer(), 'posts/date'), { ...validPost(), createdAt: Timestamp.fromMillis(0) }));
  for (const authorName of ['', '가'.repeat(31), 123]) {
    await assertFails(setDoc(doc(writer(), 'posts/name'), { ...validPost(), authorName }));
  }
});
test('even the author cannot edit or delete posts', async () => {
  const ref = doc(writer(), 'posts/first');
  await setDoc(ref, validPost());
  await assertFails(updateDoc(ref, { body: '수정' }));
  await assertFails(deleteDoc(ref));
});
test('unrelated collections are inaccessible', async () => {
  await assertFails(setDoc(doc(writer(), 'private/first'), { text: 'private' }));
  await assertFails(getDoc(doc(writer(), 'private/first')));
});
