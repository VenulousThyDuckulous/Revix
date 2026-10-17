export type Year = 10 | 11;
export type TopicStatus = 'not-started' | 'learning' | 'mastered';
export type Verification = 'verified' | 'partially_verified' | 'supplementary' | 'unavailable' | 'user';

export interface Subject {
  id: string;
  name: string;
  years: Year[];
  color: string;
  icon: string;
  blurb: string;
}

export interface Topic {
  id: string;
  subject: string;
  year: Year;
  term: string | null;
  title: string;
  subtopics: string[];
  source: 'school' | 'supplementary' | 'user';
  verification: Verification;
  examBoard: string | null;
  tier: 'all' | 'foundation' | 'higher' | null;
  practical: string | null;
  url: string | null;
}

export type QuestionType = 'mcq' | 'true_false' | 'short' | 'fill_blank' | 'numeric' | 'matching';

export interface Question {
  id: string;
  subject: string;
  topic: string;
  years: Year[];
  type: QuestionType;
  difficulty: 'foundation' | 'standard' | 'higher';
  question: string;
  options?: string[];
  answer: string | number | boolean | string[][];
  accept?: string[];
  tolerance?: number;
  unit?: string | null;
  pairs?: string[][];
  explanation: string;
  source: string;
}

export type ActivityKind = 'quiz' | 'flashcards' | 'game' | 'exam' | 'topic';

export interface Activity {
  id: string;
  kind: ActivityKind;
  subjectId: string | null;
  topicId: string | null;
  detail: string;
  xp: number;
  correct: number;
  total: number;
  at: number;
  eventKey: string;
}

export interface TopicProgress {
  status: TopicStatus;
  difficult: boolean;
  notes: string;
  reminders: string[];
  updatedAt: number;
}

export interface UserTopic extends Topic {
  custom: true;
}

export interface FlashState {
  ease: number;
  intervalDays: number;
  due: number;
  lastReview: number | null;
  reviews: number;
  knownCount: number;
}

export interface CustomCard {
  id: string;
  front: string;
  back: string;
}

export interface CustomDeck {
  id: string;
  name: string;
  subject: string;
  cards: CustomCard[];
  createdAt: number;
}

export interface Profile {
  displayName: string;
  avatar: string;
  year: Year | null;
  subjects: string[];
  mathsTier: 'foundation' | 'higher' | 'unknown';
  scienceRoute: 'combined' | 'triple' | 'unknown';
  examBoard: string;
  dailyGoalMin: number;
  theme: 'dark' | 'light';
  sound: boolean;
  reducedMotion: boolean;
  onboarded: boolean;
  /** True when the user chose "continue without an account" (offline guest access). */
  guestMode: boolean;
}

export interface StoreShape {
  version: 1;
  profile: Profile;
  topicProgress: Record<string, TopicProgress>;
  userTopics: UserTopic[];
  activities: Activity[];
  achievements: Record<string, number>;
  flash: Record<string, FlashState>;
  decks: CustomDeck[];
  lastSeasonSeen: string | null;
  onboardedAt: number | null;
}
