import { describe, expect, it } from 'vitest';
import { RANKS, rankFor } from './ranks';

describe('ranks', () => {
  it('starts everyone at Rookie', () => {
    expect(rankFor(0).rank.id).toBe('rookie');
    expect(rankFor(-50).rank.id).toBe('rookie');
  });
  it('climbs thresholds in order', () => {
    const ids = [0, 150, 400, 800, 1500, 3000, 5500, 9000].map((xp) => rankFor(xp).rank.id);
    expect(ids).toEqual(['rookie', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'champion']);
  });
  it('reports progress to the next rank', () => {
    const p = rankFor(275); // halfway bronze(150)→silver(400)
    expect(p.rank.id).toBe('bronze');
    expect(p.next?.id).toBe('silver');
    expect(p.progress).toBeCloseTo(0.5);
    expect(p.xpNeeded).toBe(125);
  });
  it('maxes out at champion with no next rank', () => {
    const p = rankFor(50_000);
    expect(p.rank.id).toBe('champion');
    expect(p.next).toBeNull();
    expect(p.progress).toBe(1);
    expect(p.xpNeeded).toBe(0);
  });
  it('never drops a rank for low XP (no relegation)', () => {
    expect(rankFor(9000).rank.id).toBe('champion');
    expect(rankFor(8999).rank.id).toBe('master');
  });
  it('defines 8 ordered ranks', () => {
    expect(RANKS).toHaveLength(8);
    const mins = RANKS.map((r) => r.minXp);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });
});
