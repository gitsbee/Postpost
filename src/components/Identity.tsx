import { useProfile } from '../hooks/useProfile';
import { profileHref } from '../profiles';

export default function Identity({ uid, fallback, onNavigate }: { uid: string; fallback: string; onNavigate?: () => void }) {
  const { profile } = useProfile(uid);
  return <div className="identity">{profile ? <a className="identity-link" href={profileHref(profile.handle)} onClick={onNavigate}><strong>{profile.name}</strong><span className="handle">@{profile.handle}</span></a> : <><strong>{fallback}</strong><span className="handle">핸들 미설정</span></>}</div>;
}
