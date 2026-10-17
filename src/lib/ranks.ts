/** Personal progression ranks — earned from lifetime XP, no seasons, no relegation. */

export interface Rank {
  id: string;
  name: string;
  minXp: number;
  emoji: string;
  color: string;
}

export const RANKS: Rank[] = [
  { id: 'rookie', name: 'Rookie', minXp: 0, emoji: '🌱', color: '#9ca3af' },
  { id: 'bronze', name: 'Bronze', minXp: 150, emoji: '🥉', color: '#cd7f32' },
  { id: 'silver', name: 'Silver', minXp: 400, emoji: '🥈', color: '#c0c0c0' },
  { id: 'gold', name: 'Gold', minXp: 800, emoji: '🥇', color: '#ffd257' },
  { id: 'platinum', name: 'Platinum', minXp: 1500, emoji: '💠', color: '#7fe7e7' },
  { id: 'diamond', name: 'Diamond', minXp: 3000, emoji: '💎', color: '#7cc4ff' },
  { id: 'master', name: 'Master', minXp: 5500, emoji: '🏆', color: '#f0abfc' },
  { id: 'champion', name: 'Champion', minXp: 9000, emoji: '👑', color: '#c084fc' },
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
