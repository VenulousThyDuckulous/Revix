import { describe, expect, it } from 'vitest';
import {
  aliveCount,
  clockExhausted,
  computeResults,
  gradeAnswer,
  isMatchOver,
  matchXp,
  questionIndexAt,
  scoreFor,
  sprintEnded,
  windowMs,
} from './engine';
import type { Room, RoomPlayer } from './types';

function player(over: Partial<RoomPlayer> & { uid: string }): RoomPlayer {
  return {
    name: over.uid,
    avatar: '🚀',
    team: 'a',
    score: 0,
    correct: 0,
    wrong: 0,
    state: 'alive',
    finishedAt: null,
    eloBefore: 1000,
    ...over,
  };
}

function room(over: Partial<Room>): Room {
  return {
    code: 'TEST01',
    mode: 'duel',
    status: 'playing',
    hostId: 'a',
    createdAt: 0,
    startedAt: 1_000_000,
    questionIds: ['q1', 'q2', 'q3'],
    settings: { subject: null, topic: null, questionCount: 3, secondsPerQuestion: 20 },
    players: { a: player({ uid: 'a' }), b: player({ uid: 'b' }) },
    results: null,
    ...over,
  };
}

describe('shared clock', () => {
  it('derives the question index identically for every client', () => {
    const r = room({ startedAt: 10_000 });
    // 20s windows from t=10s
    expect(questionIndexAt(r, 10_000)).toBe(0);
    expect(questionIndexAt(r, 29_999)).toBe(0);
    expect(questionIndexAt(r, 30_000)).toBe(1);
    expect(questionIndexAt(r, 50_000)).toBe(2);
    expect(questionIndexAt(r, 70_000)).toBe(-1); // past the final window
    expect(questionIndexAt(r, 9_000)).toBe(-1); // countdown still running
  });

  it('is -1 unless the match is playing', () => {
    const lobby = room({ status: 'lobby', startedAt: 10_000 });
    expect(questionIndexAt(lobby, 15_000)).toBe(-1);
  });

  it('exhausts exactly after all question windows', () => {
    const r = room({ startedAt: 0 }); // 3 questions × 20s
    expect(clockExhausted(r, 59_999)).toBe(false);
    expect(clockExhausted(r, 60_000)).toBe(true);
    expect(windowMs(r)).toBe(20_000);
  });

  it('ends a sprint after 60 seconds', () => {
    const r = room({ mode: 'sprint', startedAt: 0 });
    expect(sprintEnded(r, 59_000)).toBe(false);
    expect(sprintEnded(r, 60_000)).toBe(true);
  });
});

describe('scoring', () => {
  it('pays a speed bonus for fast correct answers', () => {
    expect(scoreFor(true, 0, 20_000)).toBe(150);
    expect(scoreFor(true, 10_000, 20_000)).toBe(125);
    expect(scoreFor(true, 20_000, 20_000)).toBe(100);
    expect(scoreFor(false, 0, 20_000)).toBe(0);
  });

  it('eliminates only in Battle Royale on a wrong answer', () => {
    const royale = gradeAnswer('royale', false, 5_000, 20_000);
    expect(royale.eliminated).toBe(true);
    expect(royale.score).toBe(0);

    const duel = gradeAnswer('duel', false, 5_000, 20_000);
    expect(duel.eliminated).toBe(false);

    const team = gradeAnswer('team', false, 5_000, 20_000);
    expect(team.eliminated).toBe(false);
  });
});

describe('match over detection', () => {
  it('duel ends when the clock runs out', () => {
    const r = room({ startedAt: 0 });
    expect(isMatchOver(r, 30_000)).toBe(false);
    expect(isMatchOver(r, 60_000)).toBe(true);
  });

  it('royale ends when one player remains', () => {
    const r = room({
      mode: 'royale',
      players: {
        a: player({ uid: 'a', state: 'alive' }),
        b: player({ uid: 'b', state: 'out', finishedAt: 5 }),
        c: player({ uid: 'c', state: 'out', finishedAt: 6 }),
      },
    });
    expect(isMatchOver(r, Date.now())).toBe(true);
    expect(aliveCount(r)).toBe(1);
  });

  it('royale falls back to the clock when everyone is out', () => {
    const r = room({
      mode: 'royale',
      startedAt: 0,
      players: {
        a: player({ uid: 'a', state: 'out', finishedAt: 1 }),
        b: player({ uid: 'b', state: 'out', finishedAt: 2 }),
      },
    });
    expect(isMatchOver(r, 5_000)).toBe(true);
  });

  it('sprint ends at 60s or when everyone finished', () => {
    const ticking = room({ mode: 'sprint', startedAt: 0 });
    expect(isMatchOver(ticking, 30_000)).toBe(false);
    expect(isMatchOver(ticking, 60_000)).toBe(true);

    const done = room({
      mode: 'sprint',
      startedAt: 0,
      players: {
        a: player({ uid: 'a', state: 'finished' }),
        b: player({ uid: 'b', state: 'finished' }),
      },
    });
    expect(isMatchOver(done, 10_000)).toBe(true);
  });

  it('a lobby is never "over" and a finished match stays over', () => {
    expect(isMatchOver(room({ status: 'lobby' }), Date.now())).toBe(false);
    expect(isMatchOver(room({ status: 'finished' }), Date.now())).toBe(true);
  });
});

