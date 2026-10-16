import type { Question } from './types';

export function normalizeShort(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Check a user's answer against a question. Returns { correct, acceptedAnswer }. */
export function checkAnswer(q: Question, given: unknown): { correct: boolean; acceptedAnswer: string } {
  switch (q.type) {
    case 'mcq': {
      const acceptedAnswer = String(q.answer);
      return { correct: normalizeShort(String(given ?? '')) === normalizeShort(acceptedAnswer), acceptedAnswer };
    }
    case 'true_false': {
      const truthy = given === true || normalizeShort(String(given ?? '')) === 'true';
      const acceptedAnswer = q.answer === true ? 'True' : 'False';
      return { correct: truthy === q.answer, acceptedAnswer };
    }
    case 'short':
    case 'fill_blank': {
      const candidates = [q.answer, ...(q.accept ?? [])].flat().map((a) => normalizeShort(String(a)));
      const g = normalizeShort(String(given ?? ''));
      return { correct: candidates.includes(g), acceptedAnswer: String([q.answer].flat()[0]) };
    }
    case 'numeric': {
      const acceptedAnswer = String(q.answer);
      const g = parseFloat(String(given ?? '').replace(/[^0-9.\-eE]/g, ''));
      if (Number.isNaN(g)) return { correct: false, acceptedAnswer };
      const tol = q.tolerance ?? 0;
      return { correct: Math.abs(g - Number(q.answer)) <= tol + 1e-9, acceptedAnswer };
    }
    case 'matching': {
      // given: Record<term, chosenMatch>
      const pairs = (q.pairs ?? q.answer) as string[][];
      const g = (given ?? {}) as Record<string, string>;
      const correct = pairs.every(([term, match]) => normalizeShort(g[term] ?? '') === normalizeShort(match));
      const acceptedAnswer = pairs.map(([t, m]) => `${t} → ${m}`).join('; ');
      return { correct, acceptedAnswer };
    }
    default:
      return { correct: false, acceptedAnswer: String(q.answer) };
  }
}

export interface QuizResult {
  correct: number;
  total: number;
  accuracy: number;
  xp: number;
  leagueXp: number;
}

/** XP: 10 per correct answer + completion bonus. League XP mirrors XP but is capped downstream. */
export function scoreQuiz(correct: number, total: number): QuizResult {
  const accuracy = total === 0 ? 0 : correct / total;
  const completionBonus = total > 0 ? 5 : 0;
  const perfectBonus = total > 0 && correct === total ? 10 : 0;
  const xp = correct * 10 + completionBonus + perfectBonus;
  return { correct, total, accuracy, xp, leagueXp: xp };
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a quiz selection: filter by subject/topic/year, shuffle, take n. */
export function selectQuestions(
  bank: Question[],
  opts: { subject?: string | null; topic?: string | null; year?: 10 | 11 | null; count?: number; shuffleOrder?: boolean },
): Question[] {
  let pool = bank;
  if (opts.subject) pool = pool.filter((q) => q.subject === opts.subject);
  if (opts.topic) {
    const byTopic = pool.filter((q) => q.topic === opts.topic);
    if (byTopic.length > 0) pool = byTopic;
  }
  if (opts.year) pool = pool.filter((q) => q.years.includes(opts.year as 10 | 11));
  if (opts.shuffleOrder !== false) pool = shuffle(pool);
  if (opts.count && opts.count > 0) pool = pool.slice(0, opts.count);
  return pool;
}
