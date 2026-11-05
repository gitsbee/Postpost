import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { errorMessage } from '../model';
import { HANDLE_WINDOW, saveProfile, type HandleLimits, type Profile } from '../profiles';
import Icon from './Icon';

export default function ProfileEditor({ user, profile }: { user: User; profile: Profile | null }) {
  const [name, setName] = useState(profile?.name || user.displayName || '');
  const suggestedName = useRef(Boolean(profile || user.displayName));
  useEffect(() => {
    if (!suggestedName.current && user.displayName) { setName(current => current || user.displayName || ''); suggestedName.current = true; }
  }, [user.displayName]);
  const [handle, setHandle] = useState(profile?.handle || '');
  const [bio, setBio] = useState(profile?.bio || ''); const [links, setLinks] = useState<string[]>(profile?.links || []);
  const [limits, setLimits] = useState<HandleLimits>({ last: null, previous: null });
  const [limitError, setLimitError] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, 'profileLimits', user.uid), snapshot => {
      setLimits({ last: snapshot.data()?.last || null, previous: snapshot.data()?.previous || null }); setLimitError('');
    }, () => setLimitError('핸들 변경 가능 횟수를 확인하지 못했습니다. 연결과 최신 규칙 적용 여부를 확인해 주세요.'));
  }, [user.uid]);
  const changes = [limits.last, limits.previous].filter(value => value && value.toMillis() > now - HANDLE_WINDOW);
  const remaining = 2 - changes.length;
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await saveProfile(user, name, handle, bio, links.map(link => link.trim())); setNotice('프로필을 저장했어요.'); }
    catch (error) { setError((error as { code?: string }).code ? errorMessage(error) : error instanceof Error ? error.message : '저장하지 못했어요.'); }
    finally { setBusy(false); }
  }
  return <section className="panel profile-editor" aria-labelledby="profile-edit-title">
    <h2 id="profile-edit-title">{profile ? '프로필 편집' : '프로필 만들기'}</h2>
    {!profile && <p className="muted">이름과 고유 핸들을 등록하면 글을 쓰고 반응할 수 있어요. 최초 핸들 등록은 변경 횟수에 포함되지 않습니다.</p>}
    <form onSubmit={submit}>
      <label htmlFor="profile-name">이름</label><input id="profile-name" value={name} onChange={e => setName(e.target.value)} maxLength={30} required disabled={busy} autoComplete="nickname" />
      <label htmlFor="profile-handle">핸들</label><div className="handle-input"><span aria-hidden="true">@</span><input id="profile-handle" value={handle} onChange={e => setHandle(e.target.value.toLowerCase())} placeholder="my_handle" maxLength={20} required disabled={busy || Boolean(profile && remaining === 0)} aria-describedby="handle-help" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></div>
      <p className="muted" id="handle-help">영문자로 시작하는 소문자·숫자·밑줄 3~20자. 최근 14일 동안 두 번 변경할 수 있어요.{profile && ` 현재 ${remaining}회 남았습니다.`}{remaining === 0 && limits.previous && ` ${new Date(limits.previous.toMillis() + HANDLE_WINDOW).toLocaleString('ko-KR')} 이후 다시 변경할 수 있어요.`}</p>
      {limitError && <p className="error" role="alert">{limitError}</p>}
      <label htmlFor="profile-bio">소개</label><textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={1000} disabled={busy} placeholder="나를 소개하는 짧은 글" /><p className="field-counter">{bio.length} / 1,000</p>
      <fieldset disabled={busy}><legend>외부 SNS 링크</legend><p className="muted">https:// 주소를 최대 5개 추가할 수 있어요.</p>{links.map((link, index) => <div className="link-editor" key={index}><input type="url" aria-label={`SNS 링크 ${index + 1}`} value={link} onChange={e => setLinks(current => current.map((value, i) => i === index ? e.target.value : value))} placeholder="https://example.com/me" maxLength={500} required /><button type="button" className="icon-button" aria-label={`SNS 링크 ${index + 1} 삭제`} onClick={() => setLinks(current => current.filter((_, i) => i !== index))}><Icon name="trash" /></button></div>)}<button type="button" className="quiet-button" disabled={busy || links.length >= 5} onClick={() => setLinks(current => [...current, ''])}><Icon name="plus" />링크 추가</button></fieldset>
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      <button className="primary" disabled={busy}>{busy ? '저장 중…' : '프로필 저장'}</button>
    </form>
  </section>;
}
