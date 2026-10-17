import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { firebaseDb } from '../lib/firebase';
import { RANKS, rankFor } from '../lib/ranks';
import { useStore } from '../lib/store';
import { Card, Empty, PageHeader, ProgressBar } from '../components/ui';

interface Row { displayName: string; avatar: string; lifetimeXp: number; }

export default function Ranks() {
  const { configured, user } = useAuth();
  const { totalXp } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  const mine = rankFor(totalXp);

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

  return (
    <div>
      <PageHeader title="Ranks" sub="Earn lifetime XP from real revision to climb. No seasons, no relegation — your rank never drops." />
      <Card style={{ marginBottom: 12, borderColor: mine.rank.color }}>
        <h3 style={{ marginTop: 0 }}>{mine.rank.emoji} {mine.rank.name}</h3>
        <p style={{ color: 'var(--muted)' }}>{totalXp} lifetime XP on this device.</p>
        {mine.next ? (
          <>
            <ProgressBar pct={mine.progress} />
            <p style={{ color: 'var(--muted)' }}>{mine.xpNeeded} XP to {mine.next.emoji} {mine.next.name}</p>
          </>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Max rank reached — legendary!</p>
        )}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>All ranks</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {RANKS.map((r) => (
            <div key={r.id} style={{
              display: 'flex', gap: 10, alignItems: 'center', padding: '6px 10px',
              borderRadius: 8, border: r.id === mine.rank.id ? `2px solid ${r.color}` : '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '1.3rem' }}>{r.emoji}</span>
              <strong style={{ color: r.color }}>{r.name}</strong>
              <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>{r.minXp}+ XP</span>
              {r.id === mine.rank.id && <span className="badge">you</span>}
            </div>
          ))}
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
        <Card>
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
