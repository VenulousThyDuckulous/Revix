import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword, deleteUser, onAuthStateChanged,
  signInWithEmailAndPassword, signOut as fbSignOut, updateProfile as fbUpdateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isConfigured } from './firebase';

export interface OnlineProfile {
  displayName: string;
  avatar: string;
  lifetimeXp: number;
  updatedAt: number;
}

interface AuthCtx {
  configured: boolean;
  user: User | null;
  onlineProfile: OnlineProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

const Ctx = createContext<AuthCtx>({
  configured: false, user: null, onlineProfile: null, loading: false,
  signUp: async () => ({ error: 'Online accounts are not configured.' }),
  signIn: async () => ({ error: 'Online accounts are not configured.' }),
  signOut: async () => {},
  deleteAccount: async () => ({ error: 'Online accounts are not configured.' }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [onlineProfile, setOnlineProfile] = useState<OnlineProfile | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const db = firebaseDb();
    if (!db || !user) {
      setOnlineProfile(null);
      return;
    }
    getDoc(doc(db, 'profiles', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data() as Partial<OnlineProfile>;
          setOnlineProfile({
            displayName: String(d.displayName ?? user.displayName ?? 'revixer'),
            avatar: String(d.avatar ?? '🚀'),
            lifetimeXp: Number(d.lifetimeXp ?? 0),
            updatedAt: Number(d.updatedAt ?? 0),
          });
        } else {
          setOnlineProfile({
            displayName: user.displayName ?? user.email?.split('@')[0] ?? 'revixer',
            avatar: '🚀', lifetimeXp: 0, updatedAt: Date.now(),
          });
        }
      })
      .catch(() => setOnlineProfile(null));
  }, [user]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const auth = firebaseAuth();
    if (!auth) return { error: 'Online accounts are not configured.' };
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await fbUpdateProfile(cred.user, { displayName: displayName || email.split('@')[0] });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign up failed.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const auth = firebaseAuth();
    if (!auth) return { error: 'Online accounts are not configured.' };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign in failed.' };
    }
  };

  const signOut = async () => {
    const auth = firebaseAuth();
    if (auth) await fbSignOut(auth);
    setUser(null);
    setOnlineProfile(null);
  };

  const deleteAccount = async () => {
    const auth = firebaseAuth();
    if (!auth?.currentUser) return { error: 'Not signed in.' };
    try {
      // Profile doc cleanup is best-effort; rules allow users to delete their own doc
      // (see firestore.rules). Auth deletion may require a recent sign-in.
      await deleteUser(auth.currentUser);
      setUser(null);
      setOnlineProfile(null);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Deletion failed — try signing in again first.' };
    }
  };

  return (
    <Ctx.Provider value={{ configured, user, onlineProfile, loading, signUp, signIn, signOut, deleteAccount }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
