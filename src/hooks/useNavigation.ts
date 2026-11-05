import { useEffect, useState } from 'react';
export const base = import.meta.env.BASE_URL;
if (typeof history.state?.postpostDepth !== 'number') history.replaceState({ ...history.state, postpostDepth: 0 }, '');
export function navigate(path: string, replace = false) {
  const depth = typeof history.state?.postpostDepth === 'number' ? history.state.postpostDepth : 0;
  if (replace) history.replaceState({ postpostDepth: depth }, '', path);
  else if (path !== location.pathname + location.search + location.hash) history.pushState({ postpostDepth: depth + 1 }, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function goBack() {
  if (history.state?.postpostDepth > 0) history.back(); else navigate(base, true);
}
export function useNavigation() {
  const [state, setState] = useState(() => ({ pathname: location.pathname, hash: location.hash }));
  useEffect(() => {
    const changed = () => setState({ pathname: location.pathname, hash: location.hash });
    const follow = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.getAttribute('href') === '#main') return;
      const url = new URL(anchor.href);
      if (url.origin === location.origin && url.pathname.startsWith(base)) { event.preventDefault(); navigate(url.pathname + url.search + url.hash); }
    };
    window.addEventListener('popstate', changed); window.addEventListener('hashchange', changed); document.addEventListener('click', follow);
    return () => { window.removeEventListener('popstate', changed); window.removeEventListener('hashchange', changed); document.removeEventListener('click', follow); };
  }, []);
  let hash = '';
  try { hash = decodeURIComponent(state.hash); } catch { /* Invalid paths resolve to the feed. */ }
  return {
    about: state.pathname.replace(/\/$/, '').endsWith('/About'), me: hash === '#/me',
    search: hash === '#/search', explore: hash === '#/explore', settings: hash === '#/settings', activity: hash === '#/activity', compose: hash === '#/compose',
    profileHandle: /^#\/profile\/([a-z][a-z0-9_]{2,19})$/.exec(hash)?.[1] || null,
    postId: /^#\/posts\/([^/]+)$/.exec(hash)?.[1] || null,
  };
}
export function useDesktop() {
  const [desktop, setDesktop] = useState(() => matchMedia('(min-width: 960px)').matches);
  useEffect(() => { const media = matchMedia('(min-width: 960px)'); const changed = () => setDesktop(media.matches); media.addEventListener('change', changed); return () => media.removeEventListener('change', changed); }, []);
  return desktop;
}
