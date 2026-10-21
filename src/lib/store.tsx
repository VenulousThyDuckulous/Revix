import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ActivityEvent, LocalStore, Profile, TopicProgress, TopicStatus } from './types';
import { uid } from './ids';

const KEY = 'revix:store:v1';

export const DEFAULT_PROFILE: Profile = {
  displayName: '',
  avatar: '🚀',
  year: null,
  subjects: [],
  goalMinutes: 15,
  onboarded: false,
};

export function defaultStore(): LocalStore {
  return {
    profile: { ...DEFAULT_PROFILE },
    lifetimeXp: 0,
    streak: 0,
    lastActiveDay: '',
    topicProgress: {},
    activities: [],
    settings: { sound: true, reduceMotion: false, dailyGoal: 15 },
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey(): string {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function loadStore(): LocalStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return { ...defaultStore(), ...parsed, profile: { ...DEFAULT_PROFILE, ...parsed.profile } };
  } catch {
    return defaultStore();
  }
}

function save(store: LocalStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Quota/private-mode failures must not break the UI.
  }
}

/** Merge streak bookkeeping — called once per app open. */
function withStreak(s: LocalStore): LocalStore {
  const today = todayKey();
  if (s.lastActiveDay === today) return s;
  const streak = s.lastActiveDay === yesterdayKey() ? s.streak : s.lastActiveDay ? 0 : s.streak;
  return { ...s, streak, lastActiveDay: today };
}

interface StoreCtx {
  store: LocalStore;
  /** Lifetime XP that accounts (not guests) see — local total. */
  totalXp: number;
  setProfile: (p: Partial<Profile>) => void;
  setSettings: (s: Partial<LocalStore['settings']>) => void;
  setTopicStatus: (topicId: string, status: TopicStatus, bestScore?: number) => void;
  /** Award XP exactly once per eventKey — retries/double-clicks can't farm XP. */
  addActivity: (e: Omit<ActivityEvent, 'id' | 'at'>) => number;
  resetAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<LocalStore>(() => withStreak(loadStore()));

  useEffect(() => {
    save(store);
  }, [store]);

  const setProfile = useCallback((p: Partial<Profile>) => {
    setStore((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  }, []);

  const setSettings = useCallback((patch: Partial<LocalStore['settings']>) => {
    setStore((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const setTopicStatus = useCallback((topicId: string, status: TopicStatus, bestScore?: number) => {
    setStore((s) => {
      const prev: TopicProgress = s.topicProgress[topicId] ?? {
        status: 'not-started',
        attempts: 0,
        bestScore: 0,
        updatedAt: 0,
      };
      const next: TopicProgress = {
        status,
        attempts: prev.attempts + (bestScore !== undefined ? 1 : 0),
        bestScore: Math.max(prev.bestScore, bestScore ?? 0),
        updatedAt: Date.now(),
      };
      return { ...s, topicProgress: { ...s.topicProgress, [topicId]: next } };
    });
  }, []);

  const addActivity = useCallback((e: Omit<ActivityEvent, 'id' | 'at'>): number => {
    let awarded = 0;
    setStore((s) => {
      if (e.eventKey && s.activities.some((a) => a.eventKey === e.eventKey)) return s;
      const event: ActivityEvent = { ...e, id: uid(), at: Date.now() };
      const delta = Math.max(0, e.xp);
      awarded = delta;
      const next: LocalStore = {
        ...s,
        lifetimeXp: s.lifetimeXp + delta,
        activities: [event, ...s.activities].slice(0, 200),
        streak: s.streak === 0 ? 1 : s.streak,
      };
      return next;
    });
    return awarded;
  }, []);

  const resetAll = useCallback(() => {
    setStore(defaultStore());
  }, []);

  const value = useMemo<StoreCtx>(
    () => ({
      store,
      totalXp: store.lifetimeXp,
      setProfile,
      setSettings,
      setTopicStatus,
      addActivity,
      resetAll,
    }),
    [store, setProfile, setSettings, setTopicStatus, addActivity, resetAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
