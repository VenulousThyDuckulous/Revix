export const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_META: Record<Tier, { name: string; color: string; emoji: string }> = {
  bronze: { name: 'Bronze', color: '#cd7f32', emoji: '🥉' },
  silver: { name: 'Silver', color: '#c0c0c0', emoji: '🥈' },
  gold: { name: 'Gold', color: '#ffd257', emoji: '🥇' },
  platinum: { name: 'Platinum', color: '#7fe7e7', emoji: '💠' },
  diamond: { name: 'Diamond', color: '#7cc4ff', emoji: '💎' },
  champion: { name: 'Champion', color: '#c084fc', emoji: '👑' },
};

/** Weekly season id (ISO week, UTC): e.g. "2026-W42". Season = Mon 00:00 UTC → next Mon 00:00 UTC. */
export function seasonIdFor(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fday + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function seasonStartUtc(seasonId: string): Date {
  const m = /^(\d{4})-W(\d{2})$/.exec(seasonId);
  if (!m) throw new Error(`Bad season id: ${seasonId}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  // Jan 4 is always in ISO week 1; Monday of week 1:
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Mon = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4.getTime() + (week - 1) * 7 * 86_400_000 - jan4Mon * 86_400_000);
  return monday;
}

export function seasonEndUtc(seasonId: string): Date {
  return new Date(seasonStartUtc(seasonId).getTime() + 7 * 86_400_000);
}

export interface StandingEntry {
  userId: string;
  displayName: string;
  xp: number;
  activityCount: number;
  firstActivityAt: number;
}

export interface RankedEntry extends StandingEntry {
  rank: number;
}

/** Sort standings: xp desc, then more activities, then earlier first activity, then userId (deterministic). */
export function rankStandings(entries: StandingEntry[]): RankedEntry[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.xp - a.xp ||
      b.activityCount - a.activityCount ||
      a.firstActivityAt - b.firstActivityAt ||
      (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
  );
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
}

export interface SeasonConfig {
  promotePct: number; // 0.2
  relegatePct: number; // 0.2
  minEligible: number; // min eligible players for any movement (default 3)
  minXp: number; // participation threshold (default 1)
}

export const DEFAULT_SEASON_CONFIG: SeasonConfig = {
  promotePct: 0.2,
  relegatePct: 0.2,
  minEligible: 3,
  minXp: 1,
};

export interface SeasonOutcome {
  seasonId: string;
  promoted: string[];
  relegated: string[];
  stayed: string[];
  ineligible: string[];
}

/** Compute promotion/relegation from ranked standings + current tiers. Respects bronze/champion boundaries. */
export function processSeason(
  seasonId: string,
  ranked: RankedEntry[],
  tiers: Record<string, Tier>,
  config: SeasonConfig = DEFAULT_SEASON_CONFIG,
): SeasonOutcome {
  const eligible = ranked.filter((r) => r.xp >= config.minXp);
  const ineligible = ranked.filter((r) => r.xp < config.minXp).map((r) => r.userId);
  if (eligible.length < config.minEligible) {
    return { seasonId, promoted: [], relegated: [], stayed: eligible.map((e) => e.userId), ineligible };
  }
  const n = eligible.length;
  let up = Math.max(1, Math.floor(n * config.promotePct));
  let down = Math.max(1, Math.floor(n * config.relegatePct));
  if (up + down > n) {
    // tiny leagues: promote #1, relegate last only
    up = 1;
    down = n > 1 ? 1 : 0;
  }
  const promoted: string[] = [];
  const relegated: string[] = [];
  const stayed: string[] = [];
  // Top slice promotes (unless already champion); bottom slice relegates (unless bronze).
  const topSlice = eligible.slice(0, up);
  const bottomSlice = eligible.slice(n - down);
  const bottomSet = new Set(bottomSlice.map((e) => e.userId));
  for (const e of topSlice) {
    if (bottomSet.has(e.userId)) {
      stayed.push(e.userId); // overlap in tiny leagues: stay
      continue;
    }
    if (tiers[e.userId] === 'champion') stayed.push(e.userId);
    else promoted.push(e.userId);
  }
  for (const e of bottomSlice) {
    if (topSlice.some((t) => t.userId === e.userId)) continue; // handled above
    if (tiers[e.userId] === 'bronze') stayed.push(e.userId);
    else relegated.push(e.userId);
  }
  for (const e of eligible) {
    if (!promoted.includes(e.userId) && !relegated.includes(e.userId) && !stayed.includes(e.userId)) {
      stayed.push(e.userId);
    }
  }
  return { seasonId, promoted, relegated, stayed, ineligible };
}

export function nextTier(t: Tier, dir: 1 | -1): Tier {
  const i = TIERS.indexOf(t);
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, i + dir))];
}

/** Reward catalogue (League XP per event). Server mirrors these caps. */
export const REWARDS = {
  quizCorrect: 10,
  quizCompletion: 5,
  quizPerfect: 10,
  flashcardSession: 15,
  gamePlayed: 10,
  gameWin: 10,
  examSession: 20,
  topicMastered: 25,
  DAILY_LEAGUE_CAP: 500,
} as const;
