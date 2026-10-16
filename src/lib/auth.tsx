import { createContext, useContext, useEffect, useState } from 'react';
import { isOnlineConfigured, supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface OnlineProfile {
  displayName: string;
  avatar: string;
  tier: string;
  weekXp: number;
  lifetimeXp: number;
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
  const configured = isOnlineConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [onlineProfile, setOnlineProfile] = useState<OnlineProfile | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !user) {
      setOnlineProfile(null);
      return;
    }
    sb.from('profiles').select('display_name,avatar,tier,week_xp,lifetime_xp').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setOnlineProfile({
            displayName: data.display_name, avatar: data.avatar, tier: data.tier,
            weekXp: data.week_xp, lifetimeXp: data.lifetime_xp,
          });
        }
      });
  }, [user]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const sb = supabase();
    if (!sb) return { error: 'Online accounts are not configured.' };
    const { error } = await sb.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    return { error: error?.message ?? null };
  };
  const signIn = async (email: string, password: string) => {
    const sb = supabase();
    if (!sb) return { error: 'Online accounts are not configured.' };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  const signOut = async () => {
    await supabase()?.auth.signOut();
    setUser(null);
    setOnlineProfile(null);
  };
  const deleteAccount = async () => {
    const sb = supabase();
    if (!sb || !user) return { error: 'Not signed in.' };
    // Remove profile row; auth user deletion requires the service role (docs explain owner flow).
    const { error } = await sb.from('profiles').delete().eq('id', user.id);
    if (error) return { error: error.message };
    await sb.auth.signOut();
    setUser(null);
    return { error: null };
  };

  return (
    <Ctx.Provider value={{ configured, user, onlineProfile, loading, signUp, signIn, signOut, deleteAccount }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
