import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { readPost, errorMessage, type Post } from '../model';
import Modal from './Modal';
import PostCard from './PostCard';

export default function PostDetail({ id, user, onClose, onLogin, onTag }: { id: string; user: User | null; onClose: () => void; onLogin: () => void; onTag: (tag: string) => void }) {
  const [post, setPost] = useState<Post | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true); setPost(null); setError('');
    if (!db || id.includes('/')) { setLoading(false); return; }
    return onSnapshot(doc(db, 'posts', id), snapshot => { setPost(readPost(snapshot)); setLoading(false); }, e => { setError(errorMessage(e)); setLoading(false); });
  }, [id]);
  return <Modal title="포스트 보기" onClose={onClose}>{loading ? <p role="status">불러오는 중…</p> : error ? <p className="error" role="alert">{error}</p> : !post || post.deleted ? <p>삭제되었거나 찾을 수 없는 게시물입니다.</p> : <PostCard key={post.id} post={post} user={user} onLogin={onLogin} onTag={onTag} />}</Modal>;
}
