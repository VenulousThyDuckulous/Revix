import { describe, expect, it } from 'vitest';
import { ELO_START, RANKS, applyElo, eloDelta, eloDeltaFfa, eloTier, newEloRecord, rankFor } from './ranks';

describe('XP rank ladder', () => {
  it('has 13 ranks in strictly increasing XP order', () => {
    expect(RANKS).toHaveLength(13);
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp);
    }
    expect(RANKS[0].id).toBe('unranked');
    expect(RANKS[RANKS.length - 1].id).toBe('alpha');
  });

  it('places XP at ladder boundaries in the right rank', () => {
    expect(rankFor(0).rank.id).toBe('unranked');
    expect(rankFor(99).rank.id).toBe('unranked');
    expect(rankFor(100).rank.id).toBe('bronze');
    expect(rankFor(499).rank.id).toBe('bronze');
    expect(rankFor(500).rank.id).toBe('silver');
    expect(rankFor(149_999).rank.id).toBe('sigma');
    expect(rankFor(150_000).rank.id).toBe('alpha');
  });

  it('never drops a rank as XP grows', () => {
    let last = -1;
    for (let xp = 0; xp <= 200_000; xp += 500) {
      const idx = RANKS.findIndex((r) => r.id === rankFor(xp).rank.id);
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it('reports progress and XP needed toward the next rank', () => {
    const p = rankFor(100); // bronze starts at 100, silver at 500
    expect(p.next?.id).toBe('silver');
    expect(p.progress).toBeCloseTo(0, 5);
    expect(p.xpNeeded).toBe(400);

    const mid = rankFor(300);
    expect(mid.progress).toBeCloseTo(0.5, 5);
    expect(mid.xpNeeded).toBe(200);
  });

  it('completes at the top rank', () => {
    const top = rankFor(1_000_000);
    expect(top.rank.id).toBe('alpha');
    expect(top.next).toBeNull();
    expect(top.progress).toBe(1);
    expect(top.xpNeeded).toBe(0);
  });
});

describe('ELO', () => {
  it('starts new players at 1000', () => {
    expect(newEloRecord().rating).toBe(ELO_START);
    expect(newEloRecord().games).toBe(0);
  });

  it('awards +16 between equal players', () => {
    expect(eloDelta(1000, 1000, 1)).toBe(16);
    expect(eloDelta(1000, 1000, 0)).toBe(-16);
    expect(eloDelta(1000, 1000, 0.5)).toBe(0);
  });

  it('gives less for beating weaker opponents and more for upset wins', () => {
    const vsWeak = eloDelta(1200, 800, 1);
    const vsStrong = eloDelta(800, 1200, 1);
    expect(vsWeak).toBeGreaterThan(0);
    expect(vsWeak).toBeLessThan(32);
    expect(vsStrong).toBeGreaterThan(vsWeak);
    expect(vsStrong).toBeLessThanOrEqual(32);
  });

  it('never moves more than K in one game', () => {
    for (const [a, b] of [
      [1000, 1000],
      [500, 2500],
      [2500, 500],
    ]) {
      expect(Math.abs(eloDelta(a, b, 1))).toBeLessThanOrEqual(32);
      expect(Math.abs(eloDelta(a, b, 0))).toBeLessThanOrEqual(32);
    }
  });

  it('scores free-for-all by placement', () => {
    const others = [1000, 1000, 1000];
    expect(eloDeltaFfa(1000, others, 1, 4)).toBeGreaterThan(0);
    expect(eloDeltaFfa(1000, others, 4, 4)).toBeLessThan(0);
    expect(eloDeltaFfa(1000, others, 2, 4)).toBeGreaterThan(eloDeltaFfa(1000, others, 3, 4));
    // A solo "match" can't rate anyone.
    expect(eloDeltaFfa(1000, [], 1, 1)).toBe(0);
  });

  it('tracks W/L/D counts', () => {
    let rec = newEloRecord();
    rec = applyElo(rec, 16, 'win');
    rec = applyElo(rec, -16, 'loss');
    rec = applyElo(rec, 0, 'draw');
    expect(rec).toMatchObject({ wins: 1, losses: 1, draws: 1, games: 3, rating: 1000 });
  });

  it('never goes below zero rating', () => {
    const rec = applyElo({ ...newEloRecord(), rating: 5 }, -32, 'loss');
    expect(rec.rating).toBe(0);
  });

  it('maps ratings to sensible tiers', () => {
    expect(eloTier(700).id).toBe('bronze');
    expect(eloTier(900).id).toBe('silver');
    expect(eloTier(1000).id).toBe('gold');
    expect(eloTier(1200).id).toBe('platinum');
    expect(eloTier(1400).id).toBe('diamond');
    expect(eloTier(1600).id).toBe('champion');
    expect(eloTier(1800).id).toBe('grand-champion');
    expect(eloTier(2000).id).toBe('super-sonic-legend');
    expect(eloTier(5000).id).toBe('hyper-sonic-legend');
  });
});
