import { useEffect, useRef, type ReactNode } from 'react';
import Icon from './Icon';
export default function PostMenu({ children, label, iconOnly = false }: { children: ReactNode; label?: string; iconOnly?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false; };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return <details className="post-menu" ref={ref} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); ref.current!.open = false; ref.current?.querySelector('summary')?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false; }}>
    <summary role="button" aria-label={label || "게시물 메뉴"} title={label || "게시물 메뉴"} className="icon-button"><Icon name="more" />{label && !iconOnly && <span>{label}</span>}</summary>
    <div className="post-menu-options" aria-label="게시물 작업" onClick={event => { if ((event.target as Element).closest('button')) { ref.current!.open = false; ref.current?.querySelector('summary')?.focus(); } }}>{children}</div>
  </details>;
}
