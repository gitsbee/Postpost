import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { errorMessage } from '../model';
import { readProfile, type Profile } from '../profiles';

export function useProfile(uid: string | null | undefined) {
  const [state, setState] = useState<{ uid: string | null | undefined; profile: Profile | null; loading: boolean; error: string }>({ uid: null, profile: null, loading: false, error: '' });
  useEffect(() => {
    if (!db || !uid) { setState({ uid, profile: null, loading: false, error: '' }); return; }
    setState({ uid, profile: null, loading: true, error: '' });
    return onSnapshot(doc(db, 'profiles', uid), snapshot => setState({ uid, profile: readProfile(uid, snapshot.data()), loading: false, error: '' }), error => setState({ uid, profile: null, loading: false, error: errorMessage(error) }));
  }, [uid]);
  return state.uid === uid ? state : { uid, profile: null, loading: Boolean(uid), error: '' };
}
