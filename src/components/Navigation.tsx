import type { User } from 'firebase/auth';
import { base, navigate } from '../hooks/useNavigation';
import Icon from './Icon';
import PostMenu from './PostMenu';
export default function Navigation({ desktop, selected, user, onCompose, onLogout }: { desktop: boolean; selected: string; user: User | null; onCompose: () => void; onLogout: () => void }) {
  const items = [
    { key: 'feed', title: '피드', icon: 'home' as const, path: base },
    { key: 'explore', title: '탐색', icon: 'flame' as const, path: `${base}#/explore` },
    { key: 'compose', title: '게시물 추가', icon: 'plus' as const, path: '' },
    { key: 'search', title: '검색', icon: 'search' as const, path: `${base}#/search` },
    { key: 'me', title: '마이페이지', icon: 'person' as const, path: `${base}#/me` },
  ];
  return <aside className={desktop ? 'navigation-rail' : 'bottom-navigation'} aria-label="사이트 내비게이션">
    {desktop && <a className="brand-symbol" href={base} aria-label="포스트포스트 홈" title="포스트포스트"><Icon name="post" /></a>}
    <nav aria-label="주 메뉴">{items.map(item => <button key={item.key} className={`nav-item${item.key === 'compose' ? ' nav-compose' : ''}`} aria-label={item.title} title={item.title} aria-current={selected === item.key ? 'page' : undefined} onClick={() => item.key === 'compose' ? onCompose() : navigate(item.path)}><Icon name={item.icon} filled={selected === item.key && item.key === 'explore'} /></button>)}</nav>
    {desktop && <div className="rail-bottom"><PostMenu label="더보기" iconOnly><button onClick={() => navigate(`${base}#/settings`)}><Icon name="settings" />설정</button><button onClick={() => navigate(`${base}#/activity`)}><Icon name="activity" />내 활동</button><button onClick={() => navigate(`${base}About/`)}><Icon name="info" />소개</button>{user && <button onClick={onLogout}><Icon name="logout" />로그아웃</button>}</PostMenu></div>}
  </aside>;
}
