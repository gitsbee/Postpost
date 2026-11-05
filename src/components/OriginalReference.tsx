import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { readPost, type Post } from '../model';
import { postLink } from '../data';
import Identity from './Identity';
import Icon from './Icon';

export default function OriginalReference({ id }: { id: string }) {
  const [original, setOriginal] = useState<Post | null>(null); const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoading(true); setOriginal(null); setFailed(false);
    if (!db || id.includes('/')) { setLoading(false); return; }
    return onSnapshot(doc(db, 'posts', id), snapshot => { setOriginal(readPost(snapshot)); setLoading(false); }, () => { setFailed(true); setLoading(false); });
  }, [id]);
  return <div className="repost original-reference"><p className="muted"><Icon name="repeat" /> 원 포스트</p>{loading ? <p className="muted">불러오는 중…</p> : failed ? <p className="muted">원문을 불러오지 못했어요.</p> : !original || original.deleted ? <p className="muted">삭제되었거나 찾을 수 없는 원문입니다.</p> : <><Identity uid={original.authorId} fallback={original.authorName} /><p className="original-excerpt">{original.body}</p></>}<a className="button quiet-button" href={postLink(id)}>원 포스트 보기</a></div>;
}
