import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Activity, ActivityKind, CustomDeck, FlashState, Profile, StoreShape, TopicProgress, TopicStatus, UserTopic,
} from './types';

const KEY = 'revix:v1';

export const AVATARS = ['🚀', '📚', '🧪', '🎨', '⚽', '🎮', '🌟', '🐬', '🦊', '🤖', '🎧', '📖'];

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-quiz', name: 'First Quiz', desc: 'Complete your first quiz', emoji: '🎯' },
  { id: 'first-topic', name: 'First Topic Completed', desc: 'Mark a topic as mastered', emoji: '✅' },
  { id: 'flashcard-starter', name: 'Flashcard Starter', desc: 'Review 10 flashcards', emoji: '🃏' },
  { id: 'perfect-quiz', name: 'Perfect Quiz', desc: 'Score 100% on a quiz (5+ questions)', emoji: '💯' },
  { id: 'streak-5', name: 'Five-Day Streak', desc: 'Revise 5 days in a row', emoji: '🔥' },
  { id: 'ten-topics', name: 'Ten Topics Revised', desc: 'Master 10 topics', emoji: '📚' },
  { id: 'science-explorer', name: 'Science Explorer', desc: 'Complete 5 science quizzes', emoji: '🧪' },
  { id: 'maths-champion', name: 'Maths Practice Champion', desc: 'Answer 25 maths questions correctly', emoji: '🧮' },
  { id: 'consistent-learner', name: 'Consistent Learner', desc: 'Reach 500 lifetime XP', emoji: '⭐' },
  { id: 'game-on', name: 'Game On', desc: 'Play any revision game', emoji: '🎮' },
  { id: 'exam-ready', name: 'Exam Ready', desc: 'Complete an exam-practice session', emoji: '📝' },
  { id: 'goal-crusher', name: 'Goal Crusher', desc: 'Hit your daily XP goal', emoji: '🏆' },
];

const SCIENCE = new Set(['combined-science', 'biology', 'chemistry', 'physics']);

function defaultProfile(): Profile {
  return {
    displayName: '', avatar: '🚀', year: null, subjects: [], mathsTier: 'unknown',
    scienceRoute: 'unknown', examBoard: '', dailyGoalMin: 20, theme: 'dark',
    sound: true, reducedMotion: false, onboarded: false, guestMode: false,
  };
}

