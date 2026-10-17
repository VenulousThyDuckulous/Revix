import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export function isConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;

function getApp(): FirebaseApp | null {
  if (!isConfigured()) return null;
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  }
  return app;
}

export function firebaseAuth(): Auth | null {
  const a = getApp();
  return a ? getAuth(a) : null;
}

export function firebaseDb(): Firestore | null {
  const a = getApp();
  return a ? getFirestore(a) : null;
}

export const FIREBASE_HELP =
  'Online accounts and ranks need Firebase. See docs/firebase-setup.md — create a project, enable Email/Password sign-in and Firestore, then set the VITE_FIREBASE_* variables.';
