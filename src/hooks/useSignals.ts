import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { readPost, type Post } from '../model';
export type ActivityKind = 'like' | 'dislike' | 'repost';
export type ActivityItem = { id: string; post: Post; kind: ActivityKind };
export function usePopularity(posts: Post[], enabled: boolean) {
  const [scores, setScores] = useState(new Map<string, number>());
  const ids = JSON.stringify(posts.filter(post => !post.deleted && post.kind === 'post').map(post => post.id));
  useEffect(() => {
    if (!db || !enabled) return;
    const stops = (JSON.parse(ids) as string[]).map(id => onSnapshot(doc(db!, 'posts', id, 'stats', 'reactions'), snapshot => setScores(previous => new Map(previous).set(id, (snapshot.data()?.likes || 0) - (snapshot.data()?.dislikes || 0))), () => {}));
    return () => stops.forEach(stop => stop());
  }, [ids, enabled]);
  return [...posts].filter(post => !post.deleted && post.kind === 'post').sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0) || (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
}
export function useActivity(posts: Post[], uid: string | undefined, enabled: boolean) {
  const [owner, setOwner] = useState(uid);
  const [legacy, setLegacy] = useState(new Map<string, ActivityKind>());
  const [stored, setStored] = useState<ActivityItem[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const ids = JSON.stringify(posts.filter(post => !post.deleted && post.kind === 'post').map(post => post.id));
  useEffect(() => {
    setOwner(uid); setLegacy(new Map()); setStored([]); setError('');
    if (!db || !uid || !enabled) return;
    let generation = 0; let alive = true; let activityStops: Array<() => void> = []; setLoading(true);
    const stops = (JSON.parse(ids) as string[]).map(id => onSnapshot(doc(db!, 'posts', id, 'reactions', uid), snapshot => {
      setLegacy(previous => { const next = new Map(previous); const kind = snapshot.data()?.kind; if (kind === 'like' || kind === 'dislike') next.set(id, kind); else next.delete(id); return next; });
    }, () => {}));
    const stopActivity = onSnapshot(query(collection(db, 'users', uid, 'activity'), orderBy('updatedAt', 'desc'), limit(100)), snapshot => {
      const attempt = ++generation; activityStops.forEach(stop => stop()); activityStops = [];
      const resolved = new Map<string, ActivityItem>(); setStored([]); setLoading(snapshot.size > 0);
      let pending = snapshot.size;
      for (const item of snapshot.docs) {
        const value = item.data();
        if (typeof value.postId !== 'string' || value.postId.includes('/') || !['like', 'dislike', 'repost'].includes(value.kind)) { if (--pending === 0) setLoading(false); continue; }
        let post: Post | null = null; let sharedPost: Post | null = null; let validSource = false; let postLoaded = false; let sourceLoaded = false; let counted = false;
        const publish = () => {
          if (!alive || generation !== attempt) return;
          const visible = value.kind === 'repost' ? sharedPost : post;
          if (visible && !visible.deleted && validSource) resolved.set(item.id, { id: value.postId, post: visible, kind: value.kind }); else resolved.delete(item.id);
          setStored(snapshot.docs.flatMap(doc => resolved.has(doc.id) ? [resolved.get(doc.id)!] : []));
          if (postLoaded && sourceLoaded && !counted) { counted = true; if (--pending === 0) setLoading(false); }
        };
        const failed = () => { if (alive && generation === attempt) { setError('활동을 불러오지 못했어요. 연결과 최신 규칙을 확인해 주세요.'); setLoading(false); } };
        activityStops.push(onSnapshot(doc(db!, 'posts', value.postId), current => { post = readPost(current); postLoaded = true; publish(); }, failed));
        const source = value.kind === 'repost' ? doc(db!, 'posts', `repost_${uid}_${value.postId}`) : doc(db!, 'posts', value.postId, 'reactions', uid);
        activityStops.push(onSnapshot(source, current => { if (value.kind === 'repost') sharedPost = readPost(current); validSource = current.exists() && (value.kind === 'repost' ? !current.data().deleted : current.data().kind === value.kind); sourceLoaded = true; publish(); }, failed));
      }
    }, () => { setError('활동을 불러오지 못했어요. 최신 규칙을 확인해 주세요.'); setLoading(false); });
    return () => { alive = false; activityStops.forEach(stop => stop()); stops.forEach(stop => stop()); stopActivity(); };
  }, [ids, uid, enabled]);
  const merged = new Map<string, ActivityItem>();
  stored.forEach(item => merged.set(`${item.kind}:${item.id}`, item));
  posts.forEach(post => {
    const kind = legacy.get(post.id);
    if (!post.deleted && kind) merged.set(`${kind}:${post.id}`, { id: post.id, post, kind });
    if (!post.deleted && post.kind === 'repost' && post.authorId === uid) {
      const id = post.originalId || post.id;
      if (!merged.has(`repost:${id}`)) merged.set(`repost:${id}`, { id, post, kind: 'repost' });
    }
  });
  return { items: owner === uid ? [...merged.values()] : [], error: owner === uid ? error : '', loading: loading || Boolean(enabled && owner !== uid) };
}
