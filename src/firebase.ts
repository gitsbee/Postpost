import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};

export const missingConfig = Object.entries(config)
  .filter(([, value]) => !value)
  .map(([key]) => key);

// An unconfigured checkout renders a setup screen, without contacting Firebase.
const app = missingConfig.length === 0 ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app, 'asia-northeast3') : null;

// Only local development with a non-production demo project may use emulators.
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true'
  && config.projectId === 'demo-postpost' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
  if (auth) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  if (functions) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  if (db) connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
