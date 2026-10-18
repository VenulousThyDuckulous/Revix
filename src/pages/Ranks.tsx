import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { firebaseDb } from '../lib/firebase';
import { RANKS, rankFor } from '../lib/ranks';
import { useStore } from '../lib/store';
import { Card, Empty, PageHeader } from '../components/ui';

interface Row { displayName: string; avatar: string; lifetimeXp: number; }

export default function Ranks() {
  const { configured, user } = useAuth();
  const { totalXp, streak, quizzesTaken } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [rankedUp, setRankedUp] = useState(false);

  const mine = rankFor(totalXp);
  const prevKey = `revix:prevrank:${mine.rank.id}`;

  useEffect(() => {
    const db = firebaseDb();
    if (!db || !configured || !user) {
      setRows(null);
      return;
    }
    getDocs(query(collection(db, 'profiles'), orderBy('lifetimeXp', 'desc'), limit(50)))
      .then((snap) => {
        setRows(snap.docs.map((d) => {
          const v = d.data() as Partial<Row>;
          return {
            displayName: String(v.displayName ?? 'revixer'),
            avatar: String(v.avatar ?? '🚀'),
            lifetimeXp: Number(v.lifetimeXp ?? 0),
          };
        }));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load ranks.'));
  }, [configured, user]);

  // Detect a rank-up (first time viewing this rank after earning enough XP)
  const prevRankId = localStorage.getItem(prevKey);
  if (!prevRankId || RANKS.findIndex((r) => r.id === prevRankId) < RANKS.findIndex((r) => r.id === mine.rank.id)) {
    localStorage.setItem(prevKey, mine.rank.id);
    if (mine.rank.id !== 'unranked') setRankedUp(true);
  }

  const rankColor = mine.rank.color;
  const placement = rows ? rows.findIndex((r) => r.displayName === (user?.email ?? '')) + 1 : null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Ranks" sub="Earn lifetime XP from real revision to climb. No seasons, no relegation — your rank never drops." />

      {/* Rank recap — Rocket League style */}
      {rankedUp && (
        <Card style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', textAlign: 'center', padding: 40, borderRadius: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--warn)', marginBottom: 8 }}>RANK UP!</div>
          <div
            style={{
              width: 110, height: 110, borderRadius: '50%', margin: '0 auto 16px',
              background: `radial-gradient(circle at 30% 30%, ${rankColor}, #0f172a)`,
              border: `4px solid ${rankColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 40px ${rankColor}40`,
            }}
          >
            <span style={{ fontSize: '3rem' }}>{mine.rank.emoji}</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: 4 }}>{mine.rank.name}</div>
          <div style={{ opacity: 0.85 }}>You reached a new rank — keep revising to go higher.</div>
        </Card>
      )}

      {/* Your rank */}
      <Card style={{ textAlign: 'center', padding: 32, border: `2px solid ${rankColor}`, background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)' }}>YOUR RANK</div>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: rankColor }}>{mine.rank.name}</span>
        </div>
        <div style={{ width: 150, height: 150, borderRadius: '50%', margin: '0 auto 18px', background: '#fff',
          border: `3px solid ${rankColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 30px ${rankColor}30`, position: 'relative' }}>
          <span style={{ fontSize: '3.5rem' }}>{mine.rank.emoji}</span>
          {mine.rank.id !== 'alpha' && (
            <div style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: 'var(--good)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, border: '2px solid #fff' }}>
              {RANKS.indexOf(mine.rank) + 1}
            </div>
          )}
        </div>
        <div style={{ fontSize: '1.1rem', color: 'var(--muted)' }}>{totalXp} lifetime XP</div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{mine.next ? `To ${mine.next.name}` : 'Max rank reached'}</div>
          <div style={{ width: 260, height: 10, background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 5, margin: '6px auto 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: mine.next ? mine.progress * 100 : 100, background: `linear-gradient(90deg, ${rankColor}, #06b6d4)` }}></div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
            {mine.next ? `${mine.xpNeeded} XP to go` : 'Legendary status unlocked!'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)' }}>PLACEMENT</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{placement ?? '—'}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)' }}>STREAK</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{streak}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)' }}>QUIZZES</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{quizzesTaken}</div>
          </div>
        </div>
      </Card>

      {/* All ranks ladder */}
      <Card style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>All ranks</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {RANKS.map((r) => {
            const idx = RANKS.indexOf(r);
            return (
              <div key={r.id} style={{
                display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px',
                borderRadius: 10, border: r.id === mine.rank.id ? `2px solid ${r.color}` : '1px solid var(--border)',
                background: r.id === mine.rank.id ? 'var(--surface-2)' : 'transparent',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', border: `1px solid var(--border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)' }}>{idx + 1}</div>
                <div
                  style={{ width: 34, height: 34, borderRadius: '50%', marginLeft: -4, background: `radial-gradient(circle at 30% 30%, ${r.color}, #0f172a)`, border: `2px solid ${r.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${r.color}40` }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{r.emoji}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: r.color }}>{r.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{r.minXp}+ XP</div>
                </div>
                {r.id === mine.rank.id && <span className="badge" style={{ background: rankColor, borderColor: rankColor, color: '#fff' }}>You are here</span>}
              </div>
            );
          })}
        </div>
      </Card>

      {!configured && (
        <Empty
          title="Online ranks unavailable"
          body="Firebase isn't configured, so there are no online standings to show — and we won't invent any. Your rank above is tracked on this device. See docs/firebase-setup.md to enable online ranks."
          action={<Link to="/profile" className="btn btn-ghost">Profile & sign-in</Link>}
        />
      )}
      {configured && !user && (
        <Empty
          title="Sign in to appear online"
          body="Online ranks need an account. Local revision and ranks work without one."
          action={<Link to="/profile" className="btn btn-primary">Sign in</Link>}
        />
      )}
      {configured && user && (
        <Card style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Top revisers (all time)</h3>
          {error && <p style={{ color: 'var(--bad)' }}>Couldn't load ranks: {error}</p>}
          {!rows && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
          {rows && rows.length === 0 && <p style={{ color: 'var(--muted)' }}>No ranked players yet — revise and you'll be first.</p>}
          {rows && rows.length > 0 && (
            <ol style={{ paddingLeft: 20 }}>
              {rows.map((r, i) => {
                const rp = rankFor(r.lifetimeXp);
                return (
                  <li key={i} style={{ padding: '4px 0' }}>
                    {r.avatar} <strong>{r.displayName}</strong> · {rp.rank.emoji} {rp.rank.name} · {r.lifetimeXp} XP
                    {i === 0 && <span className="badge" style={{ marginLeft: 6 }}>👑 top</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}
