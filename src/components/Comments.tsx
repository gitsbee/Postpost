import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { dateLabel, errorMessage, readPost, type Post } from '../model';
import { createComment, deleteComment, editComment, newCommentRef, type Comment } from '../comments';
import { MAX_COMMENT_LENGTH, validateComment } from '../validation.mjs';
import { useProfile } from '../hooks/useProfile';
import Identity from './Identity';
import Icon from './Icon';
import PostMenu from './PostMenu';

function CommentItem({ postId, comment, user }: { postId: string; comment: Comment; user: User | null }) {
  const { profile: author } = useProfile(comment.authorId);
  const [editing, setEditing] = useState(false); const [body, setBody] = useState(comment.body); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const id = useId();
  useEffect(() => setBody(comment.body), [comment.body]);
  useEffect(() => { if (editing) document.getElementById(id)?.focus(); }, [editing, id]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const invalid = validateComment(body); if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    try { await editComment(postId, comment, body); setEditing(false); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  async function remove() {
    if (busy || !confirm('이 댓글을 삭제할까요?')) return;
    setBusy(true); setError('');
    try { await deleteComment(postId, comment); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  return <article className="comment" aria-label={`${author?.name || comment.authorName}의 댓글`}><div className="comment-heading"><div><Identity uid={comment.authorId} fallback={comment.authorName} /><span className="post-time">{dateLabel(comment.createdAt)}{comment.updatedAt ? ' · 수정됨' : ''}</span></div>{user?.uid === comment.authorId && <PostMenu label="댓글 메뉴" iconOnly><button disabled={busy} onClick={() => setEditing(true)}><Icon name="edit" />수정</button><button disabled={busy} className="danger" onClick={remove}><Icon name="trash" />삭제</button></PostMenu>}</div>{editing ? <form onSubmit={save}><label htmlFor={id}>댓글 수정</label><textarea id={id} value={body} onChange={event => setBody(event.target.value)} maxLength={MAX_COMMENT_LENGTH} disabled={busy} required /><div className="actions"><button className="primary" disabled={busy}>저장</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setBody(comment.body); }}>취소</button></div></form> : <p className="comment-body">{comment.body}</p>}{error && <p className="error" role="alert">{error}</p>}</article>;
}

export default function Comments({ post, user, onLogin, sectionRef }: { post: Post; user: User | null; onLogin: () => void; sectionRef: RefObject<HTMLElement | null> }) {
  const { profile } = useProfile(user?.uid); const id = useId();
  const draftKey = `postpost:comment:${user?.uid || 'guest'}:${post.id}`;
  const [body, setBody] = useState(() => { try { return user ? sessionStorage.getItem(draftKey) || '' : ''; } catch { return ''; } });
  const pending = useRef<ReturnType<typeof newCommentRef> | null>(null);
  const [comments, setComments] = useState<Comment[]>([]); const [size, setSize] = useState(50); const [more, setMore] = useState(false); const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true); const [listError, setListError] = useState(''); const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!user) return;
    try { if (body) sessionStorage.setItem(draftKey, body); else sessionStorage.removeItem(draftKey); } catch { /* Input remains available even if storage is blocked. */ }
  }, [body, draftKey, user?.uid]);
  useEffect(() => {
    if (!db) return;
    setLoading(true); setListError('');
    const parent = doc(db, 'posts', post.id);
    const stopCount = onSnapshot(doc(parent, 'stats', 'comments'), snapshot => setCount(snapshot.data()?.count || 0), error => setListError(errorMessage(error)));
    const stopList = onSnapshot(query(collection(parent, 'comments'), orderBy('createdAt', 'desc'), limit(size)), snapshot => {
      setComments(snapshot.docs.map(readPost).filter((item): item is Post => item !== null && !item.deleted).reverse()); setMore(snapshot.size === size); setLoading(false);
    }, error => { setListError(errorMessage(error)); setLoading(false); });
    return () => { stopCount(); stopList(); };
  }, [post.id, size, attempt]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!user || !profile || busy) return;
    const invalid = validateComment(body); if (invalid) { setError(invalid); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (!pending.current) pending.current = newCommentRef(post.id);
      await createComment(post.id, pending.current, { ...user, displayName: profile.name } as User, body);
      pending.current = null; setBody(''); setNotice('댓글을 남겼어요.');
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  return <section className="comments" ref={sectionRef} tabIndex={-1} aria-label="댓글"><h3>댓글 <span className="muted">{count}</span></h3>{user && profile ? <form onSubmit={submit} className="comment-composer"><label className="sr-only" htmlFor={id}>댓글 내용</label><textarea id={id} className="comment-input" value={body} onChange={event => { pending.current = null; setBody(event.target.value); setNotice(''); }} placeholder="댓글을 남겨보세요." maxLength={MAX_COMMENT_LENGTH} disabled={busy} required /><div className="composer-footer"><span className="muted">{body.length} / {MAX_COMMENT_LENGTH}</span><button className="primary" disabled={busy || !body.trim()}>{busy ? '등록 중…' : '댓글 등록'}</button></div>{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}</form> : <div className="comment-login"><p className="muted">{user ? '프로필을 등록하면 댓글을 남길 수 있어요.' : '로그인하면 댓글을 남길 수 있어요.'}</p><button className="quiet-button" onClick={onLogin}>{user ? '프로필 설정' : '로그인'}</button></div>}{listError ? <div><p className="error" role="alert">{listError}</p><button onClick={() => setAttempt(value => value + 1)}>댓글 다시 불러오기</button></div> : <>{loading && <p className="muted" role="status">댓글을 불러오는 중…</p>}{more && <button className="quiet-button load-more" onClick={() => setSize(value => value + 50)} disabled={loading}>이전 댓글 50개 더 보기</button>}<div className="comment-list">{comments.map(comment => <CommentItem key={comment.id} postId={post.id} comment={comment} user={user} />)}</div>{!loading && comments.length === 0 && <p className="muted">{count === 0 ? '아직 댓글이 없어요.' : '현재 구간에는 표시할 댓글이 없어요. 이전 댓글을 불러와 보세요.'}</p>}</>}</section>;
}
