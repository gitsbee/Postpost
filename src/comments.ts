import type { User } from 'firebase/auth';
import { collection, doc, increment, runTransaction, serverTimestamp, updateDoc, type DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import type { Post } from './model';
export type Comment = Pick<Post, 'id' | 'body' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt' | 'deleted'>;
export function newCommentRef(postId: string) {
  if (!db) throw new Error('Missing database');
  return doc(collection(db, 'posts', postId, 'comments'));
}
export async function createComment(postId: string, ref: DocumentReference, user: User, body: string) {
  if (!db) return;
  const parent = doc(db, 'posts', postId); const stats = doc(parent, 'stats', 'comments');
  await runTransaction(db, async tx => {
    const post = await tx.get(parent); const existing = await tx.get(ref);
    if (!post.exists() || post.data().deleted) throw new Error('Post deleted');
    if (existing.exists()) {
      if (existing.data().authorId === user.uid && existing.data().body === body.trim() && !existing.data().deleted) return;
      throw new Error('Comment conflict');
    }
    tx.set(ref, { body: body.trim(), authorId: user.uid, authorName: user.displayName?.trim().slice(0, 30) || '작성자', createdAt: serverTimestamp(), deleted: false });
    // Merge preserves the counter base; the per-comment read makes retries idempotent.
    tx.set(stats, { count: increment(1), lastCommentId: ref.id }, { merge: true });
  });
}
export async function editComment(postId: string, comment: Comment, body: string) {
  if (db) await updateDoc(doc(db, 'posts', postId, 'comments', comment.id), { body: body.trim(), updatedAt: serverTimestamp() });
}
export async function deleteComment(postId: string, comment: Comment) {
  if (!db) return;
  const ref = doc(db, 'posts', postId, 'comments', comment.id); const stats = doc(db, 'posts', postId, 'stats', 'comments');
  await runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (!existing.exists() || existing.data().deleted) return;
    tx.update(ref, { body: '', deleted: true, updatedAt: serverTimestamp() });
    tx.set(stats, { count: increment(-1), lastCommentId: ref.id }, { merge: true });
  });
}
