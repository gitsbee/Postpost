import { useEffect, useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signOut, updateProfile, type User,
} from 'firebase/auth';
import {
  addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { auth, db, missingConfig } from './firebase';
import { MAX_POST_LENGTH, validateAccount, validatePost } from './validation.mjs';

type Post = { id: string; body: string; authorId: string; authorName: string; createdAt: Timestamp | null };

function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return '이메일 또는 비밀번호를 확인해 주세요.';
    case 'auth/email-already-in-use': return '이미 가입된 이메일입니다. 로그인해 주세요.';
    case 'auth/invalid-email': return '올바른 이메일 주소를 입력해 주세요.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements': return 'Firebase 프로젝트의 비밀번호 정책을 확인해 주세요.';
    case 'auth/too-many-requests': return '요청이 많아 잠시 제한됐어요. 잠시 후 다시 시도해 주세요.';
    case 'auth/network-request-failed':
    case 'unavailable': return '연결이 원활하지 않아요. 네트워크를 확인해 주세요.';
    case 'permission-denied': return '접근 권한이 없어요. 로그인 상태와 Firestore 보안 규칙을 확인해 주세요.';
    case 'auth/operation-not-allowed': return 'Firebase에서 이메일/비밀번호 로그인을 활성화해 주세요.';
    case 'auth/unauthorized-domain': return 'Firebase Authentication에 현재 도메인을 등록해 주세요.';
    default: return '요청을 처리하지 못했어요. Firebase 설정을 확인한 후 다시 시도해 주세요.';
  }
}

