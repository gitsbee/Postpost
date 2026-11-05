import { useId, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { deletePost, repost } from '../data';
import { errorMessage, type Post } from '../model';
import { validateRepost } from '../validation.mjs';
import Modal from './Modal';
import OriginalReference from './OriginalReference';

export default function RepostComposer({ original, existing, user, onClose, onSaved }: { original: Post; existing: Post | null; user: User; onClose: () => void; onSaved: (message: string) => void }) {
  const id = useId();
  const [body, setBody] = useState(existing?.body || ''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  function close() { if (!busy && (body === (existing?.body || '') || confirm('작성 중인 리포스트 글을 닫을까요?'))) onClose(); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const invalid = validateRepost(body); if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    try { await repost(original, user, body); onSaved(existing ? '리포스트를 수정했어요.' : '리포스트했어요.'); }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!existing || busy || !confirm('리포스트와 덧붙인 글을 삭제할까요?')) return;
    setBusy(true); setError('');
    try { await deletePost(existing); onSaved('리포스트를 취소했어요.'); }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  return <Modal title={existing ? '리포스트 수정' : '리포스트 작성'} onClose={close}><form onSubmit={submit}><label htmlFor={id}>리포스트에 덧붙일 글</label><textarea id={id} autoFocus value={body} onChange={event => setBody(event.target.value)} maxLength={2000} disabled={busy} placeholder="내 생각을 덧붙여 보세요. (선택)" /><p className="field-counter">{body.length} / 2,000</p><OriginalReference id={original.id} />{error && <p className="error" role="alert">{error}</p>}<div className="actions"><button className="primary" disabled={busy}>{busy ? '저장 중…' : existing ? '리포스트 저장' : '리포스트하기'}</button>{existing && <button className="danger" type="button" onClick={cancel} disabled={busy}>리포스트 취소</button>}</div></form></Modal>;
}
