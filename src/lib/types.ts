// Shared domain types for Revix.

export type Year = 10 | 11;

export interface Subject {
  id: string;
  name: string;
  blurb: string;
  color: string;
  icon: string;
  years: Year[];
}

export interface Topic {
  id: string;
  subject: string;
  year: Year;
  term: string | null;
  title: string;
  subtopics: string[];
}

export type QuestionType = 'mcq' | 'true_false' | 'short' | 'fill_blank' | 'numeric' | 'matching';

export type Difficulty = 'foundation' | 'standard' | 'higher';

export interface Question {
  id: string;
  subject: string;
  topic: string;
  years: Year[];
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options?: string[];
  /** mcq/true_false: string|boolean; numeric: number; matching: [left, right] pairs. */
  answer: string | number | boolean | string[][];
  accept?: string[];
  tolerance?: number;
  explanation?: string;
}

export type TopicStatus = 'not-started' | 'learning' | 'mastered';

export interface TopicProgress {
  status: TopicStatus;
  attempts: number;
  bestScore: number;
  updatedAt: number;
}

export interface ActivityEvent {
  id: string;
  at: number;
  kind: 'quiz' | 'topic' | 'game' | 'match' | 'streak';
  subjectId?: string;
  topicId?: string;
  detail: string;
  xp: number;
  eventKey?: string;
}

export interface Profile {
  displayName: string;
  avatar: string;
  year: Year | null;
  subjects: string[];
  goalMinutes: number;
  onboarded: boolean;
}

/** Local (on-device) progress store — works with or without an account. */
export interface LocalStore {
  profile: Profile;
  lifetimeXp: number;
  streak: number;
  lastActiveDay: string;
  topicProgress: Record<string, TopicProgress>;
  activities: ActivityEvent[];
  settings: {
    sound: boolean;
    reduceMotion: boolean;
    dailyGoal: number;
  };
}

// ---------------------------------------------------------------------------
// Multiplayer
// ---------------------------------------------------------------------------

export type GameMode = 'duel' | 'royale' | 'team' | 'sprint';

export type RoomStatus = 'lobby' | 'countdown' | 'playing' | 'finished';

export type PlayerState = 'alive' | 'out' | 'finished';

/** A participant in a live room. Stored in `rooms/{id}.players`. */
export interface RoomPlayer {
  uid: string;
  name: string;
  avatar: string;
  team: 'a' | 'b';
  score: number;
  correct: number;
  wrong: number;
  state: PlayerState;
  /** Ordering helper for sprint/duel finishes. */
  finishedAt: number | null;
  /** Cached so results screens work after a player leaves. */
  eloBefore: number;
}

export interface RoomSettings {
  subject: string | null;
  topic: string | null;
  questionCount: number;
  secondsPerQuestion: number;
}

/**
 * A live match. Firestore doc: `rooms/{code}`.
 *
 * The question *ids* are resolved at match start so every client sees the
 * same set regardless of content updates; answers ship in the client bundle
 * (static hosting — see docs/multiplayer.md for the trust model).
 */
export interface Room {
  code: string;
  mode: GameMode;
  status: RoomStatus;
  hostId: string;
  createdAt: number;
  /** Epoch ms when `playing` began — clients derive the clock from this. */
  startedAt: number | null;
  questionIds: string[];
  settings: RoomSettings;
  players: Record<string, RoomPlayer>;
  /** Finished-match payouts, written once by the host. */
  results: MatchResults | null;
}

export interface MatchPlacement {
  uid: string;
  name: string;
  avatar: string;
  place: number;
  score: number;
  correct: number;
  eloDelta: number;
  xp: number;
}

export interface MatchResults {
  at: number;
  placements: MatchPlacement[];
}

export interface EloRecord {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  games: number;
}
