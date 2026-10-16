import { describe, expect, it } from 'vitest';
import { computeStreak, leagueXpToday, weeklyLeagueXp } from './store';
import type { Activity } from './types';

const act = (at: number, leagueXp = 10, xp = 10): Activity => ({
  id: String(at), kind: 'quiz', subjectId: 'maths', topicId: null, detail: '',
  xp, leagueXp, correct: 1, total: 1, at, eventKey: String(at),
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
    expect(weeklyLeagueXp([])).toBe(0);
    expect(leagueXpToday([])).toBe(0);
  });
  it('computes weekly XP from Monday boundary', () => {
    // Monday 2026-10-12 12:00 UTC
    const now = new Date('2026-10-14T12:00:00Z').getTime();
    const monday = new Date('2026-10-12T12:00:00Z').getTime();
    const sunday = new Date('2026-10-11T12:00:00Z').getTime();
    expect(weeklyLeagueXp([act(monday, 20), act(sunday, 99)], now)).toBe(20);
  });
});
