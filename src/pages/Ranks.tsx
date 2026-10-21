import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { firebaseDb } from '../lib/firebase';
import { ELO_START, RANKS, eloTier, rankFor } from '../lib/ranks';
import { useStore } from '../lib/store';
import { ActionButton, Badge, Card, Empty, PageHeader, ProgressBar } from '../components/ui';

interface Row {
  uid: string;
  displayName: string;
  avatar: string;
  lifetimeXp: number;
  elo: number;
}

export default function Ranks() {
  const { configured, user, profile } = useAuth();
  const { totalXp, store } = useStore();
  const [byXp, setByXp] = useState<Row[] | null>(null);
  const [byElo, setByElo] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'xp' | 'elo'>('xp');

  const mine = rankFor(totalXp);
  const elo = profile?.elo ?? ELO_START;
  const tier = eloTier(elo);

  useEffect(() => {
    const db = firebaseDb();
    if (!db || !configured || !user) return;
    let cancelled = false;

    const read = async (orderField: 'lifetimeXp' | 'elo') => {
      const snap = await getDocs(query(collection(db, 'profiles'), orderBy(orderField, 'desc'), limit(50)));
      return snap.docs.map((d) => {
        const v = d.data() as Partial<Row>;
        return {
          uid: d.id,
          displayName: String(v.displayName ?? 'revixer'),
          avatar: String(v.avatar ?? '🚀'),
          lifetimeXp: Number(v.lifetimeXp ?? 0),
          elo: Number(v.elo ?? ELO_START),
        };
      });
    };

    void (async () => {
      try {
        const [xp, eloRows] = await Promise.all([read('lifetimeXp'), read('elo')]);
        if (!cancelled) {
          setByXp(xp);
          setByElo(eloRows);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load standings.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  const rows = tab === 'xp' ? byXp : byElo;
  const myIndex = rows?.findIndex((r) => r.uid === user?.uid) ?? -1;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ranks" sub="Lifetime XP never drops. Match rating moves with every game." />

      {/* Rank recap */}
      <Card style={{ borderColor: mine.rank.color }}>
        <div className="flex flex-col items-center text-center">
          <div className="text-xs font-black tracking-widest uppercase text-duo-muted">Your rank</div>
          <div
            className="my-3 grid h-28 w-28 place-items-center rounded-full border-4 bg-white text-5xl"
            style={{ borderColor: mine.rank.color, boxShadow: `0 0 24px ${mine.rank.color}44` }}
          >
            {mine.rank.emoji}
          </div>
          <div className="text-2xl font-black" style={{ color: mine.rank.color }}>
            {mine.rank.name}
          </div>
          <div className="mt-1 text-sm font-bold text-duo-muted">{totalXp.toLocaleString()} lifetime XP</div>

          <div className="mt-4 w-full max-w-sm">
            <div className="mb-1 flex justify-between text-xs font-black text-duo-muted">
              <span>{mine.next ? `Next: ${mine.next.name}` : 'Max rank'}</span>
              <span>{mine.next ? `${mine.xpNeeded} XP to go` : 'Complete!'}</span>
            </div>
            <ProgressBar pct={mine.progress} />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="stat-pill">🔥 {store.streak} day streak</span>
            <span className="stat-pill">🎮 {profile?.matchesPlayed ?? store.activities.filter((a) => a.kind === 'match').length} matches</span>
            <span className="stat-pill" style={{ color: '#1cb0f6' }}>
              <span className="text-duo-blue">{elo}</span>&nbsp;rating
            </span>
          </div>
        </div>
      </Card>

      {/* Competitive tier */}
      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl text-white"
            style={{ background: tier.color }}
          >
            {tier.emoji}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black tracking-widest uppercase text-duo-muted">Match rating</div>
            <div className="font-black" style={{ color: tier.color }}>
              {elo} · {tier.name}
            </div>
            <div className="text-xs font-bold text-duo-muted">
              {profile?.eloWins ?? 0}W – {profile?.eloLosses ?? 0}L
              {profile && profile.eloWins + profile.eloLosses === 0 && ' · play your first match to place'}
            </div>
          </div>
          <div className="ml-auto">
            <ActionButton size="sm" variant="secondary" to="/play">
              Play
            </ActionButton>
          </div>
        </div>
        <p className="mt-3 text-xs font-bold text-duo-muted">
          Rating comes from wins, losses and placements against similarly-rated players. XP rank is
          separate and never drops — no relegation, ever.
        </p>
      </Card>

      {/* Ladder */}
      <Card className="mt-4">
        <h3 className="mb-3 font-black">XP ladder</h3>
        <ol className="flex flex-col gap-1.5">
          {RANKS.map((r, i) => {
            const current = r.id === mine.rank.id;
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  current ? 'border-2 bg-duo-soft' : 'border-2 border-transparent'
                }`}
                style={current ? { borderColor: r.color } : undefined}
              >
                <span className="w-6 text-center text-xs font-black text-duo-muted">{i + 1}</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-lg shadow" style={{ border: `2px solid ${r.color}` }}>
                  {r.emoji}
                </span>
                <span className="flex-1 text-sm font-black" style={{ color: current ? r.color : undefined }}>
                  {r.name}
                </span>
                <span className="text-xs font-bold text-duo-muted">{r.minXp.toLocaleString()}+ XP</span>
                {current && <Badge style={{ color: '#fff', background: r.color, borderColor: r.color }}>you</Badge>}
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Leaderboard */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black">Leaderboard</h3>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab('xp')}
              className={`rounded-lg px-3 py-1 text-xs font-black uppercase ${tab === 'xp' ? 'bg-duo-green text-white' : 'bg-duo-soft text-duo-muted'}`}
            >
              XP
            </button>
            <button
              type="button"
              onClick={() => setTab('elo')}
              className={`rounded-lg px-3 py-1 text-xs font-black uppercase ${tab === 'elo' ? 'bg-duo-blue text-white' : 'bg-duo-soft text-duo-muted'}`}
            >
              Rating
            </button>
          </div>
        </div>

        {!configured && (
          <Empty
            title="Offline standings"
            body="Firebase isn't configured, so there's no online leaderboard to show — and we won't invent players. Your own rank above is tracked on this device."
            action={
              <ActionButton variant="ghost" to="/profile">
                Profile
              </ActionButton>
            }
          />
        )}
        {configured && !user && (
          <Empty
            title="Sign in to compare"
            body="The leaderboard needs an account. Solo revision and your local rank work without one."
            action={
              <ActionButton to="/">
                Sign in
              </ActionButton>
            }
          />
        )}
        {configured && user && (
          <>
            {error && <p className="text-sm font-bold text-duo-red">Couldn't load: {error}</p>}
            {!rows && !error && <p className="text-sm font-bold text-duo-muted">Loading standings…</p>}
            {rows && rows.length === 0 && (
              <p className="text-sm font-bold text-duo-muted">No ranked players yet — play a match and you'll be first.</p>
            )}
            {rows && rows.length > 0 && (
              <ol className="flex flex-col gap-1.5">
                {rows.slice(0, 20).map((r, i) => {
                  const rp = rankFor(r.lifetimeXp);
                  const isMe = r.uid === user.uid;
                  return (
                    <li
                      key={r.uid}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isMe ? 'border-2 border-duo-blue bg-duo-blue/10' : ''}`}
                    >
                      <span className="w-6 text-center text-sm font-black text-duo-muted">{i + 1}</span>
                      <span className="text-lg">{r.avatar}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-black">
                        {r.displayName}
                        {isMe && ' (you)'}
                      </span>
                      <span className="text-xs font-black" style={{ color: rp.rank.color }}>
                        {rp.rank.emoji} {rp.rank.name}
                      </span>
                      <span className="w-20 text-right text-sm font-black">
                        {tab === 'xp' ? `${r.lifetimeXp.toLocaleString()} XP` : `${r.elo} rtg`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {myIndex >= 20 && (
              <p className="mt-2 text-center text-xs font-bold text-duo-muted">
                You're #{myIndex + 1} — keep playing to climb the top 20.
              </p>
            )}
          </>
        )}
      </Card>

      <p className="mt-4 text-center text-xs font-bold text-duo-muted">
        Want to earn XP? <Link to="/dashboard" className="text-duo-blue hover:underline">Go learn something</Link>.
      </p>
    </div>
  );
}
