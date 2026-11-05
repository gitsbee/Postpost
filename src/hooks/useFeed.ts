import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { readPost, errorMessage, type Post } from '../model';

export function useFeed(enabled: boolean) {
  const [size, setSize] = useState(50);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(true);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!db || !enabled) return;
    setLoading(true); setError('');
    return onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(size)), { includeMetadataChanges: true }, snapshot => {
      setPosts(snapshot.docs.map(readPost).filter((post): post is Post => post !== null));
      setMore(snapshot.size === size); setCached(snapshot.metadata.fromCache); setLoading(false);
    }, e => { setError(errorMessage(e)); setLoading(false); });
  }, [enabled, size, attempt]);
  return { posts, loading, cached, error, more, loadMore: () => setSize(value => value + 50), retry: () => setAttempt(value => value + 1) };
}
