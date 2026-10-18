/** Personal progression ranks — earned from lifetime XP, no seasons, no relegation. */

export interface Rank {
  id: string;
  name: string;
  minXp: number;
  emoji: string;
  color: string;
}

export const RANKS: Rank[] = [
  { id: 'unranked', name: 'Unranked', minXp: 0, emoji: '🔘', color: '#94a3b8' },
  { id: 'bronze', name: 'Bronze', minXp: 150, emoji: '🥉', color: '#f97316' },
  { id: 'silver', name: 'Silver', minXp: 400, emoji: '🥈', color: '#e2e8f0' },
  { id: 'gold', name: 'Gold', minXp: 800, emoji: '🥇', color: '#fbbf24' },
  { id: 'platinum', name: 'Platinum', minXp: 1500, emoji: '💠', color: '#06b6d4' },
  { id: 'diamond', name: 'Diamond', minXp: 3000, emoji: '💎', color: '#22d3ee' },
  { id: 'champion', name: 'Champion', minXp: 5500, emoji: '🏆', color: '#ec4899' },
  { id: 'grand-champion', name: 'Grand Champion (GC)', minXp: 9000, emoji: '👑', color: '#a855f7' },
  { id: 'super-sonic-legend', name: 'Super Sonic Legend (SSL)', minXp: 15000, emoji: '⚡', color: '#fb923c' },
  { id: 'hyper-sonic-legend', name: 'Hyper Sonic Legend (HSL)', minXp: 25000, emoji: '🚀', color: '#8b5cf6' },
  { id: 'delta', name: 'Delta', minXp: 40000, emoji: '🔺', color: '#f43f5e' },
  { id: 'sigma', name: 'Sigma', minXp: 65000, emoji: '⬢', color: '#6366f1' },
  { id: 'alpha', name: 'Alpha', minXp: 100000, emoji: '🔱', color: '#eab308' },
];

export interface RankProgress {
  rank: Rank;
  next: Rank | null;
  /** 0..1 progress from this rank's threshold to the next (1 when maxed). */
  progress: number;
  xpIntoRank: number;
  xpNeeded: number;
}

export function rankFor(xp: number): RankProgress {
  const safe = Math.max(0, Math.floor(xp));
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (safe >= RANKS[i].minXp) idx = i;
  }
  const rank = RANKS[idx];
  const next = idx + 1 < RANKS.length ? RANKS[idx + 1] : null;
  if (!next) return { rank, next, progress: 1, xpIntoRank: safe - rank.minXp, xpNeeded: 0 };
  const span = next.minXp - rank.minXp;
  const into = safe - rank.minXp;
  return { rank, next, progress: Math.min(1, into / span), xpIntoRank: into, xpNeeded: next.minXp - safe };
}
