import type { Question, QuestionType } from './types';

export type AnswerValue = string | string[] | null;

export interface QuestionFilter {
  subject?: string | null;
  topic?: string | null;
  type?: QuestionType | null;
  excludeTypes?: QuestionType[];
  count?: number;
  shuffle?: boolean;
}

/** Deterministic PRNG so tests (and replayed matches) get stable shuffles. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function filterQuestions(pool: Question[], f: QuestionFilter): Question[] {
  return pool.filter((q) => {
    if (f.subject && q.subject !== f.subject) return false;
    if (f.topic && q.topic !== f.topic) return false;
    if (f.type && q.type !== f.type) return false;
    if (f.excludeTypes && f.excludeTypes.includes(q.type)) return false;
    return true;
  });
}

/** Pick up to `count` questions (fewer if the filter is narrow). */
export function selectQuestions(
  pool: Question[],
  f: QuestionFilter & { seed?: number },
): Question[] {
  const matched = filterQuestions(pool, f);
  const rand = mulberry32(f.seed ?? Date.now() % 2147483647);
  const picked = f.shuffle === false ? matched : shuffle(matched, rand);
  const count = f.count ?? picked.length;
  return picked.slice(0, count);
}

export function isCorrect(q: Question, given: AnswerValue): boolean {
  if (given === null || given === undefined) return false;
  const type = q.type;

  if (type === 'mcq' || type === 'true_false') {
    return String(given).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
  }

  if (type === 'numeric') {
    const g = Number(String(given).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(g)) return false;
    return Math.abs(g - Number(q.answer)) <= (q.tolerance ?? 0) + 1e-9;
  }

  const accepted = [q.answer, ...(q.accept ?? [])].flat().map((a) =>
    String(a).trim().toLowerCase(),
  );
  if (Array.isArray(given)) {
    return given.every((g) => accepted.includes(String(g).trim().toLowerCase()));
  }
  return accepted.includes(String(given).trim().toLowerCase());
}

/** Stable id for de-duplicating awarded XP across retries. */
export function eventKey(parts: (string | number)[]): string {
  return parts.join(':');
}