function AccountForm({ onClose }: { onClose: () => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !auth) return;
    const invalid = validateAccount(email, password, name, signup);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    try {
      if (signup) {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await updateProfile(result.user, { displayName: name.trim() });
        } catch {
          // Account creation already succeeded; do not offer a misleading signup retry.
          window.alert('계정은 생성됐지만 닉네임 저장에 실패했어요. 글에는 “작성자”로 표시됩니다.');
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onClose();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <section className="account panel" aria-labelledby="account-heading">
    <div className="section-top"><span className="eyebrow">YOUR LITTLE SPACE</span><button type="button" className="text-button" onClick={onClose} disabled={busy}>닫기 ×</button></div>
    <h2 id="account-heading">{signup ? '첫 이야기를 시작해요.' : '다시 만나 반가워요.'}</h2>
    <p className="muted">{signup ? '이메일로 가입하고 생각을 남겨 보세요.' : '로그인하고 오늘의 생각을 남겨 보세요.'}</p>
    <form onSubmit={submit}>
      {signup && <label>닉네임<input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={30} required autoComplete="nickname" disabled={busy} /></label>}
      <label>이메일<input autoFocus={!signup} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" disabled={busy} placeholder="you@example.com" /></label>
      <label>비밀번호<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} disabled={busy} placeholder={signup ? '8자 이상 입력해 주세요' : '비밀번호를 입력해 주세요'} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary wide" disabled={busy}>{busy ? '처리 중…' : signup ? '계정 만들기' : '로그인'}</button>
    </form>
    <p className="account-switch">{signup ? '이미 계정이 있나요?' : '처음 오셨나요?'} <button type="button" className="text-button" disabled={busy} onClick={() => { setSignup(!signup); setError(''); setPassword(''); }}>{signup ? '로그인' : '회원가입'}</button></p>
  </section>;
}

function dateLabel(timestamp: Timestamp | null) {
  if (!timestamp) return '방금 전';
  return timestamp.toDate().toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [accountOpen, setAccountOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(Boolean(db));
  const [fromCache, setFromCache] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [feedAttempt, setFeedAttempt] = useState(0);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, next => { setUser(next); setAuthLoading(false); }, e => { setActionError(errorMessage(e)); setAuthLoading(false); });
  }, []);
  useEffect(() => {
    if (!db) return;
    setLoading(true); setFeedError('');
    return onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)), { includeMetadataChanges: true }, snapshot => {
      setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Post));
      setFromCache(snapshot.metadata.fromCache);
      setLoading(false);
    }, e => { setFeedError(errorMessage(e)); setLoading(false); });
  }, [feedAttempt]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!user || !db || posting) return;
    const invalid = validatePost(body);
    if (invalid) { setActionError(invalid); return; }
    setPosting(true); setActionError(''); setNotice('');
    try {
      await addDoc(collection(db, 'posts'), {
        body: body.trim(), authorId: user.uid,
        authorName: user.displayName?.trim().slice(0, 30) || '작성자',
        createdAt: serverTimestamp(),
      });
      setBody(''); setNotice('글을 게시했어요.');
    } catch (e) { setActionError(errorMessage(e)); }
    finally { setPosting(false); }
  }
  async function logout() {
    if (!auth || posting) return;
    try { await signOut(auth); setBody(''); setNotice('로그아웃했어요.'); setActionError(''); }
    catch (e) { setActionError(errorMessage(e)); }
  }

  return <>
    <header className="header"><a className="wordmark" href={import.meta.env.BASE_URL} aria-label="Postpost 홈">postpost<span className="brand-dot">.</span><span className="beta">BETA</span></a>
      <nav aria-label="계정">{authLoading ? <span className="muted">연결 중…</span> : user ? <><span className="user-name">{user.displayName || '작성자'} 님</span><button className="small-button" onClick={logout} disabled={posting}>로그아웃</button></> : <button className="small-button" disabled={!auth} onClick={() => setAccountOpen(!accountOpen)}>로그인 / 가입</button>}</nav>
    </header>
    <main>
      <section className="intro"><span className="eyebrow"><span className="live-dot" /> A PLACE FOR YOUR THOUGHTS</span><h1>가벼운 생각도,<br /><span>하나의 이야기가 되니까.</span></h1><p>오늘의 발견, 문득 든 생각, 남기고 싶은 한마디.<br className="mobile-break" /> 여기에 편하게 놓아두세요.</p></section>
      {missingConfig.length > 0 ? <section className="panel setup" aria-labelledby="setup-title"><span className="eyebrow">LET’S GET STARTED</span><h2 id="setup-title">곧, 이야기가 시작됩니다.</h2><p>Firebase 연결을 준비하고 있어요. 연결이 완료되면 로그인하고 글을 남길 수 있습니다.</p><p className="muted">프로젝트 관리자는 README의 Firebase 설정 가이드를 확인해 주세요.</p></section> : <div className="layout">
        <aside>{accountOpen ? <AccountForm onClose={() => setAccountOpen(false)} /> : <section className="panel note"><span className="note-icon" aria-hidden="true">↗</span><span className="eyebrow">SMALL WORDS, BIG DAYS</span><h2>당신의 일상을<br />기록해 보세요.</h2><p>잘 쓴 글이 아니어도 괜찮아요.<br />지금 떠오른 생각이면 충분해요.</p><div className="note-line" /><p className="tiny">모든 글은 누구나 읽을 수 있어요.<br />서로를 존중하는 이야기를 나눠 주세요.</p></section>}</aside>
        <div className="feed-column"><section className="panel composer" aria-label="글 작성">
          <div className="composer-heading"><span className="avatar" aria-hidden="true">{(user?.displayName || 'P').slice(0, 1).toUpperCase()}</span><div><strong>{user ? `${user.displayName || '작성자'} 님의 이야기` : '오늘은 어떤 생각을 했나요?'}</strong><p className="tiny">작은 이야기 하나를 남겨 보세요.</p></div></div>
          {user ? <form onSubmit={publish}><label className="sr-only" htmlFor="post-body">게시할 글</label><textarea id="post-body" placeholder="지금 떠오른 생각을 자유롭게 적어 주세요…" value={body} onChange={e => { setBody(e.target.value); setNotice(''); }} maxLength={MAX_POST_LENGTH} disabled={posting} required /><div className="composer-footer"><span className="tiny">{body.length.toLocaleString()} / {MAX_POST_LENGTH.toLocaleString()}</span><button className="primary" disabled={posting || !body.trim()}>{posting ? '게시 중…' : '글 게시하기 ↗'}</button></div></form> : <div className="login-prompt"><p>로그인하고 나만의 이야기를 시작해 보세요.</p><button className="primary" disabled={authLoading} onClick={() => setAccountOpen(true)}>로그인하고 글 쓰기 ↗</button></div>}
        </section>
          {actionError && <p className="error" role="alert">{actionError}</p>}<p className="notice" role="status">{notice}</p>
          <div className="feed-heading"><h2>모두의 이야기 <span className="feed-count">{posts.length}</span></h2><span className="tiny">{fromCache ? '서버 연결 확인 중' : '최근 50개 · 최신순'}</span></div>
          {loading ? <div className="panel empty" role="status">이야기를 불러오는 중이에요…</div> : feedError ? <div className="panel empty"><p className="error" role="alert">{feedError}</p><button className="small-button" onClick={() => setFeedAttempt(value => value + 1)}>다시 불러오기</button></div> : posts.length === 0 ? <div className="panel empty"><span className="empty-mark" aria-hidden="true">✳</span><h3>{fromCache ? '서버 연결을 기다리고 있어요.' : '아직은 빈 페이지예요.'}</h3><p>{fromCache ? '네트워크 연결 후 글 목록을 불러옵니다.' : '첫 번째 이야기를 남겨 주세요.'}</p></div> : <div className="posts">{posts.map(post => <article className="panel post" key={post.id}><div className="post-heading"><span className="avatar soft" aria-hidden="true">{(post.authorName || 'P').slice(0, 1).toUpperCase()}</span><div><strong>{post.authorName || '작성자'}</strong><p className="tiny">{dateLabel(post.createdAt)}</p></div>{user?.uid === post.authorId && <span className="mine">내 글</span>}</div><p className="post-body">{post.body}</p></article>)}</div>}
        </div>
      </div>}
    </main><footer><span className="footer-brand">postpost.</span><span>작은 생각이 모이는 곳.</span><span>© {new Date().getFullYear()} Postpost</span></footer>
  </>;
}
