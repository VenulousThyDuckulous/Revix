import type { GameMode, MatchPlacement, MatchResults, Room, RoomPlayer } from './types';
import { eloDelta, eloDeltaFfa } from './ranks';

/** Per-question window for clock-paced modes (duel / royale / team). */
export function windowMs(room: Room): number {
  return Math.max(3, room.settings.secondsPerQuestion) * 1000;
}

export function sprintSeconds(): number {
  return 60;
}

/**
 * Shared clock: every client derives the same question index from
 * `startedAt`, so no per-frame server sync is needed.
 * Returns -1 before the first question window opens.
 */
export function questionIndexAt(room: Room, now: number): number {
  if (room.status !== 'playing' || room.startedAt === null) return -1;
  const i = Math.floor((now - room.startedAt) / windowMs(room));
  if (i < 0 || i >= room.questionIds.length) return -1;
  return i;
}

/** True when the shared clock has run past the final question window. */
export function clockExhausted(room: Room, now: number): boolean {
  if (room.status !== 'playing' || room.startedAt === null) return false;
  return now - room.startedAt >= room.questionIds.length * windowMs(room);
}

export function sprintEnded(room: Room, now: number): boolean {
  if (room.status !== 'playing' || room.startedAt === null) return false;
  return now - room.startedAt >= sprintSeconds() * 1000;
}

/** Points for a correct answer: base + speed bonus within the window. */
export function scoreFor(correct: boolean, elapsedMs: number, window: number): number {
  if (!correct) return 0;
  const ratio = Math.max(0, Math.min(1, 1 - elapsedMs / Math.max(1, window)));
  return 100 + Math.round(50 * ratio);
}

export interface AnswerOutcome {
  score: number;
  correct: boolean;
  wrong: boolean;
  /** Royale only: the player is eliminated by a wrong/missed answer. */
  eliminated: boolean;
  finished: boolean;
}

/**
 * Score one answer for one player. Pure — callers apply the returned
 * numbers to the player's own Firestore entry.
 *
 * mode rules:
 * - duel / team: wrong answers just cost the speed opportunity
 * - royale: wrong or missed answer eliminates you
 * - sprint: wrong answers cost nothing but time; all questions are live
 */
export function gradeAnswer(
  mode: GameMode,
  correct: boolean,
  elapsedMs: number,
  window: number,
): AnswerOutcome {
  const points = scoreFor(correct, elapsedMs, window);
  const eliminated = mode === 'royale' && !correct;
  return {
    score: points,
    correct,
    wrong: !correct,
    eliminated,
    finished: false,
  };
}

export function aliveCount(room: Room): number {
  return Object.values(room.players).filter((p) => p.state === 'alive').length;
}

export function finishedCount(room: Room): number {
  return Object.values(room.players).filter((p) => p.state === 'finished').length;
}

/**
 * Has the match ended? Deterministic from room state + wall clock so every
 * client agrees, then the first to notice writes the results.
 */
export function isMatchOver(room: Room, now: number): boolean {
  if (room.status !== 'playing') return room.status === 'finished';
  const players = Object.values(room.players);
  if (players.length === 0) return true;

  if (room.mode === 'sprint') {
    if (sprintEnded(room, now)) return true;
    // Everyone answered everything → early finish.
    return players.length > 0 && players.every((p) => p.state === 'finished');
  }

  if (room.mode === 'royale') {
    if (aliveCount(room) <= 1) return true;
    if (players.every((p) => p.state !== 'alive')) return true;
    return clockExhausted(room, now);
  }

  // duel + team: purely clock-paced so both sides finish together.
  return clockExhausted(room, now);
}

function sortFfa(room: Room): RoomPlayer[] {
  return Object.values(room.players).sort((a, b) => {
    const aAlive = a.state === 'alive' ? 1 : 0;
    const bAlive = b.state === 'alive' ? 1 : 0;
    if (aAlive !== bAlive) return bAlive - aAlive;
    if (room.mode === 'sprint') {
      if (b.score !== a.score) return b.score - a.score;
      // Earlier finish breaks a tie; unfinished sort last.
      const at = a.finishedAt ?? Number.MAX_SAFE_INTEGER;
      const bt = b.finishedAt ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    }
    // Royale: later elimination survives longer → better place.
    if (a.state !== 'alive' && b.state !== 'alive') {
      return (b.finishedAt ?? 0) - (a.finishedAt ?? 0);
    }
    return b.score - a.score;
  });
}

