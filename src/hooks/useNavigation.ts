import { useEffect, useState } from 'react';
export const base = import.meta.env.BASE_URL;
export function navigate(path: string, replace = false) {
  if (replace) history.replaceState(null, '', path); else history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function useNavigation() {
  const [locationState, setLocationState] = useState(() => ({ pathname: location.pathname, hash: location.hash }));
  useEffect(() => {
    const changed = () => setLocationState({ pathname: location.pathname, hash: location.hash });
    window.addEventListener('popstate', changed); window.addEventListener('hashchange', changed);
    return () => { window.removeEventListener('popstate', changed); window.removeEventListener('hashchange', changed); };
  }, []);
  let decoded = '';
  try { decoded = decodeURIComponent(locationState.hash); } catch { /* Invalid URLs resolve to the feed. */ }
  return { about: locationState.pathname.replace(/\/$/, '').endsWith('/About'), me: decoded === '#/me', profileHandle: /^#\/profile\/([a-z][a-z0-9_]{2,19})$/.exec(decoded)?.[1] || null, postId: /^#\/posts\/([^/]+)$/.exec(decoded)?.[1] || null };
}
export function useDesktop() {
  const [desktop, setDesktop] = useState(() => matchMedia('(min-width: 960px)').matches);
  useEffect(() => { const media = matchMedia('(min-width: 960px)'); const changed = () => setDesktop(media.matches); media.addEventListener('change', changed); return () => media.removeEventListener('change', changed); }, []);
  return desktop;
}
