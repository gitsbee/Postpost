import { useEffect, useState } from 'react';
export type Theme = 'system' | 'light' | 'dark';
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => { try { const saved = localStorage.getItem('postpost:theme'); return saved === 'light' || saved === 'dark' ? saved : 'system'; } catch { return 'system'; } });
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const change = () => setSystemDark(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  useEffect(() => { const dark = theme === 'dark' || theme === 'system' && systemDark; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#000000' : '#f5f3ee'); try { localStorage.setItem('postpost:theme', theme); } catch { /* Theme still works for this session. */ } }, [theme, systemDark]);
  return { theme, setTheme };
}
