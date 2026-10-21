import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, firebaseConfigured } from './firebase';
import { ELO_START } from './ranks';

export interface AccountProfile {
  displayName: string;
  avatar: string;
  lifetimeXp: number;
  elo: number;
  eloWins: number;
  eloLosses: number;
  matchesPlayed: number;
}

interface AuthCtx {
  user: User | null;
  profile: AccountProfile | null;
  loading: boolean;
  configured: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  /** Get a uid for multiplayer — anonymous sign-in when allowed, else null. */
  ensureIdentity: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setLocalProfile: (p: Partial<AccountProfile>) => void;
}

const DEFAULT_PROFILE: AccountProfile = {
  displayName: '',
  avatar: '🚀',
  lifetimeXp: 0,
  elo: ELO_START,
  eloWins: 0,
  eloLosses: 0,
  matchesPlayed: 0,
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) setProfile(null);
    });
  }, []);

  const loadProfile = useCallback(async (u: User) => {
    const db = firebaseDb();
    if (!db) return;
    try {
      const snap = await getDoc(doc(db, 'profiles', u.uid));
      if (snap.exists()) {
        const v = snap.data() as Partial<AccountProfile>;
        setProfile({
          ...DEFAULT_PROFILE,
          ...v,
          displayName: v.displayName || u.displayName || 'revixer',
        });
      } else {
        const fresh: AccountProfile = {
          ...DEFAULT_PROFILE,
          displayName: u.displayName || 'revixer',
        };
        setProfile(fresh);
        await setDoc(
          doc(db, 'profiles', u.uid),
          { ...fresh, email: u.email, updatedAt: serverTimestamp() },
          { merge: true },
        );
      }
    } catch {
      // Offline — keep local profile null, caller falls back to device store.
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (user) void loadProfile(user);
  }, [user, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError('');
    const auth = firebaseAuth();
    if (!auth) {
      setError('Accounts are offline — Firebase keys are not configured.');
      return false;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (e) {
      setError(friendlyAuthError(e));
      return false;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setError('');
    const auth = firebaseAuth();
    if (!auth) {
      setError('Accounts are offline — Firebase keys are not configured.');
      return false;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      const db = firebaseDb();
      if (db) {
        const fresh: AccountProfile = { ...DEFAULT_PROFILE, displayName: name.trim() || 'revixer' };
        await setDoc(
          doc(db, 'profiles', cred.user.uid),
          { ...fresh, email: cred.user.email, createdAt: serverTimestamp() },
          { merge: true },
        );
        setProfile(fresh);
      }
      return true;
    } catch (e) {
      setError(friendlyAuthError(e));
      return false;
    }
  }, []);

  const ensureIdentity = useCallback(async (): Promise<boolean> => {
    const auth = firebaseAuth();
    if (!auth) return false;
    if (auth.currentUser) return true;
    try {
      await signInAnonymously(auth);
      return true;
    } catch {
      // Anonymous sign-in disabled in the Firebase console — the caller
      // tells the player to create an account instead.
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = firebaseAuth();
    if (auth) await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  const setLocalProfile = useCallback((p: Partial<AccountProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...p } : { ...DEFAULT_PROFILE, ...p }));
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      profile,
      loading,
      configured: firebaseConfigured,
      error,
      signIn,
      signUp,
      ensureIdentity,
      signOut,
      refreshProfile,
      setLocalProfile,
    }),
    [user, profile, loading, error, signIn, signUp, ensureIdentity, signOut, refreshProfile, setLocalProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function friendlyAuthError(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: string }).code) : '';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'Wrong email or password.';
  if (code.includes('user-not-found')) return 'No account with that email.';
  if (code.includes('email-already-in-use')) return 'That email already has an account.';
  if (code.includes('weak-password')) return 'Password needs at least 6 characters.';
  if (code.includes('too-many-requests')) return 'Too many attempts — try again shortly.';
  if (code.includes('network')) return 'Network error — check your connection.';
  return e instanceof Error ? e.message : 'Something went wrong.';
}
