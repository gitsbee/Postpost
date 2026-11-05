import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';
import { validateAccount } from '../validation.mjs';
import { normalizeHandle, validateProfile } from '../profileValidation.mjs';
import { saveProfile } from '../profiles';
import { errorMessage } from '../model';
import Icon from './Icon';

export default function AccountForm({ onClose, onSuccess, onPending }: { onClose: () => void; onSuccess: () => void; onPending: (value: boolean) => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login'); const [step, setStep] = useState(0);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [name, setName] = useState(''); const [handle, setHandle] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const created = useRef<User | null>(null);
  useEffect(() => () => onPending(false), [onPending]);
  function changeMode(next: typeof mode) { setMode(next); setStep(0); setError(''); setNotice(''); setPassword(''); }
  function back() { if (mode === 'signup' && step === 1 && !created.current) { setStep(0); setError(''); } else if (mode !== 'login' && !created.current) changeMode('login'); else { onPending(false); onClose(); } }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !auth) return;
    setError(''); setNotice('');
    if (mode === 'signup' && step === 0) {
      const invalid = validateAccount(email, password, '가입자', true);
      if (invalid) { setError(invalid); return; } setStep(1); return;
    }
    if (mode === 'signup') {
      const invalid = validateProfile(name, handle, '', []); if (invalid) { setError(invalid); return; }
    } else if (mode === 'reset') {
      const invalid = validateAccount(email, 'reset', '', false); if (invalid) { setError(invalid); return; }
    } else if ((!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !/^[a-z][a-z0-9_]{2,19}$/.test(normalizeHandle(email))) || !password) {
      setError('이메일 주소 또는 핸들과 비밀번호를 입력해 주세요.'); return;
    }
    setBusy(true);
    try {
      if (mode === 'reset') {
        try { await sendPasswordResetEmail(auth, email.trim()); } catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error; }
        setNotice('해당 계정이 있다면 재설정 메일을 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.');
      } else if (mode === 'signup') {
        if (!db) throw new Error('설정을 확인해 주세요.');
        const reservation = await getDoc(doc(db, 'handles', normalizeHandle(handle)));
        if (reservation.exists() && reservation.data().uid !== created.current?.uid) { setError('이미 사용 중인 핸들이에요.'); return; }
        onPending(true);
        if (!created.current) created.current = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
        await saveProfile(created.current, name, handle, '', []);
        try { await updateProfile(created.current, { displayName: name.trim() }); } catch { /* Public profile is already saved; Auth display name is only a fallback. */ }
        onPending(false); onSuccess();
      } else {
        let loginEmail = email.trim();
        if (!loginEmail.includes('@') || loginEmail.startsWith('@')) {
          if (!functions) { setError('핸들 로그인을 사용할 수 없습니다. 이메일로 로그인해 주세요.'); return; }
          const resolve = httpsCallable<{ handle: string; password: string }, { email: string }>(functions, 'resolveHandleLogin');
          const result = await resolve({ handle: normalizeHandle(loginEmail), password }); loginEmail = result.data.email;
        }
        await signInWithEmailAndPassword(auth, loginEmail, password); onSuccess();
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (mode === 'signup' && created.current) setError('계정은 생성됐지만 프로필 등록을 완료하지 못했어요. 핸들을 확인한 뒤 다시 가입 완료를 눌러 주세요.');
      else if (code === 'functions/unauthenticated') setError('이메일 또는 핸들과 비밀번호를 확인해 주세요.');
      else if (code === 'functions/resource-exhausted') setError('로그인 요청이 많아요. 잠시 후 다시 시도해 주세요.');
      else if (code?.startsWith('functions/')) setError('핸들 로그인 서버에 연결하지 못했어요. 이메일로 로그인하거나 잠시 후 다시 시도해 주세요.');
      else setError(code ? errorMessage(error) : error instanceof Error ? error.message : '처리하지 못했어요.');
      if (!created.current) onPending(false);
    } finally { setBusy(false); }
  }
  const title = mode === 'signup' ? step === 0 ? '회원가입' : '프로필 설정' : mode === 'reset' ? '비밀번호 재설정' : '로그인';
  return <section className="panel account" aria-labelledby="account-title">
    <div className="page-heading"><button type="button" className="icon-button" onClick={back} disabled={busy} aria-label="이전 화면으로"><Icon name="back" /></button><h1 id="account-title">{title}</h1></div>
    <form onSubmit={submit} autoComplete="on">
      <fieldset className="credentials-fields">
        <label htmlFor="account-username">{mode === 'login' ? '이메일 또는 핸들' : mode === 'signup' && step === 1 ? '가입 이메일' : '이메일'}</label><input id="account-username" name="username" type={mode === 'login' ? 'text' : 'email'} value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" readOnly={busy || Boolean(created.current) || mode === 'signup' && step === 1} autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus />
        {mode !== 'reset' && <div hidden={mode === 'signup' && step === 1}><label htmlFor="account-password">비밀번호</label><input id="account-password" name="password" readOnly={busy || Boolean(created.current)} type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />{mode === 'signup' && <p className="muted">8자 이상 입력해 주세요.</p>}</div>}
      </fieldset>
      {mode === 'signup' && step === 1 && <fieldset disabled={busy}><p className="muted">2 / 2 · 고유 핸들과 이름을 정해 주세요.</p><label htmlFor="signup-handle">핸들</label><div className="handle-input"><span aria-hidden="true">@</span><input id="signup-handle" name="publicHandle" autoComplete="off" autoFocus value={handle} onChange={event => setHandle(event.target.value.toLowerCase())} maxLength={20} required /></div><p className="muted">영문자로 시작하는 소문자·숫자·밑줄 3~20자</p><label htmlFor="signup-name">닉네임</label><input id="signup-name" name="displayName" autoComplete="off" value={name} onChange={event => setName(event.target.value)} maxLength={30} required /></fieldset>}
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      <button className="primary" disabled={busy}>{busy ? '처리 중…' : mode === 'signup' ? step === 0 ? '다음' : '가입 완료' : mode === 'reset' ? '재설정 메일 받기' : '로그인'}</button>
    </form>
    {!created.current && <div className="actions"><button type="button" disabled={busy} onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? '로그인으로' : '회원가입'}</button>{mode !== 'reset' && <button type="button" disabled={busy} onClick={() => changeMode('reset')}>비밀번호를 잊었나요?</button>}{mode === 'reset' && <button type="button" disabled={busy} onClick={() => changeMode('login')}>로그인으로</button>}</div>}
  </section>;
}
