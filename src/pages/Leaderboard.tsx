import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { seasonEndUtc, seasonIdFor, TIER_META, TIERS, type Tier } from '../lib/leagues';
import { supabase } from '../lib/supabase';
import { Card, Empty, PageHeader } from '../components/ui';

interface Row { display_name: string; tier: string; week_xp: number; lifetime_xp: number; is_me?: boolean; }

export default function Leaderboard() {
  const { configured, user } = useAuth();
  const { weekXp } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'league' | 'global'>('league');

  const seasonId = seasonIdFor();
  const end = seasonEndUtc(seasonId);
  const ms = Math.max(0, end.getTime() - Date.now());

  useEffect(() => {
    const sb = supabase();
    if (!sb || !user) {
      setRows(null);
      return;
    }
    sb.from('profiles')
      .select('display_name,tier,week_xp,lifetime_xp')
      .order(tab === 'league' ? 'week_xp' : 'lifetime_xp', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows((data ?? []) as Row[]);
      });
  }, [user, tab]);

  return (
    <div>
      <PageHeader title="Leaderboard" sub={`Season ${seasonId} · ends in ${Math.floor(ms / 86_400_000)}d ${Math.floor((ms % 86_400_000) / 3_600_000)}h · Top 20% promoted, bottom 20% relegated weekly (Mon 00:00 UTC).`} />
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>League tiers</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIERS.map((t: Tier) => (
            <span key={t} className="badge" style={{ borderColor: TIER_META[t].color }}>
              {TIER_META[t].emoji} {TIER_META[t].name}
            </span>
          ))}
        </div>
        <p style={{ color: 'var(--muted)' }}>New players start in Bronze. Champion is the highest tier. Ties break by activity count, then earliest activity.</p>
      </Card>

      {!configured && (
        <Empty
          title="Online leaderboards unavailable"
          body="Supabase isn't configured, so there are no online standings to show — and we won't invent any. Your weekly League XP on this device is tracked below. See docs/supabase-setup.md to enable online leagues."
          action={<Link to="/profile" className="btn btn-ghost">Profile & sign-in</Link>}
        />
      )}
      {configured && !user && (
        <Empty
          title="Sign in to compete"
          body="Leaderboards need an online account. Local revision works without one."
          action={<Link to="/profile" className="btn btn-primary">Sign in</Link>}
        />
      )}
      {configured && user && (
        <Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className={tab === 'league' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setTab('league')}>League standings</button>
            <button className={tab === 'global' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setTab('global')}>Global standings</button>
          </div>
          {error && <p style={{ color: 'var(--bad)' }}>Couldn't load standings: {error}</p>}
          {!rows && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
          {rows && rows.length === 0 && <p style={{ color: 'var(--muted)' }}>No players yet this season — you're early. Your XP will appear here once recorded.</p>}
          {rows && rows.length > 0 && (
            <ol style={{ paddingLeft: 20 }}>
              {rows.map((r, i) => (
                <li key={i} style={{ padding: '4px 0' }}>
                  <strong>{r.display_name}</strong> · {r.tier} · {tab === 'league' ? r.week_xp : r.lifetime_xp} XP
                  {i < Math.max(1, Math.floor(rows.length * 0.2)) && <span className="badge" style={{ marginLeft: 6 }}>▲ promotion zone</span>}
                  {i >= rows.length - Math.max(1, Math.floor(rows.length * 0.2)) && rows.length >= 3 && <span className="badge" style={{ marginLeft: 6 }}>▼ relegation zone</span>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
      <Card style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>This device</h3>
        <p>Weekly League XP here: <strong>{weekXp}</strong>. Local scores are never presented as global ranks.</p>
      </Card>
    </div>
  );
}