function defaults(): StoreShape {
  return {
    version: 1, profile: defaultProfile(), topicProgress: {}, userTopics: [],
    activities: [], achievements: {}, flash: {}, decks: [], lastSeasonSeen: null, onboardedAt: null,
  };
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    if (parsed.version !== 1) return { ...defaults(), ...parsed, version: 1 };
    return { ...defaults(), ...parsed, profile: { ...defaultProfile(), ...(parsed.profile ?? {}) } };
  } catch {
    return defaults();
  }
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStreak(activities: Activity[], now = Date.now()): number {
  const days = new Set(activities.map((a) => dayKey(a.at)));
  let streak = 0;
  const d = new Date(now);
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1); // allow today pending
  while (days.has(dayKey(d.getTime()))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

interface AddActivityOpts {
  kind: ActivityKind;
  subjectId?: string | null;
  topicId?: string | null;
  detail?: string;
  xp: number;
  correct?: number;
  total?: number;
  eventKey?: string;
  at?: number;
}

interface StoreCtx {
  store: StoreShape;
  updateProfile: (patch: Partial<Profile>) => void;
  setTopicStatus: (topicId: string, status: TopicStatus) => void;
  setTopicMeta: (topicId: string, patch: Partial<TopicProgress>) => void;
  addUserTopic: (t: Omit<UserTopic, 'custom' | 'source' | 'verification' | 'url'>) => void;
  removeUserTopic: (id: string) => void;
  addActivity: (opts: AddActivityOpts) => Activity | null;
  recordFlashReview: (cardId: string, state: FlashState) => void;
  unlock: (id: string) => void;
  upsertDeck: (deck: CustomDeck) => void;
  removeDeck: (id: string) => void;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string };
  resetLocal: () => void;
  totalXp: number;
  streak: number;
  accuracy: number;
  quizzesTaken: number;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<StoreShape>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch { /* storage full — keep in-memory */ }
  }, [store]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.profile.theme);
    document.documentElement.setAttribute('data-reduced-motion', String(store.profile.reducedMotion));
  }, [store.profile.theme, store.profile.reducedMotion]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setStore((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const setTopicStatus = useCallback((topicId: string, status: TopicStatus) => {
    setStore((s) => {
      const prev = s.topicProgress[topicId];
      const next: TopicProgress = {
        status,
        difficult: prev?.difficult ?? false,
        notes: prev?.notes ?? '',
        reminders: prev?.reminders ?? [],
        updatedAt: Date.now(),
      };
      return {
        ...s,
        topicProgress: { ...s.topicProgress, [topicId]: next },
      };
    });
  }, []);

  const setTopicMeta = useCallback((topicId: string, patch: Partial<TopicProgress>) => {
    setStore((s) => {
      const prev = s.topicProgress[topicId];
      const next: TopicProgress = {
        status: patch.status ?? prev?.status ?? 'not-started',
        difficult: patch.difficult ?? prev?.difficult ?? false,
        notes: patch.notes ?? prev?.notes ?? '',
        reminders: patch.reminders ?? prev?.reminders ?? [],
        updatedAt: Date.now(),
      };
      return {
        ...s,
        topicProgress: { ...s.topicProgress, [topicId]: next },
      };
    });
  }, []);

  const addUserTopic = useCallback((t: Omit<UserTopic, 'custom' | 'source' | 'verification' | 'url'>) => {
    setStore((s) => ({ ...s, userTopics: [...s.userTopics, { ...t, custom: true as const, source: 'user' as const, verification: 'user' as const, url: null }] }));
  }, []);

  const removeUserTopic = useCallback((id: string) => {
    setStore((s) => ({ ...s, userTopics: s.userTopics.filter((t) => t.id !== id) }));
  }, []);

  const unlock = useCallback((id: string) => {
    setStore((s) => (s.achievements[id] ? s : { ...s, achievements: { ...s.achievements, [id]: Date.now() } }));
  }, []);

  const addActivity = useCallback((opts: AddActivityOpts): Activity | null => {
    let created: Activity | null = null;
    setStore((s) => {
      const eventKey = opts.eventKey ?? uid();
      if (s.activities.some((a) => a.eventKey === eventKey)) return s; // duplicate prevention
      const at = opts.at ?? Date.now();
      created = {
        id: uid(), kind: opts.kind, subjectId: opts.subjectId ?? null, topicId: opts.topicId ?? null,
        detail: opts.detail ?? '', xp: Math.max(0, Math.min(200, Math.floor(opts.xp))),
        correct: opts.correct ?? 0, total: opts.total ?? 0, at, eventKey,
      };
      const activities = [...(created ? [created] : []), ...s.activities].slice(0, 500);
      // achievement checks
      const ach = { ...s.achievements };
      const grant = (id: string) => { if (!ach[id]) ach[id] = at; };
      const quizzes = activities.filter((a) => a.kind === 'quiz');
      if (quizzes.length >= 1) grant('first-quiz');
      if ((opts.kind === 'quiz' || opts.kind === 'exam') && opts.total && opts.correct === opts.total && opts.total >= 5) grant('perfect-quiz');
      if (opts.kind === 'game') grant('game-on');
      if (opts.kind === 'exam') grant('exam-ready');
      if (quizzes.filter((q) => q.subjectId && SCIENCE.has(q.subjectId)).length >= 5) grant('science-explorer');
      const mathsCorrect = activities.filter((a) => a.subjectId === 'maths').reduce((x, a) => x + a.correct, 0);
      if (mathsCorrect >= 25) grant('maths-champion');
      const totalXp = activities.reduce((x, a) => x + a.xp, 0);
      if (totalXp >= 500) grant('consistent-learner');
      const mastered = Object.values({ ...s.topicProgress }).filter((p) => (p as TopicProgress).status === 'mastered').length;
      if (mastered >= 1) grant('first-topic');
      if (mastered >= 10) grant('ten-topics');
      if (computeStreak(activities, at) >= 5) grant('streak-5');
      return { ...s, activities, achievements: ach };
    });
    return created;
  }, []);

  const recordFlashReview = useCallback((cardId: string, state: FlashState) => {
    setStore((s) => {
      const reviews = Object.values(s.flash).reduce((x, f) => x + (f.reviews ?? 0), 0) + 1;
      const ach = { ...s.achievements };
      if (reviews >= 10 && !ach['flashcard-starter']) ach['flashcard-starter'] = Date.now();
      return { ...s, flash: { ...s.flash, [cardId]: state }, achievements: ach };
    });
  }, []);

  const upsertDeck = useCallback((deck: CustomDeck) => {
    setStore((s) => {
      const exists = s.decks.some((d) => d.id === deck.id);
      return { ...s, decks: exists ? s.decks.map((d) => (d.id === deck.id ? deck : d)) : [...s.decks, deck] };
    });
  }, []);

  const removeDeck = useCallback((id: string) => {
    setStore((s) => ({ ...s, decks: s.decks.filter((d) => d.id !== id) }));
  }, []);

  const exportData = useCallback(() => JSON.stringify(store, null, 2), [store]);

  const importData = useCallback((json: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(json) as Partial<StoreShape>;
      if (!parsed || parsed.version !== 1 || typeof parsed.profile !== 'object') {
        return { ok: false, error: 'Not a valid Revix export (expected version 1).' };
      }
      if (parsed.activities && !Array.isArray(parsed.activities)) return { ok: false, error: 'Invalid activities.' };
      if (parsed.decks && !Array.isArray(parsed.decks)) return { ok: false, error: 'Invalid decks.' };
      setStore({ ...defaults(), ...parsed, profile: { ...defaultProfile(), ...(parsed.profile as Profile) } });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not parse JSON.' };
    }
  }, []);

  const resetLocal = useCallback(() => {
    setStore(defaults());
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
  }, []);

  const derived = useMemo(() => {
    const totalXp = store.activities.reduce((s, a) => s + a.xp, 0);
    const streak = computeStreak(store.activities);
    const answered = store.activities.reduce((s, a) => s + a.correct, 0);
    const asked = store.activities.reduce((s, a) => s + a.total, 0);
    // goal-crusher: daily XP goal = dailyGoalMin * 5 XP per minute
    const goal = store.profile.dailyGoalMin * 5;
    const todayXp = store.activities
      .filter((a) => dayKey(a.at) === dayKey(Date.now()))
      .reduce((s, a) => s + a.xp, 0);
    return {
      totalXp, streak,
      accuracy: asked === 0 ? 0 : answered / asked,
      quizzesTaken: store.activities.filter((a) => a.kind === 'quiz').length,
      goalMet: goal > 0 && todayXp >= goal,
      todayXp, goal,
    };
  }, [store.activities, store.profile.dailyGoalMin]);

  useEffect(() => {
    if (derived.goalMet) {
      setStore((s) => (s.achievements['goal-crusher'] ? s : { ...s, achievements: { ...s.achievements, ['goal-crusher']: Date.now() } }));
    }
  }, [derived.goalMet]);

  const value: StoreCtx = {
    store, updateProfile, setTopicStatus, setTopicMeta, addUserTopic, removeUserTopic,
    addActivity, recordFlashReview, unlock, upsertDeck, removeDeck, exportData, importData, resetLocal,
    totalXp: derived.totalXp, streak: derived.streak,
    accuracy: derived.accuracy, quizzesTaken: derived.quizzesTaken,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
