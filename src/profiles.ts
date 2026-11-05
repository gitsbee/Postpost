import { doc, runTransaction, serverTimestamp, type Timestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import { normalizeHandle, validSocialUrl, validateProfile } from './profileValidation.mjs';

export type Profile = { uid: string; name: string; handle: string; bio: string; links: string[] };
export type HandleLimits = { last: Timestamp | null; previous: Timestamp | null };
export const HANDLE_WINDOW = 14 * 24 * 60 * 60 * 1000;
export function profileHref(handle: string) { return `${import.meta.env.BASE_URL}#/profile/${encodeURIComponent(handle)}`; }
export function readProfile(uid: string, data: Record<string, unknown> | undefined): Profile | null {
  if (!data || typeof data.name !== 'string' || typeof data.handle !== 'string') return null;
  return { uid, name: data.name, handle: data.handle, bio: typeof data.bio === 'string' ? data.bio : '', links: Array.isArray(data.links) ? data.links.filter((value): value is string => typeof value === 'string' && validSocialUrl(value)) : [] };
}
export async function saveProfile(user: User, name: string, rawHandle: string, bio: string, links: string[]) {
  if (!db) throw new Error('연결 설정을 확인해 주세요.');
  const handle = normalizeHandle(rawHandle);
  const invalid = validateProfile(name, handle, bio, links);
  if (invalid) throw new Error(invalid);
  const profileRef = doc(db, 'profiles', user.uid);
  const limitsRef = doc(db, 'profileLimits', user.uid);
  const nextRef = doc(db, 'handles', handle);
  await runTransaction(db, async tx => {
    const existing = await tx.get(profileRef);
    const changed = existing.exists() && existing.data().handle !== handle;
    const claiming = !existing.exists() || changed;
    const reservation = claiming ? await tx.get(nextRef) : null;
    const limits = changed ? await tx.get(limitsRef) : null;
    if (reservation?.exists()) throw new Error('이미 사용 중인 핸들이에요. 다른 핸들을 선택해 주세요.');
    if (changed) {
      const previous = limits?.data()?.previous as Timestamp | null;
      if (previous && previous.toMillis() > Date.now() - HANDLE_WINDOW) {
        throw new Error(`핸들은 최근 14일 동안 두 번까지 변경할 수 있어요. ${new Date(previous.toMillis() + HANDLE_WINDOW).toLocaleString('ko-KR')} 이후 다시 시도해 주세요.`);
      }
    }
    const data = { name: name.trim(), handle, bio: bio.trim(), links, updatedAt: serverTimestamp() };
    if (!existing.exists()) {
      tx.set(profileRef, { ...data, createdAt: serverTimestamp() });
      tx.set(limitsRef, { last: null, previous: null });
    } else tx.update(profileRef, data);
    if (claiming) tx.set(nextRef, { uid: user.uid });
    if (changed) {
      tx.delete(doc(db!, 'handles', existing.data().handle));
      tx.set(limitsRef, { last: serverTimestamp(), previous: limits?.data()?.last || null });
    }
  });
}
