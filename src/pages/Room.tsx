import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  Copy,
  LogOut,
  Play,
  Swords,
  Timer,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { QUESTIONS } from '../lib/content';
import { isCorrect, selectQuestions, type AnswerValue } from '../lib/quiz';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import {
  MultiplayerUnavailableError,
  finalizeMatch,
  joinRoom,
  leaveLobby,
  deleteRoom,
  minPlayersToStart,
  startMatch,
  submitOwnScore,
  subscribeRoom,
  syncLifetimeXp,
  syncMatchRating,
  updateRoomSettings,
} from '../lib/multiplayer';
import {
  aliveCount,
  isMatchOver,
  questionIndexAt,
  sprintSeconds,
  gradeAnswer,
  windowMs,
} from '../lib/engine';
import { modeInfo } from '../lib/modes';
import { rankFor } from '../lib/ranks';
import { ActionButton, Badge, Card, Empty, ProgressBar } from '../components/ui';
import type { GameMode, MatchPlacement, Room as RoomDoc } from '../lib/types';

export default function Room() {
  const params = useParams<{ code?: string }>();
  const code = (params.code ?? '').toUpperCase();
  const navigate = useNavigate();
  const { user, configured, profile, setLocalProfile, refreshProfile } = useAuth();
  const { store, addActivity, totalXp } = useStore();

  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [loadError, setLoadError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<AnswerValue>(null);
  const [totals, setTotals] = useState({ score: 0, correct: 0, wrong: 0 });
  const [copied, setCopied] = useState(false);
  const [settingErr, setSettingErr] = useState('');

  const finalizedRef = useRef('');
  const rewardedRef = useRef('');
  const eliminatedRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const myUid = user?.uid ?? '';

  // ---- subscription -------------------------------------------------------
  useEffect(() => {
    if (!code) {
      setLoadError('Missing room code.');
      return;
    }
    try {
      unsubRef.current = subscribeRoom(
        code,
        (r) => {
          if (r === null) {
            // Doc doesn't exist (never existed, or closed while we watched it)
            // — a stale invite link must land on a clear message, not a spinner.
            setLoadError('That room no longer exists — it may have closed. Ask for a new code or start a fresh match.');
          } else {
            setRoom(r);
          }
        },
        (e) =>
          setLoadError(
            e.message.includes('permission') || e.message.includes('unavailable')
              ? 'Live rooms need Firebase configured and you signed in — see docs/firebase-setup.md.'
              : 'That room could not be found — it may have closed.',
          ),
      );
    } catch (e) {
      setLoadError(e instanceof MultiplayerUnavailableError ? 'Online play needs Firebase configured and you signed in.' : e instanceof Error ? e.message : 'Could not open the room.');
    }
    const un = unsubRef.current;
    return () => {
      un?.();
      unsubRef.current = null;
      // Leaving a lobby removes you; matches keep your cached entry.
      if (un && roomStatusRef.current === 'lobby' && myUidRef.current) {
        void leaveLobby(code, myUidRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const roomStatusRef = useRef<RoomDoc['status'] | null>(null);
  const myUidRef = useRef('');
  roomStatusRef.current = room?.status ?? null;
  myUidRef.current = myUid;

  // ---- shared clock tick --------------------------------------------------
  useEffect(() => {
    if (room?.status !== 'playing') return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [room?.status]);

  const questionMap = useMemo(() => {
    const m = new Map(QUESTIONS.map((q) => [q.id, q]));
    return m;
  }, []);

  const questions = useMemo(
    () => room?.questionIds.map((id) => questionMap.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q)) ?? [],
    [room?.questionIds, questionMap],
  );

  const mode: GameMode = room?.mode ?? 'duel';
  const info = modeInfo(mode);
  const clockIdx = room ? questionIndexAt(room, now) : -1;
  const isSprint = mode === 'sprint';
  const sprintIdx = questions.length > 0 ? Math.min(Object.keys(answers).length, questions.length - 1) : 0;
  const activeIdx = isSprint ? sprintIdx : clockIdx;
  const preStart = room?.status === 'playing' && room.startedAt !== null && now < room.startedAt;
  const activeQ = activeIdx >= 0 ? questions[activeIdx] : undefined;

  const me = room && myUid ? room.players[myUid] : undefined;
  const amHost = room?.hostId === myUid;
  const canStart = room ? Object.keys(room.players).length >= minPlayersToStart(room.mode) : false;
  const myFinished = me?.state === 'finished' || me?.state === 'out';

  // ---- finalize watcher ---------------------------------------------------
  useEffect(() => {
    if (!room || room.status !== 'playing' || finalizedRef.current === room.code) return;
    if (isMatchOver(room, Date.now())) {
      finalizedRef.current = room.code;
      void finalizeMatch(room).catch(() => {
        finalizedRef.current = '';
      });
    }
  }, [room, now]);

  // ---- royale: missed window eliminates you -------------------------------
  useEffect(() => {
    if (!room || room.status !== 'playing' || room.mode !== 'royale') return;
    if (!me || me.state !== 'alive' || eliminatedRef.current) return;
    const idx = questionIndexAt(room, Date.now());
    if (idx < 0) return;
    for (let k = 0; k < idx; k++) {
      if (!(k in answers)) {
        eliminatedRef.current = true;
        void submitOwnScore(room.code, myUid, { state: 'out', finishedAt: Date.now() }).catch(() => {});
        break;
      }
    }
  }, [room, me, answers, now, myUid]);

  // ---- sprint: answering the last question finishes you --------------------
  useEffect(() => {
    if (!room || room.status !== 'playing' || room.mode !== 'sprint' || !me) return;
    if (me.state === 'alive' && Object.keys(answers).length >= questions.length && questions.length > 0) {
      void submitOwnScore(room.code, myUid, { state: 'finished', finishedAt: Date.now() }).catch(() => {});
    }
  }, [room, me, answers, questions.length, myUid]);

  // ---- results: award XP + rating once -------------------------------------
  const applyResults = useCallback(
    async (r: RoomDoc, placement: MatchPlacement) => {
      if (rewardedRef.current === r.code) return;
      rewardedRef.current = r.code;
      const awarded = addActivity({
        kind: 'match',
        detail: `${info.name} — place ${placement.place} of ${r.results?.placements.length ?? 1}`,
        xp: placement.xp,
        eventKey: `match:${r.code}`,
      });
      if (configured && user?.uid) {
        try {
          await syncMatchRating(user.uid, placement.eloDelta, store.lifetimeXp + awarded);
          await syncLifetimeXp(user.uid, store.lifetimeXp + awarded);
          setLocalProfile({ elo: (profile?.elo ?? 1000) + placement.eloDelta });
          await refreshProfile();
        } catch {
          // Offline sync can retry next time the profile loads — XP is local anyway.
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addActivity, configured, info.name, profile?.elo, refreshProfile, setLocalProfile, store.lifetimeXp, user?.uid],
  );

  useEffect(() => {
    if (room?.status !== 'finished' || !room.results || !myUid) return;
    const placement = room.results.placements.find((p) => p.uid === myUid);
    if (placement) void applyResults(room, placement);
  }, [room, myUid, applyResults]);

  // ---- answering ----------------------------------------------------------
  const submitAnswer = useCallback(() => {
    if (!room || !activeQ || !me || myFinished || activeIdx < 0) return;
    if (activeIdx in answers) return;
    const elapsed = room.startedAt
      ? Math.max(0, Date.now() - (room.startedAt + activeIdx * windowMs(room)))
      : 0;
    const ok = isCorrect(activeQ, selected);
    const outcome = gradeAnswer(room.mode, ok, elapsed, windowMs(room));

    setAnswers((a) => ({ ...a, [activeIdx]: selected }));
    setRevealed((r) => ({ ...r, [activeIdx]: true }));
    setTotals((t) => ({
      score: t.score + outcome.score,
      correct: t.correct + (outcome.correct ? 1 : 0),
      wrong: t.wrong + (outcome.wrong ? 1 : 0),
    }));

    const patch = {
      score: totals.score + outcome.score,
      correct: totals.correct + (outcome.correct ? 1 : 0),
      wrong: totals.wrong + (outcome.wrong ? 1 : 0),
      ...(outcome.eliminated
        ? ({ state: 'out' as const, finishedAt: Date.now() } as const)
        : {}),
    };
    if (outcome.eliminated) eliminatedRef.current = true;
    void submitOwnScore(room.code, myUid, patch).catch(() => {});
    setSelected(null);
  }, [room, activeQ, me, myFinished, activeIdx, answers, selected, totals, myUid]);

  // ---- lobby actions -------------------------------------------------------
  async function hostStart() {
    if (!room || !amHost) return;
    setSettingErr('');
    try {
      const picked = selectQuestions(QUESTIONS, {
        subject: room.settings.subject,
        count: room.settings.questionCount,
        excludeTypes: ['matching'],
        shuffle: true,
        seed: Math.floor(Math.random() * 1e9),
      });
      if (picked.length === 0) {
        setSettingErr('No questions match those settings — change the subject.');
        return;
      }
      await startMatch(room.code, picked.map((q) => q.id));
    } catch (e) {
      setSettingErr(e instanceof Error ? e.message : 'Could not start.');
    }
  }

  async function toggleTeam() {
    if (!room || !me || mode !== 'team') return;
    const next: 'a' | 'b' = me.team === 'a' ? 'b' : 'a';
    await submitOwnScore(room.code, myUid, { team: next }).catch(() => {});
  }

  async function leave() {
    // Navigating away unmounts this page, whose cleanup removes you from a
    // lobby (and deletes it once empty). The host can also close a finished
    // room explicitly with the "Close room" button on the results screen.
    navigate('/play', { replace: true });
  }

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#/room/${code}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  // ---- shared error / empty states ----------------------------------------
  if (loadError) {
    return (
      <Empty
        title="Room unavailable"
        body={loadError}
        action={
          <ActionButton to="/play" variant="primary">
            Back to Play
          </ActionButton>
        }
      />
    );
  }
  if (!room) {
    return <div className="py-16 text-center font-bold text-duo-muted">Opening room {code}…</div>;
  }

  const players = Object.values(room.players);
  const results = room.results;

  // ============================ LOBBY ======================================
  if (room.status === 'lobby') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/play" className="text-sm font-black uppercase text-duo-blue hover:underline">
            ← Play
          </Link>
          <Badge>{info.name}</Badge>
        </div>

        <Card className="text-center">
          <div className="text-sm font-black tracking-widest uppercase text-duo-muted">Room code</div>
          <div className="mt-1 font-mono text-4xl tracking-[0.3em] font-black text-duo-blue">{code}</div>
          <div className="mt-3 flex justify-center gap-2">
            <ActionButton size="sm" variant="ghost" onClick={copyLink}>
              <Copy size={14} /> {copied ? 'Copied!' : 'Copy invite link'}
            </ActionButton>
            <ActionButton size="sm" variant="ghost" onClick={() => void joinRoom(code, {
              uid: myUid,
              name: store.profile.displayName || profile?.displayName || 'revixer',
              avatar: store.profile.avatar || '🚀',
              elo: profile?.elo ?? 1000,
            }, me?.team ?? 'a').catch(() => {})}>
              <UserPlus size={14} /> Re-join
            </ActionButton>
          </div>
          <p className="mt-2 text-xs font-bold text-duo-muted">
            Share this code — friends join at Play → Have a code?
          </p>
        </Card>

        {/* Players */}
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black">Players</h3>
            <Badge>
              {players.length} / {mode === 'duel' ? 2 : mode === 'team' ? 4 : 8}
            </Badge>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {players.map((p) => (
              <li key={p.uid} className="flex items-center gap-3 rounded-xl border-2 border-duo-line px-3 py-2">
                <span className="text-xl">{p.avatar}</span>
                <span className="font-black">{p.name}</span>
                {p.uid === room.hostId && <Badge style={{ borderColor: '#ffc800' }}>host</Badge>}
                {mode === 'team' && (
                  <Badge style={{ marginLeft: 'auto', color: p.team === 'a' ? '#58cc02' : '#1cb0f6' }}>
                    Team {p.team.toUpperCase()}
                  </Badge>
                )}
              </li>
            ))}
          </ul>

          {mode === 'team' && me && (
            <button type="button" className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => void toggleTeam()}>
              Switch to Team {me.team === 'a' ? 'B' : 'A'}
            </button>
          )}
        </Card>

        {/* Host controls */}
        {amHost ? (
          <Card className="mt-4">
            <h3 className="mb-3 font-black">Match setup</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-black text-duo-muted">
                Questions
                <select
                  className="input mt-1"
                  value={room.settings.questionCount}
                  onChange={(e) => void updateRoomSettings(code, { questionCount: Number(e.target.value) }).catch(() => setSettingErr('Could not save settings.'))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
              </label>
              <label className="text-sm font-black text-duo-muted">
                Seconds / question
                <select
                  className="input mt-1"
                  value={room.settings.secondsPerQuestion}
                  onChange={(e) => void updateRoomSettings(code, { secondsPerQuestion: Number(e.target.value) }).catch(() => setSettingErr('Could not save settings.'))}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </label>
              <div className="flex items-end">
                <p className="text-xs font-bold text-duo-muted">
                  {info.name} · starts at {minPlayersToStart(room.mode)}+ players
                </p>
              </div>
            </div>
            {settingErr && (
              <p className="mt-2 rounded-xl border-2 border-duo-red bg-red-50 px-3 py-2 text-sm font-bold text-duo-red">
                {settingErr}
              </p>
            )}
            <div className="mt-4">
              <ActionButton onClick={() => void hostStart()} disabled={!canStart} full>
                <Play size={16} fill="currentColor" /> Start {info.name}
              </ActionButton>
            </div>
            {!canStart && (
              <p className="mt-2 text-center text-xs font-bold text-duo-muted">
                Waiting for {minPlayersToStart(room.mode) - players.length} more player(s)…
              </p>
            )}
          </Card>
        ) : (
          <Card className="mt-4 text-center">
            <p className="text-sm font-bold text-duo-muted">
              Waiting for the host to start — share the code with friends meanwhile.
            </p>
          </Card>
        )}

        <div className="mt-4 text-center">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => void leave()}>
            <LogOut size={14} /> Leave room
          </button>
        </div>
      </div>
    );
  }

  // ============================ RESULTS ====================================
  if (room.status === 'finished') {
    const mine = results?.placements.find((p) => p.uid === myUid);
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-black uppercase text-duo-muted">{info.name}</span>
          <Badge>Room {code}</Badge>
        </div>

        <Card className="text-center">
          <Trophy className="mx-auto text-duo-yellow" size={34} />
          <h1 className="mt-2 text-3xl font-black">
            {mine ? (mine.place === 1 ? 'You won!' : `You placed #${mine.place}`) : 'Match over'}
          </h1>
          {mine && (
            <p className="mt-1 text-sm font-bold text-duo-muted">
              {mine.correct} correct · {mine.score} points
            </p>
          )}
          {mine && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="stat-pill" style={{ color: mine.eloDelta > 0 ? '#58cc02' : mine.eloDelta < 0 ? '#ff4b4b' : '#777' }}>
                {mine.eloDelta > 0 ? '+' : ''}
                {mine.eloDelta} rating
              </span>
              <span className="stat-pill">⚡ +{mine.xp} XP</span>
              <span className="stat-pill">
                {rankFor(totalXp).rank.emoji} {rankFor(totalXp).rank.name}
              </span>
            </div>
          )}
        </Card>

        <Card className="mt-4">
          <h3 className="mb-3 font-black">Final standings</h3>
          <ol className="flex flex-col gap-2">
            {(results?.placements ?? []).map((p) => (
              <li
                key={p.uid}
                className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${
                  p.uid === myUid ? 'border-duo-blue bg-duo-blue/10' : 'border-duo-line'
                }`}
              >
                <span className="w-7 text-center font-black">#{p.place}</span>
                <span className="text-xl">{p.avatar}</span>
                <span className="min-w-0 flex-1 truncate font-black">{p.name}</span>
                <span className="text-sm font-bold text-duo-muted">{p.correct}✔ {p.score}pts</span>
                <span
                  className="w-14 text-right text-sm font-black"
                  style={{ color: p.eloDelta > 0 ? '#58cc02' : p.eloDelta < 0 ? '#ff4b4b' : '#777' }}
                >
                  {p.eloDelta > 0 ? '+' : ''}
                  {p.eloDelta}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="mt-4 flex justify-center gap-2">
          <ActionButton to="/play">
            <Swords size={16} /> Play again
          </ActionButton>
          {amHost && (
            <ActionButton
              variant="ghost"
              onClick={() => {
                void deleteRoom(room.code).catch(() => {});
                navigate('/play', { replace: true });
              }}
            >
              Close room
            </ActionButton>
          )}
          {!amHost && (
            <ActionButton variant="ghost" to="/play">
              Exit
            </ActionButton>
          )}
        </div>
      </div>
    );
  }

  // ============================ LIVE MATCH =================================
  const window_ = windowMs(room);
  const windowElapsed = room.startedAt && activeIdx >= 0 ? now - (room.startedAt + activeIdx * window_) : 0;
  const windowPct = Math.max(0, Math.min(1, windowElapsed / window_));
  const sprintLeft = Math.max(0, sprintSeconds() * 1000 - (room.startedAt ? now - room.startedAt : 0));
  const playersSorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Match header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Badge style={{ color: info.color, borderColor: info.color }}>
          {info.name} · Room {code}
        </Badge>
        <div className="flex items-center gap-2 text-sm font-black">
          {mode === 'royale' && (
            <span className="stat-pill" style={{ color: '#ff4b4b' }}>
              <Users size={14} /> {aliveCount(room)} alive
            </span>
          )}
          <span className="stat-pill">⚡ {totals.score}</span>
        </div>
      </div>

      {/* Clock */}
      <div className="mb-4">
        {preStart ? (
          <div className="pop rounded-2xl border-2 border-duo-blue bg-duo-blue/10 p-6 text-center">
            <div className="text-5xl font-black text-duo-blue-dark">
              {Math.ceil(((room.startedAt ?? now) - now) / 1000)}
            </div>
            <div className="text-sm font-black uppercase tracking-widest text-duo-muted">Get ready…</div>
          </div>
        ) : isSprint ? (
          <div className="rounded-2xl border-2 border-duo-line p-3">
            <div className="mb-1 flex items-center justify-between text-sm font-black">
              <span>
                <Timer size={14} className="mr-1 inline" />
                Sprint
              </span>
              <span style={{ color: sprintLeft < 10000 ? '#ff4b4b' : '#3c3c3c' }}>
                {Math.ceil(sprintLeft / 1000)}s left
              </span>
            </div>
            <ProgressBar pct={sprintLeft / (sprintSeconds() * 1000)} tone="yellow" />
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-duo-line p-3">
            <div className="mb-1 flex items-center justify-between text-sm font-black">
              <span>
                Question {Math.min(activeIdx + 1, questions.length)} / {questions.length}
              </span>
              <span>{Math.max(0, Math.ceil(window_ / 1000 - windowElapsed / 1000))}s</span>
            </div>
            <ProgressBar pct={windowPct} tone={windowPct > 0.7 ? 'yellow' : 'blue'} />
          </div>
        )}
      </div>

      {/* Eliminated / finished notice */}
      {myFinished && room.status === 'playing' && (
        <div className="mb-4 rounded-2xl border-2 border-duo-red bg-red-50 p-4 text-center">
          <div className="font-black text-duo-red">
            {me?.state === 'out' ? 'Eliminated!' : 'Finished — waiting for others.'}
          </div>
          <p className="text-sm font-bold text-duo-muted">Watch the standings below.</p>
        </div>
      )}

      {/* Question */}
      {room.status === 'playing' && !preStart && !myFinished && activeQ && activeIdx >= 0 && (
        <Card>
          <p className="text-lg font-black">{activeQ.question}</p>

          <div className="mt-4 flex flex-col gap-2">
            {activeQ.type === 'mcq' &&
              activeQ.options?.map((o) => {
                const isRevealed = revealed[activeIdx];
                const state = isRevealed
                  ? String(activeQ.answer) === o
                    ? 'correct'
                    : answers[activeIdx] === o
                      ? 'wrong'
                      : ''
                  : selected === o
                    ? 'selected'
                    : '';
                return (
                  <button
                    key={o}
                    type="button"
                    className={`answer-option ${state}`}
                    disabled={isRevealed}
                    onClick={() => setSelected(o)}
                  >
                    {o}
                  </button>
                );
              })}

            {activeQ.type === 'true_false' &&
              ['True', 'False'].map((o) => {
                const isRevealed = revealed[activeIdx];
                const state = isRevealed
                  ? String(activeQ.answer) === o
                    ? 'correct'
                    : answers[activeIdx] === o
                      ? 'wrong'
                      : ''
                  : selected === o
                    ? 'selected'
                    : '';
                return (
                  <button
                    key={o}
                    type="button"
                    className={`answer-option ${state}`}
                    disabled={isRevealed}
                    onClick={() => setSelected(o)}
                  >
                    {o}
                  </button>
                );
              })}

            {(activeQ.type === 'short' || activeQ.type === 'fill_blank' || activeQ.type === 'numeric') && (
              <input
                className="input"
                disabled={revealed[activeIdx]}
                autoFocus
                placeholder={activeQ.type === 'numeric' ? 'Number' : 'Type your answer'}
                value={String(selected ?? '')}
                onChange={(e) => setSelected(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  if (revealed[activeIdx]) return;
                  if (selected !== null && String(selected).trim() !== '') submitAnswer();
                }}
              />
            )}
          </div>

          {revealed[activeIdx] && (
            <div
              className={`pop mt-3 rounded-xl border-2 px-3 py-2 text-sm font-black ${
                isCorrect(activeQ, answers[activeIdx] ?? null)
                  ? 'border-duo-green bg-green-50 text-duo-green-dark'
                  : 'border-duo-red bg-red-50 text-duo-red'
              }`}
            >
              {isCorrect(activeQ, answers[activeIdx] ?? null) ? (
                <span className="inline-flex items-center gap-1">
                  <Check size={14} /> Correct!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <X size={14} /> Answer: {String(activeQ.answer)}
                </span>
              )}
            </div>
          )}

          {!revealed[activeIdx] && (
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={selected === null || String(selected).trim() === ''}
                onClick={submitAnswer}
              >
                Submit
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Waiting states */}
      {room.status === 'playing' && !preStart && !myFinished && activeIdx < 0 && !isSprint && (
        <Card className="text-center text-sm font-bold text-duo-muted">Waiting for the next question…</Card>
      )}
      {isSprint && myFinished && room.status === 'playing' && questions.length > 0 && Object.keys(answers).length >= questions.length && (
        <Card className="text-center">
          <p className="font-black">All {questions.length} questions answered!</p>
          <p className="text-sm font-bold text-duo-muted">Waiting for the clock to run out…</p>
        </Card>
      )}

      {/* Standings */}
      <Card className="mt-4">
        <h3 className="mb-2 text-sm font-black tracking-wide uppercase text-duo-muted">Standings</h3>
        <ul className="flex flex-col gap-1.5">
          {playersSorted.map((p) => (
            <li key={p.uid} className="flex items-center gap-2 text-sm">
              <span>{p.avatar}</span>
              <span className={`min-w-0 flex-1 truncate font-black ${p.state === 'out' ? 'text-duo-muted line-through' : ''}`}>
                {p.name}
                {p.uid === myUid && ' (you)'}
              </span>
              {mode === 'team' && (
                <span className="text-xs font-black" style={{ color: p.team === 'a' ? '#58cc02' : '#1cb0f6' }}>
                  {p.team.toUpperCase()}
                </span>
              )}
              {p.state === 'out' && <Badge style={{ color: '#ff4b4b' }}>out</Badge>}
              {p.state === 'finished' && <Badge style={{ color: '#58cc02' }}>done</Badge>}
              <span className="w-16 text-right font-black">{p.score}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 text-center">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void leave()}>
          Leave match
        </button>
      </div>
    </div>
  );
}