describe('results', () => {
  it('duel ranks by score and pays winner/loser symmetric ELO', () => {
    const r = room({
      players: {
        a: player({ uid: 'a', score: 400, correct: 4, eloBefore: 1100 }),
        b: player({ uid: 'b', score: 250, correct: 3, eloBefore: 1000 }),
      },
    });
    const res = computeResults(r);
    expect(res.placements).toHaveLength(2);
    expect(res.placements[0].uid).toBe('a');
    expect(res.placements[0].place).toBe(1);
    expect(res.placements[0].xp).toBe(60);
    expect(res.placements[1].xp).toBe(20);
    // Winner gains, loser loses, and the pair nets to zero.
    expect(res.placements[0].eloDelta).toBeGreaterThan(0);
    expect(res.placements[1].eloDelta).toBeLessThan(0);
    expect(res.placements[0].eloDelta + res.placements[1].eloDelta).toBe(0);
  });

  it('a duel draw pays 0 ELO and 35 XP each', () => {
    const r = room({
      players: {
        a: player({ uid: 'a', score: 300 }),
        b: player({ uid: 'b', score: 300 }),
      },
    });
    const res = computeResults(r);
    expect(res.placements.every((p) => p.eloDelta === 0)).toBe(true);
    expect(res.placements.every((p) => p.xp === 35)).toBe(true);
  });

  it('royale ranks survivors above eliminations, later elimination better', () => {
    const r = room({
      mode: 'royale',
      players: {
        a: player({ uid: 'a', state: 'alive', score: 200 }),
        b: player({ uid: 'b', state: 'out', finishedAt: 10, score: 100 }),
        c: player({ uid: 'c', state: 'out', finishedAt: 30, score: 100 }),
      },
    });
    const res = computeResults(r);
    expect(res.placements.map((p) => p.uid)).toEqual(['a', 'c', 'b']);
    expect(res.placements[0].place).toBe(1);
    expect(res.placements[0].eloDelta).toBeGreaterThan(0);
    expect(res.placements[2].eloDelta).toBeLessThan(0);
  });

  it('sprint ranks by score then speed', () => {
    const r = room({
      mode: 'sprint',
      players: {
        a: player({ uid: 'a', score: 300, finishedAt: 40_000 }),
        b: player({ uid: 'b', score: 450, finishedAt: 55_000 }),
        c: player({ uid: 'c', score: 300, finishedAt: 20_000 }),
      },
    });
    const res = computeResults(r);
    expect(res.placements.map((p) => p.uid)).toEqual(['b', 'c', 'a']);
  });

  it('team mode gives every member of a team the same rating delta', () => {
    const r = room({
      mode: 'team',
      players: {
        a1: player({ uid: 'a1', team: 'a', score: 300 }),
        a2: player({ uid: 'a2', team: 'a', score: 250 }),
        b1: player({ uid: 'b1', team: 'b', score: 150 }),
        b2: player({ uid: 'b2', team: 'b', score: 100 }),
      },
    });
    const res = computeResults(r);
    const aMembers = res.placements.filter((p) => ['a1', 'a2'].includes(p.uid));
    const bMembers = res.placements.filter((p) => ['b1', 'b2'].includes(p.uid));
    expect(aMembers.every((p) => p.eloDelta > 0)).toBe(true);
    expect(bMembers.every((p) => p.eloDelta < 0)).toBe(true);
    expect(aMembers[0].eloDelta).toBe(-bMembers[0].eloDelta);
  });
});

describe('matchXp', () => {
  it('pays winners most and always gives something', () => {
    expect(matchXp(1, 8)).toBe(60);
    expect(matchXp(2, 8)).toBe(45);
    expect(matchXp(8, 8)).toBe(5);
    expect(matchXp(20, 20)).toBeGreaterThan(0);
    expect(matchXp(1, 1)).toBe(30);
  });
});
