import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { resolveHandle } from './login.mjs';

initializeApp();
const webApiKey = defineString('AUTH_WEB_API_KEY', { default: '' });
export const resolveHandleLogin = onCall({ region: 'asia-northeast3', maxInstances: 5, timeoutSeconds: 20, memory: '256MiB', cors: true }, async request => {
  const store = getFirestore();
  const emulator = process.env.FUNCTIONS_EMULATOR === 'true';
  const key = emulator ? 'demo-public-key' : webApiKey.value();
  if (!key) throw new HttpsError('failed-precondition', '핸들 로그인을 준비 중입니다. 이메일로 로그인해 주세요.');
  const ip = request.rawRequest.ip || 'unknown';
  const bucket = createHash('sha256').update(ip).digest('hex');
  const ref = store.doc(`loginAttempts/${bucket}`);
  // Per-IP rolling window. Client rules deny all access to these records.
  await store.runTransaction(async tx => {
    const previous = await tx.get(ref); const now = Date.now();
    const start = previous.data()?.start?.toMillis() || 0;
    const active = now - start < 15 * 60 * 1000;
    if (active && previous.data().count >= 30) throw new HttpsError('resource-exhausted', '잠시 후 다시 시도해 주세요.');
    tx.set(ref, { start: Timestamp.fromMillis(active ? start : now), count: active ? previous.data().count + 1 : 1, expiresAt: Timestamp.fromMillis(now + 30 * 60 * 1000) });
  });
  try {
    return await resolveHandle(request.data || {}, {
      lookup: async handle => {
        const reservation = await store.doc(`handles/${handle}`).get();
        return reservation.exists ? getAuth().getUser(reservation.data().uid) : null;
      },
      verify: async (email, password) => {
        const host = emulator ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
        const response = await fetch(`${host}/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }), signal: AbortSignal.timeout(10_000),
        });
        return response.ok ? response.json() : null;
      },
    });
  } catch {
    // Do not log the password, provider response, email or token.
    throw new HttpsError('unauthenticated', '이메일 또는 핸들과 비밀번호를 확인해 주세요.');
  }
});
