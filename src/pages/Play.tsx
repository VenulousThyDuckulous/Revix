import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { SUBJECTS } from '../lib/content';
import { MODES, capacityLabel, modeInfo } from '../lib/modes';
import {
  DEFAULT_SETTINGS,
  MultiplayerUnavailableError,
  createRoom,
  joinRoom,
  normalizeCode,
  quickMatch,
  sweepStaleRooms,
} from '../lib/multiplayer';
import { leaveGuestMode } from '../App';
import { ActionButton, Card, PageHeader } from '../components/ui';
import type { GameMode, RoomSettings } from '../lib/types';

type Identity = 'checking' | 'ready' | 'needs-account' | 'offline';

export default function Play() {
  const { configured, user, ensureIdentity, profile, signOut } = useAuth();
  const { store } = useStore();
  const navigate = useNavigate();

  const [identity, setIdentity] = useState<Identity>(configured ? 'checking' : 'offline');
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<GameMode | 'join' | null>(null);

  useEffect(() => {
    if (!configured) {
      setIdentity('offline');
      return;
    }
    let cancelled = false;
    void (async () => {
      const ok = await ensureIdentity();
      if (cancelled) return;
      if (ok) {
        setIdentity('ready');
        if (user?.uid) void sweepStaleRooms(user.uid);
      } else if (user) {
        setIdentity('ready');
      } else {
        setIdentity('needs-account');
      }
    })();
    return () => {
      cancelled = true;
    };
    // ensureIdentity is stable; re-run only when auth state flips.
  }, [configured, ensureIdentity, user?.uid]);

  function me() {
    return {
      uid: user?.uid ?? '',
      name: store.profile.displayName || profile?.displayName || 'revixer',
      avatar: store.profile.avatar || profile?.avatar || '🚀',
      elo: profile?.elo ?? 1000,
    };
  }

  async function startQuick(mode: GameMode) {
    setError('');
    setBusy(mode);
    try {
      const code = await quickMatch(mode, settings, me());
      navigate(`/room/${code}`);
    } catch (e) {
      setError(e instanceof MultiplayerUnavailableError ? 'Online play is unavailable right now.' : e instanceof Error ? e.message : 'Could not start a match.');
    } finally {
      setBusy(null);
    }
  }

  async function hostRoom(mode: GameMode) {
    setError('');
    setBusy(mode);
    try {
      const code = await createRoom(mode, settings, me());
      navigate(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a room.');
    } finally {
      setBusy(null);
    }
  }

  async function joinByCode(e: FormEvent) {
    e.preventDefault();
    const code = normalizeCode(joinCode);
    if (code.length < 4) {
      setError('Enter the room code (at least 4 characters).');
      return;
    }
    setError('');
    setBusy('join');
    try {
      const team: 'a' | 'b' = 'a';
      await joinRoom(code, me(), team);
      navigate(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that room.');
    } finally {
      setBusy(null);
    }
  }

  function exitGuest() {
    leaveGuestMode();
    void signOut();
    navigate('/', { replace: true });
  }

  return (
    <div>
      <PageHeader
        title="Play"
        sub="Real-time multiplayer against other Revix players."
        right={
          <span className="stat-pill" title="Your match rating">
            <Zap size={14} className="text-duo-blue" /> {profile?.elo ?? 1000} rating
          </span>
        }
      />

      {identity === 'checking' && (
        <Card className="text-center text-sm font-bold text-duo-muted">Connecting…</Card>
      )}

      {identity === 'offline' && (
        <Card>
          <h2 className="font-black">Multiplayer is offline</h2>
          <p className="mt-1 text-sm font-bold text-duo-muted">
            This build has no Firebase keys, so live matches can't run — and we won't fake opponents.
            Solo revision still works:
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton to="/dashboard">Practise lessons</ActionButton>
            <ActionButton variant="ghost" to="/curriculum">
              Browse curriculum
            </ActionButton>
          </div>
          <p className="mt-3 text-xs font-bold text-duo-muted">
            Set the four VITE_FIREBASE_* GitHub Actions variables to enable online play — see
            docs/firebase-setup.md.
          </p>
        </Card>
      )}

      {identity === 'needs-account' && (
        <Card>
          <h2 className="font-black">Multiplayer needs an account</h2>
          <p className="mt-1 text-sm font-bold text-duo-muted">
            Anonymous sign-in is disabled on the Firebase project, so live rooms require a real (free)
            account. Create one from the start page, then come back to Play.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton onClick={exitGuest}>Go create an account</ActionButton>
          </div>
        </Card>
      )}

      {identity === 'ready' && (
        <>
          {/* Match settings */}
          <Card className="mb-5">
            <h3 className="text-sm font-black tracking-wide uppercase text-duo-muted">Match settings</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-black text-duo-muted">
                Subject
                <select
                  className="input mt-1"
                  value={settings.subject ?? ''}
                  onChange={(e) => setSettings((s) => ({ ...s, subject: e.target.value || null }))}
                >
                  <option value="">Mixed subjects</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-black text-duo-muted">
                Questions
                <select
                  className="input mt-1"
                  value={settings.questionCount}
                  onChange={(e) => setSettings((s) => ({ ...s, questionCount: Number(e.target.value) }))}
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
                  value={settings.secondsPerQuestion}
                  onChange={(e) => setSettings((s) => ({ ...s, secondsPerQuestion: Number(e.target.value) }))}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </label>
            </div>
          </Card>

          {error && (
            <p className="mb-4 rounded-xl border-2 border-duo-red bg-red-50 px-4 py-2 text-sm font-bold text-duo-red">
              {error}
            </p>
          )}

          {/* Mode grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.id} style={{ borderColor: m.color }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-xl text-white"
                      style={{ background: m.color }}
                    >
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3 className="font-black">{m.name}</h3>
                      <div className="text-xs font-black text-duo-muted">
                        {m.tagline} · {capacityLabel(m.id)}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-bold text-duo-muted">{m.blurb}</p>
                  <div className="mt-4 flex gap-2">
                    <ActionButton
                      size="sm"
                      variant="secondary"
                      disabled={busy !== null}
                      onClick={() => void startQuick(m.id)}
                    >
                      {busy === m.id ? 'Finding…' : 'Quick match'}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() => void hostRoom(m.id)}
                    >
                      Create room
                    </ActionButton>
                  </div>
                  <div className="mt-2 text-xs font-bold text-duo-muted">
                    Needs {modeInfo(m.id).minPlayers}+ player{modeInfo(m.id).minPlayers > 1 ? 's' : ''} to start.
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Join by code */}
          <Card className="mt-5">
            <h3 className="font-black">Have a code?</h3>
            <form onSubmit={joinByCode} className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                className="input sm:flex-1"
                placeholder="Room code, e.g. K7PXQ2"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                maxLength={8}
                autoCapitalize="characters"
              />
              <ActionButton type="submit" disabled={busy !== null || joinCode.trim().length < 4}>
                {busy === 'join' ? 'Joining…' : 'Join room'}
              </ActionButton>
            </form>
            <p className="mt-2 text-xs font-bold text-duo-muted">
              Share the code (or link) from your lobby — everyone joins the same match.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
