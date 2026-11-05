import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from './firebase';
import { errorMessage } from './model';
import { matchesSearch } from './content.mjs';
import { useFeed } from './hooks/useFeed';
import AccountForm from './components/AccountForm';
import Composer from './components/Composer';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';

const base = import.meta.env.BASE_URL;
function detailId() {
  const match = location.hash.match(/^#\/posts\/([^/]+)$/);
  try { return match ? decodeURIComponent(match[1]) : null; } catch { return null; }
}
function About() {
  return <article className="about panel"><h1>About Postpost</h1><p className="eyebrow">A PLACE FOR YOUR THOUGHTS</p><h2>가벼운 생각도,<br />하나의 이야기가 되니까.</h2><p>오늘의 발견, 문득 든 생각, 남기고 싶은 한마디. 여기에 편하게 놓아두세요.</p><h2>작은 기록을 나누는 공간</h2><p>잘 쓴 글이 아니어도 괜찮아요. 지금 떠오른 생각이면 충분해요. Postpost는 짧은 텍스트로 일상을 기록하고 서로의 생각을 읽는 게시판입니다.</p><h2>글과 해시태그</h2><p>로그인하면 최대 2,000자까지 작성할 수 있습니다. #일상 #독서처럼 태그를 넣어 보세요. 검색창은 현재 불러온 게시물의 본문과 작성자를 검색하고, #태그는 정확한 태그로 찾습니다. 여러 검색어는 모두 포함하는 글을 찾습니다. 더 불러오면 검색 범위도 넓어집니다.</p><h2>반응과 리포스트</h2><p>좋아요와 싫어요 중 하나를 선택할 수 있고 다시 누르면 취소됩니다. 반응 수는 공개되지만 누가 눌렀는지는 해당 글 작성자만 목록으로 볼 수 있습니다. 본인은 자신의 반응을 확인할 수 있습니다. 리포스트는 원문을 참조하며 원 포스트 보기를 누르면 창에서 읽을 수 있습니다.</p><h2>공개 범위와 나의 기록</h2><p>모든 게시물은 로그인하지 않아도 읽을 수 있습니다. 개인정보나 비공개 내용을 올리지 마세요. 본인 글은 수정·삭제할 수 있고 리포스트도 삭제할 수 있습니다. 삭제된 원문 내용은 리포스트에서도 보이지 않습니다. 이미 외부에서 복사한 내용까지 회수되지는 않습니다.</p><p>초안은 이 브라우저 탭에 계정별로 저장됩니다. 탭을 닫으면 복원이 보장되지 않습니다. 닉네임은 고유하거나 인증된 신원을 의미하지 않으며 반응 목록에는 반응 당시 이름이 표시됩니다.</p><h2>함께 지켜 주세요</h2><p>서로를 존중하고 혐오·괴롭힘·개인정보 노출을 피해주세요. 현재 베타에는 댓글, 이미지 업로드, 신고·관리 UI가 없습니다.</p><a className="button primary" href={base}>피드로 돌아가기</a></article>;
}
export default function App() {
  const about = location.pathname.replace(/\/$/, '').endsWith('/About');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [accountOpen, setAccountOpen] = useState(new URLSearchParams(location.search).get('login') === '1');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [mine, setMine] = useState(false);
  const [selected, setSelected] = useState(detailId);
  const accountButton = useRef<HTMLButtonElement>(null);
  const feed = useFeed(!about);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, value => { setUser(value); setAuthLoading(false); setMine(false); }, e => { setError(errorMessage(e)); setAuthLoading(false); });
  }, []);
  useEffect(() => { const changed = () => setSelected(detailId()); window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  function closeDetail() { history.replaceState(null, '', location.pathname + location.search); setSelected(null); }
  function openLogin() { closeDetail(); setAccountOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function tagSearch(tag: string) { closeDetail(); setSearch(`#${tag}`); document.getElementById('feed-search')?.focus(); }
  async function logout() {
    if (!auth || posting) return;
    try { await signOut(auth); setAccountOpen(false); setError(''); } catch (e) { setError(errorMessage(e)); }
  }
  const visible = feed.posts.filter(post => !post.deleted && (!mine || post.authorId === user?.uid) && matchesSearch(post, search));
  return <>
    <a className="skip-link" href="#main">본문으로 건너뛰기</a>
    <header className="header"><a className="wordmark" href={base} aria-label="Postpost 홈">postpost.</a><nav aria-label="주 메뉴"><a href={base} aria-current={!about ? 'page' : undefined}>피드</a><a href={`${base}About/`} aria-current={about ? 'page' : undefined}>About</a></nav><div className="account-nav">{authLoading ? <span>연결 중…</span> : user ? <><span className="user-name">{user.displayName || '작성자'} 님</span><button disabled={posting} onClick={logout}>로그아웃</button></> : <button ref={accountButton} onClick={() => about ? location.assign(`${base}?login=1`) : setAccountOpen(!accountOpen)} disabled={!auth}>로그인 / 가입</button>}</div></header>
    <main id="main">
      {about ? <About /> : <>
        <div className="page-title"><h1>피드</h1><span className="muted">최신순</span></div>
        {!auth || !db ? <section className="panel"><h2>연결을 준비하고 있어요.</h2><p>Firebase 설정이 완료되면 게시판을 사용할 수 있습니다.</p></section> : <>
          {accountOpen && <AccountForm onClose={() => { setAccountOpen(false); history.replaceState(null, '', location.pathname + location.hash); accountButton.current?.focus(); setUser(auth?.currentUser || null); }} />}
          {user ? <Composer key={user.uid} user={user} onBusy={setPosting} /> : <section className="panel login-prompt"><p>글을 남기려면 로그인해 주세요.</p><button className="primary" onClick={openLogin} disabled={authLoading}>로그인하고 글 쓰기</button></section>}
          {error && <p className="error" role="alert">{error}</p>}
          <section className="feed-tools panel" aria-label="게시물 검색"><label htmlFor="feed-search">포스트 검색</label><div className="search-row"><input id="feed-search" type="search" placeholder="본문, 작성자 또는 #해시태그" value={search} onChange={e => setSearch(e.target.value)} /><button onClick={() => setSearch('')} disabled={!search}>지우기</button></div><div className="actions" aria-label="목록 필터"><button aria-pressed={!mine} onClick={() => setMine(false)}>모든 글</button><button aria-pressed={mine} disabled={!user} onClick={() => setMine(true)}>내 글</button></div><p className="muted">불러온 글 {feed.posts.filter(post => !post.deleted).length}개에서 검색 · 결과 {visible.length}개</p></section>
          {feed.cached && <p className="connection" role="status">서버 연결 확인 중 · 저장된 목록이 표시될 수 있습니다.</p>}
          {feed.error ? <div className="panel"><p className="error" role="alert">{feed.error}</p><button onClick={feed.retry}>다시 불러오기</button></div> : <>{feed.loading && <p role="status">불러오는 중…</p>}<div className="posts">{visible.map(post => <PostCard key={post.id} post={post} user={user} onLogin={openLogin} onTag={tagSearch} />)}</div>{!feed.loading && visible.length === 0 && <section className="panel empty"><h2>{feed.cached ? '서버 연결을 기다리고 있어요.' : search || mine ? '조건에 맞는 글이 없어요.' : '첫 번째 글을 남겨보세요.'}</h2>{(search || mine) && <p>검색어를 바꾸거나 이전 글을 더 불러와 보세요.</p>}</section>}{feed.more && <button className="load-more" disabled={feed.loading || feed.cached} onClick={feed.loadMore}>이전 글 50개 더 불러오기</button>}</>}
        </>}
      </>}
    </main>
    <footer><span>© {new Date().getFullYear()} Postpost</span><a href={`${base}About/`}>서비스 소개와 이용 안내</a></footer>
    {selected && <PostDetail key={selected} id={selected} user={user} onClose={closeDetail} onLogin={openLogin} onTag={tagSearch} />}
  </>;
}
