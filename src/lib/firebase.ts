import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** True when all four build-time vars are present (GitHub Actions vars). */
export const firebaseConfigured = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseConfigured) {
  try {
    app = initializeApp(cfg as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch {
    // Misconfigured keys must never crash the app — we fall back to offline mode.
    app = null;
    auth = null;
    db = null;
  }
}

export function firebaseAuth(): Auth | null {
  return auth;
}

export function firebaseDb(): Firestore | null {
  return db;
}
