import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { readProfile, type Profile } from '../profiles';
import type { Post } from '../model';

// One listener per distinct author in the currently loaded feed.
export function useAuthorProfiles(posts: Post[]) {
  const ids = JSON.stringify([...new Set(posts.map(post => post.authorId))].sort());
  const [profiles, setProfiles] = useState(new Map<string, Profile>());
  useEffect(() => {
    if (!db) return;
    const stops = (JSON.parse(ids) as string[]).map(uid => onSnapshot(doc(db!, 'profiles', uid), snapshot => {
      const profile = readProfile(uid, snapshot.data());
      setProfiles(previous => { const next = new Map(previous); if (profile) next.set(uid, profile); else next.delete(uid); return next; });
    }, () => { /* Legacy accounts remain searchable by their stored name. */ }));
    return () => stops.forEach(stop => stop());
  }, [ids]);
  return profiles;
}
