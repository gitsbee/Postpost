import { useEffect, useState, type MouseEvent } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, db } from './firebase';
import { errorMessage } from './model';
import { matchesSearch } from './content.mjs';
import { useFeed } from './hooks/useFeed';
import { useProfile } from './hooks/useProfile';
import { useAuthorProfiles } from './hooks/useAuthorProfiles';
import { base, navigate, useDesktop, useNavigation } from './hooks/useNavigation';
import AccountForm from './components/AccountForm';
import Composer from './components/Composer';
import PostCard from './components/PostCard';
import PostDetail from './components/PostDetail';
import About from './components/About';
import Icon from './components/Icon';
import Modal from './components/Modal';
import SearchDialog from './components/SearchDialog';
import PublicProfile, { ProfileSummary } from './components/PublicProfile';
import ProfileEditor from './components/ProfileEditor';

function follow(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); navigate(href); }
}
export default function App() {
  const route = useNavigation(); const desktop = useDesktop();
  const [user, setUser] = useState<User | null>(null); const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const own = useProfile(user?.uid);
  const [posting, setPosting] = useState(false); const [writeOpen, setWriteOpen] = useState(false);
  const [error, setError] = useState(''); const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState(''); const [mine, setMine] = useState(false);
  const isFeed = !route.about && !route.me && !route.profileHandle;
  const showSidebar = desktop && !(route.me && !user);
  const feed = useFeed(isFeed);
  const authors = useAuthorProfiles(feed.posts);
  const actor = user && own.profile ? { ...user, displayName: own.profile.name } as User : user;
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, value => { setUser(value); setAuthLoading(false); setMine(false); setError(''); }, error => { setError(errorMessage(error)); setAuthLoading(false); });
  }, []);
  function openProfile() {
    setWriteOpen(false);
    if (desktop && !user && auth && !route.me) { document.querySelector<HTMLInputElement>('.sidebar input')?.focus(); return; }
    navigate(`${base}#/me`);
  }
  function finishLogin() { navigate(`${base}#/me`); }
  function closeDetail() { navigate(base, true); }
  function tagSearch(tag: string) { setSearch(`#${tag}`); navigate(base); }
  async function logout() {
    if (!auth || posting) return;
    try { await signOut(auth); setWriteOpen(false); navigate(base); } catch (error) { setError(errorMessage(error)); }
  }
  const visible = feed.posts.filter(post => !post.deleted && (!mine || post.authorId === user?.uid) && matchesSearch({ ...post, authorName: authors.get(post.authorId)?.name || post.authorName, authorHandle: authors.get(post.authorId)?.handle || '' }, search));
  const composer = actor && own.profile ? <Composer key={actor.uid} user={actor} onBusy={setPosting} alwaysExpanded /> : null;
  const setupNotice = <section className="panel profile-setup"><h2>핸들을 만들어 주세요</h2><p className="muted">나만의 핸들로 글을 쓰고 반응할 수 있어요.</p><button className="primary" onClick={openProfile}>프로필 설정</button></section>;
  return <>
    <a className="skip-link" href="#main">본문으로 건너뛰기</a>
    <header className="header"><div className="header-inner"><a className="wordmark" href={base} onClick={event => follow(event, base)} aria-label="포스트포스트 홈">postpost.</a><nav aria-label="주 메뉴"><a href={base} onClick={event => follow(event, base)} aria-current={isFeed ? 'page' : undefined}>피드</a><a href={`${base}About/`} onClick={event => follow(event, `${base}About/`)} aria-current={route.about ? 'page' : undefined}>소개</a></nav><div className="header-actions"><button className="icon-button" aria-label="포스트 검색" title="검색" onClick={() => setSearchOpen(true)}><Icon name="search" /></button><button className="profile-trigger" aria-label={user ? '내 프로필' : '프로필과 로그인'} onClick={openProfile} disabled={authLoading || !auth}><Icon name="person" /><span className="desktop-name">{user ? <><strong>{own.profile?.name || user.displayName || '내 프로필'}</strong>{own.profile && <span className="handle">@{own.profile.handle}</span>}</> : '로그인'}</span></button></div></div></header>
    <div className={`workspace${showSidebar ? ' with-sidebar' : ''}`}>
      {showSidebar && <aside className="sidebar" aria-label="계정과 글쓰기">{authLoading || own.loading ? <p role="status">계정 확인 중…</p> : user ? <><section className="panel sidebar-account"><button className="identity-link" onClick={openProfile}><strong>{own.profile?.name || user.displayName || '작성자'}</strong><span className="handle">{own.profile ? `@${own.profile.handle}` : '핸들 미설정'}</span></button><button className="icon-button" aria-label="로그아웃" title="로그아웃" onClick={logout} disabled={posting}><Icon name="logout" /></button></section>{own.error ? <p className="error" role="alert">{own.error}</p> : own.profile ? composer : !route.me && setupNotice}</> : !route.me && auth && <AccountForm embedded onClose={finishLogin} />}</aside>}
      <main id="main">
        {error && <p className="error" role="alert">{error}</p>}
        {route.about ? <About /> : route.me ? <>
          <div className="page-title"><h1>{user ? '마이페이지' : '로그인'}</h1>{user && <button className="quiet-button" disabled={posting} onClick={logout}><Icon name="logout" />로그아웃</button>}</div>
          {authLoading || own.loading ? <p role="status">프로필을 불러오는 중…</p> : !user ? auth ? <AccountForm onClose={() => navigate(auth?.currentUser ? `${base}#/me` : base)} /> : <p className="error">연결 설정을 확인해 주세요.</p> : own.error ? <p className="error" role="alert">{own.error}</p> : <>{own.profile && <ProfileSummary profile={own.profile} compact />}<ProfileEditor key={user.uid} user={user} profile={own.profile} /></>}
        </> : route.profileHandle ? <PublicProfile key={route.profileHandle} handle={route.profileHandle} /> : <>
          <div className="page-title"><h1>피드</h1>{!desktop && <button className="primary compact" onClick={() => user && own.profile ? setWriteOpen(true) : openProfile()}><Icon name="edit" />글 쓰기</button>}</div>
          <div className="feed-toolbar"><div className="filter-tabs" aria-label="목록 필터"><button aria-pressed={!mine} onClick={() => setMine(false)}>모든 글</button><button aria-pressed={mine} disabled={!user} onClick={() => setMine(true)}>내 글</button></div><span className="muted">최신순</span></div>
          {search && <div className="active-search"><span>“{search}” · {visible.length}개</span><button className="icon-button" aria-label="검색 해제" onClick={() => setSearch('')}><Icon name="close" /></button></div>}
          {!auth || !db ? <section className="panel"><h2>연결을 준비하고 있어요.</h2><p>Firebase 설정이 완료되면 게시판을 사용할 수 있습니다.</p></section> : <>
            {feed.cached && <p className="connection" role="status">서버 연결 확인 중</p>}
            {feed.error ? <section className="panel"><p className="error" role="alert">{feed.error}</p><button onClick={feed.retry}>다시 불러오기</button></section> : <>{feed.loading && <p role="status">불러오는 중…</p>}<div className="posts">{visible.map(post => <PostCard key={post.id} post={post} user={user} onLogin={openProfile} onTag={tagSearch} />)}</div>{!feed.loading && visible.length === 0 && <section className="panel empty"><h2>{feed.cached ? '서버 연결을 기다리고 있어요.' : search || mine ? '조건에 맞는 글이 없어요.' : '첫 번째 글을 남겨보세요.'}</h2>{(search || mine) && <p>검색 조건을 바꾸거나 이전 글을 더 불러와 보세요.</p>}</section>}{feed.more && <button className="load-more quiet-button" disabled={feed.loading || feed.cached} onClick={feed.loadMore}>이전 글 50개 더 불러오기</button>}<p className="feed-scope muted">불러온 글 {feed.posts.filter(post => !post.deleted).length}개</p></>}
          </>}
        </>}
      </main>
    </div>
    <footer><span>© {new Date().getFullYear()} 포스트포스트</span><a href={`${base}About/`} onClick={event => follow(event, `${base}About/`)}>서비스 소개</a></footer>
    {searchOpen && <SearchDialog value={search} mine={mine} canFilterMine={Boolean(user)} onMine={setMine} onClose={() => setSearchOpen(false)} onSearch={value => { setSearch(value); setSearchOpen(false); navigate(base); }} />}
    {!desktop && writeOpen && actor && own.profile && <Modal title="새 글 쓰기" onClose={() => { if (!posting) setWriteOpen(false); }}>{composer}</Modal>}
    {route.postId && <PostDetail key={route.postId} id={route.postId} user={user} onClose={closeDetail} onLogin={openProfile} onTag={tagSearch} />}
  </>;
}
