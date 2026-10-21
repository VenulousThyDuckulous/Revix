import type { EloRecord } from './types';

export interface Rank {
  id: string;
  name: string;
  short: string;
  minXp: number;
  color: string;
  emoji: string;
}

/**
 * Lifetime-XP ladder — earned from real revision, never lost, no seasons.
 * Rank ids double as competitive tier labels for the ELO display.
 */
export const RANKS: Rank[] = [
  { id: 'unranked', name: 'Unranked', short: 'UNR', minXp: 0, color: '#94A3B8', emoji: '·' },
  { id: 'bronze', name: 'Bronze', short: 'BZ', minXp: 100, color: '#CD7F32', emoji: '🥉' },
  { id: 'silver', name: 'Silver', short: 'SV', minXp: 500, color: '#94A3B8', emoji: '🥈' },
  { id: 'gold', name: 'Gold', short: 'GD', minXp: 1500, color: '#EAB308', emoji: '🥇' },
  { id: 'platinum', name: 'Platinum', short: 'PT', minXp: 3500, color: '#22D3EE', emoji: '💠' },
  { id: 'diamond', name: 'Diamond', short: 'DM', minXp: 7000, color: '#38BDF8', emoji: '💎' },
  { id: 'champion', name: 'Champion', short: 'CH', minXp: 12000, color: '#F97316', emoji: '🏆' },
  { id: 'grand-champion', name: 'Grand Champion', short: 'GC', minXp: 20000, color: '#EF4444', emoji: '👑' },
  { id: 'super-sonic-legend', name: 'Super Sonic Legend', short: 'SSL', minXp: 32000, color: '#A855F7', emoji: '⚡' },
  { id: 'hyper-sonic-legend', name: 'Hyper Sonic Legend', short: 'HSL', minXp: 48000, color: '#EC4899', emoji: '🌟' },
  { id: 'delta', name: 'Delta', short: 'DLT', minXp: 70000, color: '#10B981', emoji: '🔺' },
  { id: 'sigma', name: 'Sigma', short: 'SGM', minXp: 100000, color: '#6366F1', emoji: 'λ' },
  { id: 'alpha', name: 'Alpha', short: 'ALP', minXp: 150000, color: '#FBBF24', emoji: 'α' },
];

export interface RankProgress {
  rank: Rank;
  next: Rank | null;
  progress: number;
  xpNeeded: number;
}

export function rankIndex(xp: number): number {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) idx = i;
  }
  return idx;
}

export function rankFor(xp: number): RankProgress {
  const idx = rankIndex(xp);
  const rank = RANKS[idx];
  const next = idx + 1 < RANKS.length ? RANKS[idx + 1] : null;
  if (!next) return { rank, next: null, progress: 1, xpNeeded: 0 };
  const span = next.minXp - rank.minXp;
  const progress = span <= 0 ? 1 : (xp - rank.minXp) / span;
  return { rank, next, progress: Math.min(1, Math.max(0, progress)), xpNeeded: next.minXp - xp };
}

// ---------------------------------------------------------------------------
// Competitive match rating (ELO)
// ---------------------------------------------------------------------------

export const ELO_START = 1000;
export const ELO_K = 32;

export function newEloRecord(): EloRecord {
  return { rating: ELO_START, wins: 0, losses: 0, draws: 0, games: 0 };
}

function expected(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * 1v1 ELO update. `scoreA`/`scoreB` are 1, 0.5, or 0 from A's perspective.
 * Works for teams too: feed the two team ratings.
 */
export function eloDelta(ratingA: number, ratingB: number, scoreA: number, k = ELO_K): number {
  return Math.round(k * (scoreA - expected(ratingA, ratingB)));
}

/**
 * Free-for-all update (Battle Royale / Sprint): each player is scored
 * against the field by placement. `place` is 1-based; `field` is the
 * number of finishers. Top place scores 1, last scores 0, linear between.
 */
export function eloDeltaFfa(
  rating: number,
  others: number[],
  place: number,
  field: number,
  k = ELO_K,
): number {
  if (field <= 1) return 0;
  const score = (field - place) / (field - 1);
  const avgOpponent = others.length
    ? others.reduce((s, r) => s + r, 0) / others.length
    : rating;
  return Math.round(k * (score - expected(rating, avgOpponent)));
}

export function applyElo(
  rec: EloRecord,
  delta: number,
  outcome: 'win' | 'loss' | 'draw',
): EloRecord {
  return {
    rating: Math.max(0, rec.rating + delta),
    wins: rec.wins + (outcome === 'win' ? 1 : 0),
    losses: rec.losses + (outcome === 'loss' ? 1 : 0),
    draws: rec.draws + (outcome === 'draw' ? 1 : 0),
    games: rec.games + 1,
  };
}

/** Competitive tier shown beside the XP rank — derived from rating only. */
export function eloTier(rating: number): Rank {
  if (rating < 800) return RANKS[1]; // Bronze
  if (rating < 1000) return RANKS[2]; // Silver
  if (rating < 1150) return RANKS[3]; // Gold
  if (rating < 1300) return RANKS[4]; // Platinum
  if (rating < 1450) return RANKS[5]; // Diamond
  if (rating < 1650) return RANKS[6]; // Champion
  if (rating < 1850) return RANKS[7]; // Grand Champion
  if (rating < 2100) return RANKS[8]; // SSL
  return RANKS[9]; // Hyper Sonic Legend
}
