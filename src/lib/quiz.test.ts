import { describe, expect, it } from 'vitest';
import { eventKey, filterQuestions, isCorrect, selectQuestions } from './quiz';
import type { Question } from './types';

const q = (over: Partial<Question>): Question => ({
  id: 'x',
  subject: 'maths',
  topic: '',
  years: [10],
  type: 'mcq',
  difficulty: 'standard',
  question: '?',
  options: ['a', 'b'],
  answer: 'a',
  ...over,
});

describe('isCorrect', () => {
  it('matches mcq answers case-insensitively', () => {
    expect(isCorrect(q({ type: 'mcq', answer: 'Alliteration' }), 'alliteration')).toBe(true);
    expect(isCorrect(q({ type: 'mcq', answer: 'Alliteration' }), '  Alliteration ')).toBe(true);
    expect(isCorrect(q({ type: 'mcq', answer: 'a' }), 'b')).toBe(false);
  });

  it('handles true/false answers case-insensitively', () => {
    const tf = q({ type: 'true_false', answer: true });
    expect(isCorrect(tf, 'True')).toBe(true);
    expect(isCorrect(tf, 'true')).toBe(true);
    const ff = q({ type: 'true_false', answer: false });
    expect(isCorrect(ff, 'False')).toBe(true);
    expect(isCorrect(ff, 'True')).toBe(false);
  });

  it('parses numeric answers with optional tolerance', () => {
    const n = q({ type: 'numeric', answer: 30, tolerance: 0.5 });
    expect(isCorrect(n, '30')).toBe(true);
    expect(isCorrect(n, '30.4')).toBe(true);
    expect(isCorrect(n, '31')).toBe(false);
    expect(isCorrect(n, 'not a number')).toBe(false);
    expect(isCorrect(q({ type: 'numeric', answer: 2.5 }), '2.5')).toBe(true);
  });

  it('accepts alternate spellings via accept list', () => {
    const s = q({ type: 'short', answer: 'first person', accept: ['1st person', 'first-person'] });
    expect(isCorrect(s, 'First Person')).toBe(true);
    expect(isCorrect(s, 'first-person')).toBe(true);
    expect(isCorrect(s, 'third person')).toBe(false);
  });

  it('rejects null/empty input', () => {
    expect(isCorrect(q({}), null)).toBe(false);
    expect(isCorrect(q({}), '')).toBe(false);
  });
});

describe('filterQuestions', () => {
  const pool = [
    q({ id: '1', subject: 'maths', type: 'mcq' }),
    q({ id: '2', subject: 'maths', type: 'short' }),
    q({ id: '3', subject: 'english', type: 'mcq' }),
    q({ id: '4', subject: 'english', type: 'matching' }),
  ];

  it('filters by subject and type', () => {
    expect(filterQuestions(pool, { subject: 'maths' }).map((x) => x.id)).toEqual(['1', '2']);
    expect(filterQuestions(pool, { type: 'mcq' }).map((x) => x.id)).toEqual(['1', '3']);
    expect(filterQuestions(pool, { subject: 'english', type: 'mcq' }).map((x) => x.id)).toEqual(['3']);
  });

  it('honours excludeTypes', () => {
    expect(filterQuestions(pool, { excludeTypes: ['matching'] }).map((x) => x.id)).toEqual(['1', '2', '3']);
  });
});

describe('selectQuestions', () => {
  const pool = Array.from({ length: 20 }, (_, i) => q({ id: `q${i}`, subject: 'maths' }));

  it('caps at count', () => {
    expect(selectQuestions(pool, { count: 5, seed: 1 })).toHaveLength(5);
  });

  it('returns everything when no count given', () => {
    expect(selectQuestions(pool, { seed: 1 })).toHaveLength(20);
  });

  it('is deterministic for a seed (same match questions for all clients)', () => {
    const a = selectQuestions(pool, { count: 8, seed: 99 }).map((x) => x.id);
    const b = selectQuestions(pool, { count: 8, seed: 99 }).map((x) => x.id);
    expect(a).toEqual(b);
  });

  it('different seeds give a different order', () => {
    const a = selectQuestions(pool, { count: 20, seed: 1 }).map((x) => x.id);
    const b = selectQuestions(pool, { count: 20, seed: 2 }).map((x) => x.id);
    expect(a).not.toEqual(b);
  });

  it('shuffle:false preserves order', () => {
    const out = selectQuestions(pool, { count: 5, shuffle: false, seed: 7 }).map((x) => x.id);
    expect(out).toEqual(['q0', 'q1', 'q2', 'q3', 'q4']);
  });
});

describe('eventKey', () => {
  it('joins parts into a stable string', () => {
    expect(eventKey(['lesson', 'topic-1', 2])).toBe('lesson:topic-1:2');
  });
});
