import type { CSSProperties } from 'react';
const paths = {
  comment: <path d="M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-6 4V5a2 2 0 0 1 2-2Z" />,
  back: <path d="m14 5-7 7 7 7M7 12h14" />,
  home: <><path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10" /></>,
  flame: <path d="M12 2c2 5-2 6 1 9 1-2 2-3 3-4 1 3 5 6 4 10a8 8 0 0 1-16-1c0-5 5-7 8-14Z" />,
  post: <><path d="M4 3h16v12l-6 6H4Z" /><path d="M14 21v-6h6M8 8h8M8 12h5" /></>,
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1" /></>,
  settings: <><path d="M3 7h18M3 17h18" /><circle cx="8" cy="7" r="3" /><circle cx="16" cy="17" r="3" /></>,
  activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,

  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></>,
  like: <path d="M7 10v11H3V10zm0 1 5-9c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7" />,
  dislike: <g transform="rotate(180 12 12)"><path d="M7 10v11H3V10zm0 1 5-9c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7" /></g>,
  repeat: <><path d="m16 2 4 4-4 4M20 6H6a3 3 0 0 0-3 3v3M8 22l-4-4 4-4M4 18h14a3 3 0 0 0 3-3v-3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  edit: <><path d="m15 3 6 6-11 11-7 1 1-7zM12 6l6 6" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 5a3 3 0 0 1 0 6M20 21v-2a7 7 0 0 0-3-5" /></>,
  link: <><path d="m9 15 6-6M9 17l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M15 7l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 11v6M12 7v.1" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  logout: <><path d="M9 3H3v18h6M9 12h12m-4-4 4 4-4 4" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  external: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" /></>,
};
export default function Icon({ name, filled = false, style }: { name: keyof typeof paths; filled?: boolean; style?: CSSProperties }) {
  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={style}>{paths[name]}</svg>;
}
