import { useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { validateAccount } from '../validation.mjs';
import { errorMessage } from '../model';

export default function AccountForm({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  function changeMode(next: typeof mode) { setMode(next); setError(''); setNotice(''); setPassword(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !auth) return;
    const invalid = validateAccount(email, mode === 'reset' ? 'reset' : password, name, mode === 'signup');
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'reset') {
        try { await sendPasswordResetEmail(auth, email.trim()); }
        catch (error) { if ((error as { code?: string }).code !== 'auth/user-not-found') throw error; }
        setNotice('해당 계정이 있다면 재설정 메일을 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.');
      } else if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try { await updateProfile(result.user, { displayName: name.trim() }); onClose(); }
        catch { setNotice('계정은 생성됐지만 닉네임 저장에 실패했습니다. 다시 저장하거나 닫으면 “작성자”로 표시됩니다.'); }
      } else { await signInWithEmailAndPassword(auth, email.trim(), password); onClose(); }
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  async function retryName() {
    if (!auth?.currentUser || !name.trim()) return;
    setBusy(true); setError('');
    try { await updateProfile(auth.currentUser, { displayName: name.trim() }); onClose(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <section className="panel account" aria-labelledby="account-title">
    <div className="section-heading"><h2 id="account-title">{mode === 'signup' ? '회원가입' : mode === 'reset' ? '비밀번호 재설정' : '로그인'}</h2>{!embedded && <button type="button" onClick={onClose} disabled={busy}>닫기</button>}</div>
    <form onSubmit={submit}>
      {mode === 'signup' && <label>닉네임<input autoFocus={!embedded} value={name} onChange={e => setName(e.target.value)} maxLength={30} autoComplete="nickname" required disabled={busy} /></label>}
      <label>이메일<input autoFocus={!embedded && mode !== 'signup'} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required disabled={busy} /></label>
      {mode !== 'reset' && <><label htmlFor="account-password">비밀번호</label><input id="account-password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required disabled={busy} aria-describedby={mode === 'signup' ? 'password-help' : undefined} />{mode === 'signup' && <p id="password-help" className="muted">8자 이상 입력해 주세요.</p>}</>}
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      {mode === 'signup' && notice ? <button type="button" className="primary" onClick={retryName} disabled={busy}>닉네임 다시 저장</button> : <button className="primary" disabled={busy}>{busy ? '처리 중…' : mode === 'signup' ? '가입하기' : mode === 'reset' ? '재설정 메일 받기' : '로그인'}</button>}
    </form>
    <div className="actions"><button type="button" disabled={busy} onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? '로그인으로' : '회원가입'}</button>{mode !== 'reset' && <button type="button" disabled={busy} onClick={() => changeMode('reset')}>비밀번호를 잊었나요?</button>}{mode === 'reset' && <button type="button" disabled={busy} onClick={() => changeMode('login')}>로그인으로</button>}</div>
  </section>;
}
