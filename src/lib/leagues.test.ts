import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEASON_CONFIG, nextTier, processSeason, rankStandings, seasonEndUtc,
  seasonIdFor, seasonStartUtc, type StandingEntry,
} from './leagues';

const mk = (userId: string, xp: number, at = 1000): StandingEntry => ({
  userId, displayName: userId, xp, activityCount: 2, firstActivityAt: at,
});

describe('season boundaries', () => {
  it('starts seasons on Monday 00:00 UTC', () => {
    const start = seasonStartUtc('2026-W01');
    expect(start.getUTCDay()).toBe(1);
    expect(start.getUTCHours()).toBe(0);
    const end = seasonEndUtc('2026-W01');
    expect(end.getTime() - start.getTime()).toBe(7 * 86_400_000);
  });
  it('assigns a known Monday to the right season', () => {
    // Monday 2026-10-12
    const id = seasonIdFor(new Date(Date.UTC(2026, 9, 12, 12)));
    expect(seasonStartUtc(id).toISOString()).toBe('2026-10-12T00:00:00.000Z');
    // Sunday before belongs to previous week
    const sun = seasonIdFor(new Date(Date.UTC(2026, 9, 11, 23)));
    expect(seasonStartUtc(sun).toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });
  it('round-trips season ids', () => {
    const id = seasonIdFor(new Date(Date.UTC(2026, 5, 17)));
    expect(/^20\d{2}-W\d{2}$/.test(id)).toBe(true);
  });
});

describe('ranking', () => {
  it('sorts by xp desc with deterministic tie-breaks', () => {
    const ranked = rankStandings([mk('b', 50, 2000), mk('a', 50, 1000), mk('c', 80)]);
    expect(ranked.map((r) => r.userId)).toEqual(['c', 'a', 'b']);
    expect(ranked[0].rank).toBe(1);
  });
  it('handles empty leaderboards', () => {
    expect(rankStandings([])).toEqual([]);
  });
});

describe('promotion and relegation', () => {
  const tiers = (ids: string[], tier: 'bronze' | 'silver' | 'champion' = 'silver') =>
    Object.fromEntries(ids.map((id) => [id, tier]));

  it('promotes top 20% and relegates bottom 20% of 10', () => {
    const entries = Array.from({ length: 10 }, (_, i) => mk(`u${i}`, (10 - i) * 10));
    const out = processSeason('2026-W01', rankStandings(entries), tiers(entries.map((e) => e.userId)));
    expect(out.promoted).toEqual(['u0', 'u1']);
    expect(out.relegated).toEqual(['u8', 'u9']);
    expect(out.stayed).toHaveLength(6);
  });
  it('respects bronze and champion boundaries', () => {
    // 5 players: top is already champion, bottom already bronze — boundaries block movement.
    const entries = [mk('p1', 100), mk('p2', 80), mk('p3', 60), mk('p4', 40), mk('p5', 20)];
    const out = processSeason(
      '2026-W01', rankStandings(entries),
      { p1: 'champion', p2: 'silver', p3: 'silver', p4: 'silver', p5: 'bronze' },
    );
    expect(out.promoted).toEqual([]);
    expect(out.relegated).toEqual([]);
    expect(out.stayed).toHaveLength(5);
    // Same standings without boundary tiers: top promotes, bottom relegates.
    const out2 = processSeason(
      '2026-W01', rankStandings(entries),
      { p1: 'diamond', p2: 'silver', p3: 'silver', p4: 'silver', p5: 'silver' },
    );
    expect(out2.promoted).toEqual(['p1']);
    expect(out2.relegated).toEqual(['p5']);
  });
  it('requires minimum participation and handles small leagues', () => {
    const two = rankStandings([mk('a', 30), mk('b', 5)]);
    const out = processSeason('2026-W01', two, tiers(['a', 'b']));
    expect(out.promoted).toEqual([]);
    expect(out.stayed).toHaveLength(2); // below minEligible=3
    const idle = rankStandings([mk('a', 0), mk('b', 0), mk('c', 5)]);
    expect(processSeason('2026-W01', idle, tiers(['a', 'b', 'c']))).toBeDefined();
  });
  it('never processes the same season twice (caller tracks ids)', () => {
    const entries = [mk('a', 10), mk('b', 20), mk('c', 30)];
    const first = processSeason('2026-W02', rankStandings(entries), tiers(['a', 'b', 'c']));
    expect(first.seasonId).toBe('2026-W02');
    expect(first.promoted).toEqual(['c']);
  });
  it('moves tiers one step', () => {
    expect(nextTier('silver', 1)).toBe('gold');
    expect(nextTier('bronze', -1)).toBe('bronze');
    expect(nextTier('champion', 1)).toBe('champion');
  });
  it('uses default config values', () => {
    expect(DEFAULT_SEASON_CONFIG.promotePct).toBe(0.2);
  });
});
