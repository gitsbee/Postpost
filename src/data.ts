import type { User } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Post, ReactionKind } from './model';
import { extractTags } from './content.mjs';

export function postLink(id: string) { return `${location.origin}${import.meta.env.BASE_URL}#/posts/${encodeURIComponent(id)}`; }
export async function reactTo(post: Post, user: User, kind: ReactionKind) {
  if (!db) return;
  const postRef = doc(db, 'posts', post.id);
  const reactionRef = doc(postRef, 'reactions', user.uid);
  const statsRef = doc(postRef, 'stats', 'reactions');
  await runTransaction(db, async transaction => {
    const parent = await transaction.get(postRef);
    const before = await transaction.get(reactionRef);
    const counts = await transaction.get(statsRef);
    if (!parent.exists() || parent.data().deleted) throw new Error('Deleted post');
    const old = before.data()?.kind;
    const next = old === kind ? null : kind;
    const likes = (counts.data()?.likes || 0) - (old === 'like' ? 1 : 0) + (next === 'like' ? 1 : 0);
    const dislikes = (counts.data()?.dislikes || 0) - (old === 'dislike' ? 1 : 0) + (next === 'dislike' ? 1 : 0);
    if (next) transaction.set(reactionRef, { name: user.displayName?.trim().slice(0, 30) || '작성자', kind: next });
    else transaction.delete(reactionRef);
    transaction.set(statsRef, { likes, dislikes });
    const activity = doc(db!, 'users', user.uid, 'activity', `reaction_${post.id}`);
    if (next) transaction.set(activity, { postId: post.id, kind: next, updatedAt: serverTimestamp() });
    else transaction.delete(activity);
  });
}
export async function repost(original: Post, user: User, body = '') {
  if (!db) return;
  const ref = doc(db, 'posts', `repost_${user.uid}_${original.id}`);
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(ref);
    const parent = await transaction.get(doc(db!, 'posts', original.id));
    if (!parent.exists() || parent.data().deleted) throw new Error('Deleted original');
    const text = body.trim();
    const data = { body: text, tags: extractTags(text), authorId: user.uid, authorName: user.displayName?.trim().slice(0, 30) || '작성자', createdAt: serverTimestamp(), kind: 'repost', originalId: original.id, deleted: false };
    if (existing.exists()) {
      if (existing.data().deleted) transaction.update(ref, { body: text, tags: data.tags, deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      else transaction.update(ref, { body: text, tags: data.tags, updatedAt: serverTimestamp() });
    } else transaction.set(ref, data);
    transaction.set(doc(db!, 'users', user.uid, 'activity', `repost_${original.id}`), { postId: original.id, kind: 'repost', updatedAt: serverTimestamp() });
  });
}
export async function editPost(post: Post, body: string) {
  if (db) await updateDoc(doc(db, 'posts', post.id), { body: body.trim(), tags: extractTags(body), updatedAt: serverTimestamp() });
}
export async function deletePost(post: Post) {
  if (!db) return;
  await runTransaction(db, async tx => {
    tx.update(doc(db!, 'posts', post.id), { body: '', tags: [], deleted: true, updatedAt: serverTimestamp() });
    if (post.kind === 'repost' && post.originalId) tx.delete(doc(db!, 'users', post.authorId, 'activity', `repost_${post.originalId}`));
  });
}
