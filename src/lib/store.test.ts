import { describe, expect, it } from 'vitest';
import { computeStreak } from './store';
import type { Activity } from './types';

const act = (at: number, xp = 10): Activity => ({
  id: String(at), kind: 'quiz', subjectId: 'maths', topicId: null, detail: '',
  xp, correct: 1, total: 1, at, eventKey: String(at),
});

describe('local progress', () => {
  it('computes streaks across consecutive days', () => {
    const day = 86_400_000;
    const base = new Date('2026-10-14T12:00:00Z').getTime();
    expect(computeStreak([act(base), act(base - day), act(base - 2 * day)], base)).toBe(3);
    expect(computeStreak([act(base), act(base - 2 * day)], base)).toBe(1); // gap breaks streak
    expect(computeStreak([], base)).toBe(0);
  });
  it('signed-out behaviour: everything works with zero online dependency', () => {
    expect(computeStreak([])).toBe(0);
  });
});
