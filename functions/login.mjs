// Deliberately return only a verified email, never tokens or account details on failure.
export async function resolveHandle({ handle, password }, { lookup, verify }) {
  const normalized = typeof handle === 'string' ? handle.trim().replace(/^@/, '').toLowerCase() : '';
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(normalized) || typeof password !== 'string' || !password || password.length > 4096) throw new Error('invalid-login');
  const user = await lookup(normalized);
  if (!user?.email || user.disabled) throw new Error('invalid-login');
  const result = await verify(user.email, password);
  if (!result || result.localId !== user.uid || !result.idToken || result.mfaPendingCredential || result.email?.toLowerCase() !== user.email.toLowerCase()) throw new Error('invalid-login');
  return { email: user.email };
}
