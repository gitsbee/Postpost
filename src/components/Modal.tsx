import Icon from './Icon';
import { useEffect, useRef, type ReactNode } from 'react';

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!; const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="section-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="닫기" title="닫기" onClick={onClose}><Icon name="close" /></button></div>{children}
  </dialog>;
}
