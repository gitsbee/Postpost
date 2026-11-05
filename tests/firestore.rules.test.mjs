import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, collection, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';

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
test('author can edit and erase content, but cannot hard delete', async () => {
  const ref = doc(writer(), 'posts/first');
  await setDoc(ref, validPost());
  await assertSucceeds(updateDoc(ref, { body: '수정', tags: [], updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { authorId: 'someone-else', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(environment.authenticatedContext('stranger').firestore(), 'posts/first'), { body: '남의 글 수정', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { body: '', tags: [], deleted: true, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { body: '복원', deleted: false, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(ref));
});
test('unrelated collections are inaccessible', async () => {
  await assertFails(setDoc(doc(writer(), 'private/first'), { text: 'private' }));
  await assertFails(getDoc(doc(writer(), 'private/first')));
});

async function changeReaction(uid, next) {
  const store = environment.authenticatedContext(uid).firestore();
  const ref = doc(store, 'posts/first/reactions', uid);
  const stat = doc(store, 'posts/first/stats/reactions');
  await runTransaction(store, async tx => {
    const before = await tx.get(ref);
    const counts = await tx.get(stat);
    const kind = before.data()?.kind;
    if (next) tx.set(ref, { kind: next, name: uid }); else tx.delete(ref);
    tx.set(stat, {
      likes: (counts.data()?.likes || 0) - (kind === 'like' ? 1 : 0) + (next === 'like' ? 1 : 0),
      dislikes: (counts.data()?.dislikes || 0) - (kind === 'dislike' ? 1 : 0) + (next === 'dislike' ? 1 : 0),
    });
  });
}
test('reaction create, switch and cancel maintain public counts with private identities', async () => {
  await setDoc(doc(writer(), 'posts/first'), validPost());
  await assertSucceeds(changeReaction('reader', 'like'));
  await assertSucceeds(changeReaction('reader', 'dislike'));
  const anon = environment.unauthenticatedContext().firestore();
  const counts = await assertSucceeds(getDoc(doc(anon, 'posts/first/stats/reactions')));
  if (counts.data().likes !== 0 || counts.data().dislikes !== 1) throw new Error('Incorrect counts');
  await assertFails(getDocs(collection(anon, 'posts/first/reactions')));
  const reader = environment.authenticatedContext('reader').firestore();
  await assertSucceeds(getDoc(doc(reader, 'posts/first/reactions/reader')));
  await assertFails(getDocs(collection(reader, 'posts/first/reactions')));
  const stranger = environment.authenticatedContext('stranger').firestore();
  await assertFails(getDoc(doc(stranger, 'posts/first/reactions/reader')));
  await assertSucceeds(getDocs(collection(writer(), 'posts/first/reactions')));
  await assertSucceeds(changeReaction('reader', null));
  const empty = await getDoc(doc(anon, 'posts/first/stats/reactions'));
  if (empty.data().likes !== 0 || empty.data().dislikes !== 0) throw new Error('Cancel failed');
});
test('standalone reaction writes, other-user writes and forged counts are denied', async () => {
  await setDoc(doc(writer(), 'posts/first'), validPost());
  const reader = environment.authenticatedContext('reader').firestore();
  await assertFails(setDoc(doc(reader, 'posts/first/reactions/reader'), { name: 'reader', kind: 'like' }));
  await assertFails(setDoc(doc(reader, 'posts/first/stats/reactions'), { likes: 100, dislikes: 0 }));
  await assertSucceeds(changeReaction('reader', 'like'));
  await assertFails(deleteDoc(doc(reader, 'posts/first/reactions/reader')));
  await assertFails(setDoc(doc(reader, 'posts/first/reactions/someone-else'), { name: 'fake', kind: 'dislike' }));
  await assertFails(setDoc(doc(reader, 'posts/first/stats/reactions'), { likes: -1, dislikes: 0 }));
});
test('reposts reference live originals, cannot form chains, and can be removed and restored', async () => {
  await setDoc(doc(writer(), 'posts/first'), validPost());
  const reader = environment.authenticatedContext('reader').firestore();
  const ref = doc(reader, 'posts/repost_reader_first');
  const data = { body: '', tags: [], kind: 'repost', originalId: 'first', deleted: false, authorId: 'reader', authorName: 'reader', createdAt: serverTimestamp() };
  await assertFails(setDoc(doc(reader, 'posts/arbitrary-id'), data));
  await assertSucceeds(setDoc(ref, data));
  await assertFails(setDoc(doc(reader, 'posts/repost_reader_repost_reader_first'), { ...data, originalId: 'repost_reader_first' }));
  await assertFails(setDoc(doc(reader, 'posts/repost_reader_missing'), { ...data, originalId: 'missing' }));
  await assertSucceeds(updateDoc(ref, { body: '', tags: [], deleted: true, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { deleted: false, createdAt: serverTimestamp() }));
  await updateDoc(doc(writer(), 'posts/first'), { body: '', tags: [], deleted: true, updatedAt: serverTimestamp() });
  await assertFails(changeReaction('reader', 'like'));
  await assertFails(setDoc(doc(environment.authenticatedContext('other').firestore(), 'posts/repost_other_first'), { ...data, authorId: 'other' }));
});