/** XP payout by placement — participation always earns something. */
export function matchXp(place: number, field: number): number {
  if (field <= 1) return 30;
  const table = [60, 45, 35, 25, 18, 12, 8];
  const base = place - 1 < table.length ? table[place - 1] : 5;
  return base;
}

function outcomeOf(delta: number): 'win' | 'loss' | 'draw' {
  if (delta > 0) return 'win';
  if (delta < 0) return 'loss';
  return 'draw';
}

export function outcomeFor(delta: number): 'win' | 'loss' | 'draw' {
  return outcomeOf(delta);
}

/**
 * Compute final placements + ELO deltas from the finished room.
 * Deterministic: same room state → same results, so racing writers agree.
 */
export function computeResults(room: Room): MatchResults {
  const players = Object.values(room.players);
  const field = players.length;
  const now = Date.now();

  if (room.mode === 'team' || room.mode === 'duel') {
    return pairResults(room, now);
  }

  const ordered = sortFfa(room);
  const ratings = ordered.map((p) => p.eloBefore);
  const placements: MatchPlacement[] = ordered.map((p, i) => {
    const others = ratings.filter((_, j) => j !== i);
    const delta = field > 1 ? eloDeltaFfa(p.eloBefore, others, i + 1, field) : 0;
    return {
      uid: p.uid,
      name: p.name,
      avatar: p.avatar,
      place: i + 1,
      score: p.score,
      correct: p.correct,
      eloDelta: delta,
      xp: matchXp(i + 1, field),
    };
  });
  return { at: now, placements };
}

function pairResults(room: Room, now: number): MatchResults {
  const players = Object.values(room.players);
  const field = players.length;
  const ordered = [...players].sort((a, b) => b.score - a.score || b.correct - a.correct);

  if (room.mode === 'duel' && ordered.length === 2) {
    const [a, b] = ordered;
    const draw = a.score === b.score;
    const da = eloDelta(a.eloBefore, b.eloBefore, draw ? 0.5 : 1);
    const db = eloDelta(b.eloBefore, a.eloBefore, draw ? 0.5 : 0);
    return {
      at: now,
      placements: [
        { ...stamp(draw ? 1 : 1, a), score: a.score, correct: a.correct, eloDelta: draw ? 0 : da, xp: draw ? 35 : 60 },
        { ...stamp(draw ? 1 : 2, b), score: b.score, correct: b.correct, eloDelta: draw ? 0 : db, xp: draw ? 35 : 20 },
      ],
    };
  }

  if (room.mode === 'team') {
    const teamRating = (team: 'a' | 'b') => {
      const members = players.filter((p) => p.team === team);
      return members.length ? members.reduce((s, p) => s + p.eloBefore, 0) / members.length : 1000;
    };
    const scoreA = players.filter((p) => p.team === 'a').reduce((s, p) => s + p.score, 0);
    const scoreB = players.filter((p) => p.team === 'b').reduce((s, p) => s + p.score, 0);
    const draw = scoreA === scoreB;
    const teamScoreA = draw ? 0.5 : scoreA > scoreB ? 1 : 0;
    const delta = draw ? 0 : eloDelta(teamRating('a'), teamRating('b'), teamScoreA);
    return {
      at: now,
      placements: ordered.map((p, i) => ({
        uid: p.uid,
        name: p.name,
        avatar: p.avatar,
        place: i + 1,
        score: p.score,
        correct: p.correct,
        // Team A gains what Team B loses — a match is zero-sum.
        eloDelta: p.team === 'a' ? delta : -delta,
        xp: draw ? 30 : teamScoreA === (p.team === 'a' ? 1 : 0) ? 55 : 18,
      })),
    };
  }

  // Fallback (solo practice, odd counts): treat like FFA by score.
  return {
    at: now,
    placements: ordered.map((p, i) => ({
      uid: p.uid,
      name: p.name,
      avatar: p.avatar,
      place: i + 1,
      score: p.score,
      correct: p.correct,
      eloDelta: 0,
      xp: matchXp(i + 1, field),
    })),
  };
}

function stamp(place: number, p: RoomPlayer): Omit<MatchPlacement, 'score' | 'correct' | 'eloDelta' | 'xp'> {
  return { uid: p.uid, name: p.name, avatar: p.avatar, place };
}
