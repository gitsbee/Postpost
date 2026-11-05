import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { errorMessage } from '../model';
import { useProfile } from '../hooks/useProfile';
import { profileHref, type Profile } from '../profiles';
import Icon from './Icon';

export function ProfileSummary({ profile, compact = false }: { profile: Profile; compact?: boolean }) {
  return <section className={`panel profile-summary${compact ? ' compact-profile' : ''}`}><h2 className="profile-name">{profile.name}</h2><p className="handle">@{profile.handle}</p>{profile.bio && <p className="profile-bio">{profile.bio}</p>}{profile.links.length > 0 && <ul className="social-links">{profile.links.map(link => <li key={link}><a href={link} target="_blank" rel="noopener noreferrer"><Icon name="external" />{new URL(link).hostname + new URL(link).pathname.replace(/\/$/, '')}<span className="sr-only"> (새 탭)</span></a></li>)}</ul>}{compact && <a className="profile-public-link" href={profileHref(profile.handle)}>공개 프로필 보기</a>}</section>;
}
export default function PublicProfile({ handle }: { handle: string }) {
  const [uid, setUid] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const result = useProfile(uid);
  useEffect(() => {
    setUid(null); setLoading(true); setError('');
    if (!db || !/^[a-z][a-z0-9_]{2,19}$/.test(handle)) { setLoading(false); return; }
    return onSnapshot(doc(db, 'handles', handle), snapshot => { setUid(snapshot.data()?.uid || null); setLoading(false); }, error => { setError(errorMessage(error)); setLoading(false); });
  }, [handle]);
  if (loading || result.loading) return <p role="status">프로필을 불러오는 중…</p>;
  if (error || result.error) return <p role="alert" className="error">{error || result.error}</p>;
  if (!result.profile) return <section className="panel"><h1>프로필을 찾을 수 없어요.</h1><p>핸들이 변경되었거나 아직 등록되지 않은 프로필입니다.</p></section>;
  return <ProfileSummary profile={result.profile} />;
}
