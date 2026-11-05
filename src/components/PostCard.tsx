import { useEffect, useId, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { dateLabel, errorMessage, type Post, type Reaction, type ReactionKind } from '../model';
import { deletePost, editPost, postLink, reactTo, repost } from '../data';
import { validatePost } from '../validation.mjs';
import { extractTags } from '../content.mjs';
import Modal from './Modal';

export default function PostCard({ post, user, onLogin, onTag }: { post: Post; user: User | null; onLogin: () => void; onTag: (tag: string) => void }) {
  const editId = useId();
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [own, setOwn] = useState<ReactionKind | null>(null);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body); const [people, setPeople] = useState<Reaction[] | null>(null);
  useEffect(() => { setBody(post.body); }, [post.body]);
  useEffect(() => {
    setCounts({ likes: 0, dislikes: 0 }); setOwn(null); setPeople(null); setError('');
    if (!db || post.deleted || post.kind === 'repost') return;
    const parent = doc(db, 'posts', post.id);
    const stopStats = onSnapshot(doc(parent, 'stats', 'reactions'), snapshot => {
      setCounts({ likes: snapshot.data()?.likes || 0, dislikes: snapshot.data()?.dislikes || 0 });
    }, e => setError(errorMessage(e)));
    const stopOwn = user ? onSnapshot(doc(parent, 'reactions', user.uid), snapshot => setOwn(snapshot.data()?.kind || null), e => setError(errorMessage(e))) : () => {};
    return () => { stopStats(); stopOwn(); };
  }, [post.id, post.deleted, post.kind, user?.uid]);
  async function act(action: () => Promise<void>, message: string) {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  function reaction(kind: ReactionKind) {
    if (!user) { onLogin(); return; }
    void act(() => reactTo(post, user, kind), own === kind ? '반응을 취소했어요.' : '반응을 반영했어요.');
  }
  async function showPeople() {
    if (!db || user?.uid !== post.authorId) return;
    await act(async () => {
      const result = await getDocs(collection(db!, 'posts', post.id, 'reactions'));
      setPeople(result.docs.map(item => ({ uid: item.id, name: item.data().name, kind: item.data().kind })));
    }, '');
  }
  function submitEdit(event: FormEvent) {
    event.preventDefault(); const invalid = validatePost(body);
    if (invalid) { setError(invalid); return; }
    void act(async () => { await editPost(post, body); setEditing(false); }, '글을 수정했어요.');
  }
  if (post.deleted) return <article className="panel post"><p>삭제된 게시물입니다.</p></article>;
  return <article className="panel post" aria-label={`${post.authorName}의 ${post.kind === 'repost' ? '리포스트' : '글'}`}>
    <div className="post-heading"><div className="avatar" aria-hidden="true">{Array.from(post.authorName)[0] || 'P'}</div><div className="post-author"><strong>{post.authorName}</strong><a className="muted" href={postLink(post.id)}>{dateLabel(post.createdAt)}{post.updatedAt ? ' · 수정됨' : ''}</a></div>{user?.uid === post.authorId && <span className="badge">내 글</span>}</div>
    {post.kind === 'repost' ? <div className="repost"><p>이 글을 리포스트했어요.</p><a className="button" href={postLink(post.originalId!)}>원 포스트 보기 ↗</a></div> : editing ? <form onSubmit={submitEdit}><label htmlFor={editId}>글 수정</label><textarea id={editId} value={body} onChange={e => setBody(e.target.value)} maxLength={2000} required disabled={busy} /><div className="actions"><button className="primary" disabled={busy}>저장</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setBody(post.body); }}>취소</button></div></form> : <><p className="post-body">{post.body}</p><div className="tags">{extractTags(post.body).map(tag => <button key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</div></>}
    <div className="post-actions">
      {post.kind === 'post' && <><button disabled={busy} aria-pressed={own === 'like'} onClick={() => reaction('like')}>좋아요 {counts.likes}</button><button disabled={busy} aria-pressed={own === 'dislike'} onClick={() => reaction('dislike')}>싫어요 {counts.dislikes}</button><button disabled={busy} onClick={() => user ? void act(() => repost(post, user), '리포스트했어요. 이미 리포스트한 글은 중복 생성하지 않습니다.') : onLogin()}>리포스트</button></>}
      <button onClick={() => void act(async () => { await navigator.clipboard.writeText(postLink(post.id)); }, '링크를 복사했어요.')} disabled={busy}>링크 복사</button>
      {user?.uid === post.authorId && <>{post.kind === 'post' && <><button disabled={busy} onClick={showPeople}>반응한 사람</button><button disabled={busy} onClick={() => setEditing(!editing)}>수정</button></>}<button className="danger" disabled={busy} onClick={() => { if (confirm('이 게시물을 삭제할까요? 본문은 복구할 수 없습니다.')) void act(() => deletePost(post), '삭제했어요.'); }}>삭제</button></>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {people !== null && user?.uid === post.authorId && <Modal title="반응한 사람 · 작성자만 공개" onClose={() => setPeople(null)}><p className="muted">닉네임은 반응 당시 표시명입니다. 계정 ID로 같은 이름을 구분할 수 있어요.</p>{people.length ? <ul className="people">{people.map(person => <li key={person.uid}><strong>{person.name}</strong> · {person.kind === 'like' ? '좋아요' : '싫어요'}<p className="muted">계정 ID: {person.uid}</p></li>)}</ul> : <p>아직 반응이 없습니다.</p>}</Modal>}
  </article>;
}
