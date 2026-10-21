import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';
import type { EloRecord, GameMode, Room, RoomPlayer, RoomSettings } from './types';
import { roomCode as genCode } from './ids';
import { computeResults } from './engine';

export class MultiplayerUnavailableError extends Error {
  constructor() {
    super('Online play needs Firebase configured and you signed in.');
    this.name = 'MultiplayerUnavailableError';
  }
}

function db(): NonNullable<ReturnType<typeof firebaseDb>> {
  const d = firebaseDb();
  if (!d) throw new MultiplayerUnavailableError();
  return d;
}

export function capacityFor(mode: GameMode): number {
  if (mode === 'duel') return 2;
  if (mode === 'team') return 4;
  return 8;
}

export function minPlayersToStart(mode: GameMode): number {
  return mode === 'duel' ? 2 : mode === 'team' ? 2 : 3;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  subject: null,
  topic: null,
  questionCount: 10,
  secondsPerQuestion: 20,
};

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function newPlayer(p: { uid: string; name: string; avatar: string; team: 'a' | 'b'; elo: number }): RoomPlayer {
  return {
    uid: p.uid,
    name: p.name || 'revixer',
    avatar: p.avatar || '🚀',
    team: p.team,
    score: 0,
    correct: 0,
    wrong: 0,
    state: 'alive',
    finishedAt: null,
    eloBefore: p.elo,
  };
}

interface Me {
  uid: string;
  name: string;
  avatar: string;
  elo: number;
}

/** Host creates a lobby. Returns the room code. */
export async function createRoom(mode: GameMode, settings: RoomSettings, me: Me): Promise<string> {
  const d = db();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const ref = doc(d, 'rooms', code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    const room: Room = {
      code,
      mode,
      status: 'lobby',
      hostId: me.uid,
      createdAt: Date.now(),
      startedAt: null,
      questionIds: [],
      settings: { ...DEFAULT_SETTINGS, ...settings },
      players: {
        [me.uid]: newPlayer({ ...me, team: mode === 'team' ? 'a' : 'a' }),
      },
      results: null,
    };
    await setDoc(ref, room);
    return code;
  }
  throw new Error('Could not get a free room code — try again.');
}

/** Join an existing lobby (mutates `players.{uid}` only). */
export async function joinRoom(code: string, me: Me, team: 'a' | 'b'): Promise<Room> {
  const d = db();
  const ref = doc(d, 'rooms', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('No room with that code.');
  const room = snap.data() as Room;
  if (room.status !== 'lobby') throw new Error('That match already started.');
  const count = Object.keys(room.players).length;
  if (count >= capacityFor(room.mode)) throw new Error('That room is full.');
  if (room.players[me.uid]) return room;
  await setDoc(ref, { players: { [me.uid]: newPlayer({ ...me, team }) } }, { merge: true });
  return room;
}

/**
 * Quick match: reuse an open lobby for this mode, otherwise create one.
 * Race between two joiners is harmless — the loser lands in a full room
 * and the caller falls back to creating a fresh one.
 */
export async function quickMatch(mode: GameMode, settings: RoomSettings, me: Me): Promise<string> {
  const d = db();
  try {
    const snap = await getDocs(
      query(collection(d, 'rooms'), where('mode', '==', mode), where('status', '==', 'lobby'), limit(10)),
    );
    const cap = capacityFor(mode);
    for (const s of snap.docs) {
      const room = s.data() as Room;
      if (room.hostId === me.uid) continue;
      const players = Object.keys(room.players);
      if (players.length < cap && !room.players[me.uid]) {
        const team: 'a' | 'b' = mode === 'team' ? (players.filter((p) => room.players[p].team === 'a').length <= players.filter((p) => room.players[p].team === 'b').length ? 'a' : 'b') : 'a';
        await joinRoom(room.code, me, team);
        return room.code;
      }
    }
  } catch {
    // Query rejected (rules/index) — fall through to creating a room.
  }
  return createRoom(mode, settings, me);
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void, onError?: (e: Error) => void): Unsubscribe {
  const d = db();
  return onSnapshot(
    doc(d, 'rooms', code),
    (snap) => cb(snap.exists() ? (snap.data() as Room) : null),
    (e) => onError?.(e instanceof Error ? e : new Error(String(e))),
  );
}

/**
 * Host: resolve questions and start the shared clock. `delayMs` gives all
 * clients a countdown before the first window opens.
 */
export async function startMatch(code: string, questionIds: string[], delayMs = 3000): Promise<void> {
  await updateDoc(doc(db(), 'rooms', code), {
    status: 'playing',
    startedAt: Date.now() + delayMs,
    questionIds,
  });
}

/** Host edits lobby settings while still in the lobby. */
export async function updateRoomSettings(code: string, settings: Partial<RoomSettings>): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(settings)) payload[`settings.${k}`] = v;
  await updateDoc(doc(db(), 'rooms', code), payload);
}

