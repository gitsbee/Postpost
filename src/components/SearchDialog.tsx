import { useEffect, useRef, useState, type FormEvent } from 'react';
import Modal from './Modal';
import Icon from './Icon';
export default function SearchDialog({ value, mine, canFilterMine, onMine, onSearch, onClose }: { value: string; mine: boolean; canFilterMine: boolean; onMine: (value: boolean) => void; onSearch: (value: string) => void; onClose: () => void }) {
  const [text, setText] = useState(value); const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  function submit(event: FormEvent) { event.preventDefault(); onSearch(text.trim()); }
  return <Modal title="포스트 검색" onClose={onClose}><form onSubmit={submit}><label className="sr-only" htmlFor="post-search">검색어</label><div className="search-field"><Icon name="search" /><input ref={ref} id="post-search" type="search" value={text} onChange={e => setText(e.target.value)} placeholder="검색어 또는 #태그" /></div><div className="filter-tabs search-filters" aria-label="검색 범위"><button type="button" aria-pressed={!mine} onClick={() => onMine(false)}>모든 글</button><button type="button" aria-pressed={mine} disabled={!canFilterMine} onClick={() => onMine(true)}>내 글</button></div><p className="muted">본문·작성자·@핸들·#태그를 현재 불러온 글에서 검색합니다. 피드에서 이전 글을 불러오면 검색 범위가 넓어집니다.</p><div className="actions"><button type="button" onClick={() => setText('')}>지우기</button><button className="primary">검색하기</button></div></form></Modal>;
}
