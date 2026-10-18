import { describe, expect, it } from 'vitest';
import { RANKS, rankFor } from './ranks';

describe('ranks', () => {
  it('starts everyone at Unranked', () => {
    expect(rankFor(0).rank.id).toBe('unranked');
    expect(rankFor(-50).rank.id).toBe('unranked');
  });
  it('climbs thresholds in order', () => {
    const xps = [0, 150, 400, 800, 1500, 3000, 5500, 9000, 15000, 25000, 40000, 65000, 100000];
    const ids = xps.map((xp) => rankFor(xp).rank.id);
    expect(ids).toEqual([
      'unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion',
      'grand-champion', 'super-sonic-legend', 'hyper-sonic-legend', 'delta', 'sigma', 'alpha',
    ]);
  });
  it('reports progress to the next rank', () => {
    const p = rankFor(275); // halfway bronze(150)→silver(400)
    expect(p.rank.id).toBe('bronze');
    expect(p.next?.id).toBe('silver');
    expect(p.progress).toBeCloseTo(0.5);
    expect(p.xpNeeded).toBe(125);
  });
  it('maxes out at Alpha with no next rank', () => {
    const p = rankFor(200_000);
    expect(p.rank.id).toBe('alpha');
    expect(p.next).toBeNull();
    expect(p.progress).toBe(1);
    expect(p.xpNeeded).toBe(0);
  });
  it('never drops a rank for low XP (no relegation)', () => {
    expect(rankFor(100_000).rank.id).toBe('alpha');
    expect(rankFor(99_999).rank.id).toBe('sigma');
    expect(rankFor(8_999).rank.id).toBe('champion');
  });
  it('defines 13 ordered ranks', () => {
    expect(RANKS).toHaveLength(13);
    const mins = RANKS.map((r) => r.minXp);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });
});