export interface OwnScorePatch {
  score?: number;
  correct?: number;
  wrong?: number;
  state?: RoomPlayer['state'];
  finishedAt?: number | null;
  team?: 'a' | 'b';
}

/** Each player writes only their own entry — no cross-player write conflicts. */
export async function submitOwnScore(code: string, uid: string, patch: OwnScorePatch): Promise<void> {
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const payload: Record<string, unknown> = {};
  for (const k of keys) payload[`players.${uid}.${k}`] = (patch as Record<string, unknown>)[k];
  await updateDoc(doc(db(), 'rooms', code), payload);
}

/** Any present client may finalize: results are deterministic, writers converge. */
export async function finalizeMatch(room: Room): Promise<void> {
  const results = computeResults(room);
  await updateDoc(doc(db(), 'rooms', room.code), { status: 'finished', results });
}

export async function leaveLobby(code: string, uid: string): Promise<void> {
  const d = db();
  const ref = doc(d, 'rooms', code);
  try {
    await updateDoc(ref, { [`players.${uid}`]: null });
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const room = snap.data() as Room;
      if (Object.keys(room.players).length === 0 && room.status === 'lobby') {
        await deleteDoc(ref);
      }
    }
  } catch {
    // Room already gone — nothing to do.
  }
}

/** Host clears a finished/abandoned lobby. */
export async function deleteRoom(code: string): Promise<void> {
  try {
    await deleteDoc(doc(db(), 'rooms', code));
  } catch {
    // Best-effort cleanup.
  }
}

/** Remove stale lobbies older than 24h when creating a new one. */
export async function sweepStaleRooms(uid: string): Promise<void> {
  const d = db();
  try {
    const snap = await getDocs(query(collection(d, 'rooms'), where('status', '==', 'lobby'), limit(20)));
    const cutoff = Date.now() - 24 * 3600 * 1000;
    for (const s of snap.docs) {
      const r = s.data() as Room;
      if (r.hostId === uid && r.createdAt < cutoff) await deleteDoc(s.ref);
    }
  } catch {
    // Cleanup is optional.
  }
}

// ---------------------------------------------------------------------------
// Profile sync (XP + ELO) — absolute writes, capped by security rules.
// ---------------------------------------------------------------------------

export async function syncLifetimeXp(uid: string, lifetimeXp: number): Promise<void> {
  await setDoc(doc(db(), 'profiles', uid), { lifetimeXp, updatedAt: Date.now() }, { merge: true });
}

/**
 * Apply one match's rating change. Read-modify-write on the player's own
 * profile only; security rules bound the delta per write.
 */
export async function syncMatchRating(uid: string, delta: number, lifetimeXp: number): Promise<void> {
  const d = db();
  const ref = doc(d, 'profiles', uid);
  const snap = await getDoc(ref);
  const cur = (snap.exists() ? snap.data() : {}) as Partial<EloRecord> & { matchesPlayed?: number };
  const base: EloRecord = {
    rating: Number(cur.rating ?? 1000),
    wins: Number(cur.wins ?? 0),
    losses: Number(cur.losses ?? 0),
    draws: Number(cur.draws ?? 0),
    games: Number(cur.games ?? 0),
  };
  const next: EloRecord = {
    rating: Math.max(0, Math.min(4000, base.rating + delta)),
    wins: base.wins + (delta > 0 ? 1 : 0),
    losses: base.losses + (delta < 0 ? 1 : 0),
    draws: base.draws + (delta === 0 ? 1 : 0),
    games: base.games + 1,
  };
  await setDoc(
    ref,
    { ...next, elo: next.rating, matchesPlayed: (cur.matchesPlayed ?? 0) + 1, lifetimeXp, updatedAt: Date.now() },
    { merge: true },
  );
}
