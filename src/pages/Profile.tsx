import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { AVATARS, useStore } from '../lib/store';
import { SUBJECTS } from '../lib/content';
import { Card, Empty, PageHeader } from '../components/ui';

export default function Profile() {
  const { store, updateProfile, totalXp, weekXp, streak, accuracy, quizzesTaken } = useStore();
  const { configured, user, onlineProfile, loading, signUp, signIn, signOut, deleteAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(store.profile.displayName);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mastered = Object.values(store.topicProgress).filter((p) => p.status === 'mastered').length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    const { error } = mode === 'in'
      ? await signIn(email, password)
      : await signUp(email, password, name || email.split('@')[0]);
    setMsg(error ?? (mode === 'in' ? 'Signed in!' : 'Account created — check your email if confirmation is required.'));
  };

  return (
    <div>
      <PageHeader title="Profile" sub="Local progress always works. Online accounts unlock leagues and synced profiles." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>{store.profile.avatar} {store.profile.displayName || 'Local learner'}</h3>
          <p style={{ color: 'var(--muted)' }}>
            Year {store.profile.year ?? '—'} · {store.profile.subjects.length} subjects · {totalXp} lifetime XP ·
            Week {weekXp} XP · {streak}-day streak · {quizzesTaken} quizzes · {Math.round(accuracy * 100)}% accuracy · {mastered} topics mastered
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>Display name
              <input className="input" value={store.profile.displayName} onChange={(e) => updateProfile({ displayName: e.target.value.slice(0, 24) })} placeholder="Display name" />
            </label>
            <div>Avatar
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {AVATARS.map((a) => (
                  <button key={a} className={store.profile.avatar === a ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ padding: '4px 10px' }} onClick={() => updateProfile({ avatar: a })} aria-label={`Avatar ${a}`}>{a}</button>
                ))}
              </div>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Subjects: {store.profile.subjects.map((id) => SUBJECTS.find((s) => s.id === id)?.name ?? id).join(', ') || 'none'} — <Link to="/settings">change in Settings</Link></p>
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Online account</h3>
          {!configured && (
            <Empty title="Not configured" body="Supabase isn't set up, so sign-in is unavailable. Local revision is unaffected. See docs/supabase-setup.md." />
          )}
          {configured && loading && <p style={{ color: 'var(--muted)' }}>Checking session…</p>}
          {configured && !loading && !user && (
            <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={mode === 'in' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setMode('in')}>Sign in</button>
                <button type="button" className={mode === 'up' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setMode('up')}>Sign up</button>
              </div>
              {mode === 'up' && (
                <input className="input" placeholder="Display name (unique, no real name needed)" value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} />
              )}
              <input className="input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <input className="input" type="password" required placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
              <button className="btn btn-primary" type="submit">{mode === 'in' ? 'Sign in' : 'Create account'}</button>
              {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>We collect as little as possible: email + display name only. No real names, schools or addresses required.</p>
            </form>
          )}
          {configured && user && (
            <div>
              <p>Signed in as <strong>{user.email}</strong></p>
              {onlineProfile && <p style={{ color: 'var(--muted)' }}>🏆 {onlineProfile.tier} · Week {onlineProfile.weekXp} XP · Lifetime {onlineProfile.lifetimeXp} XP</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
                {!confirmDelete
                  ? <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete account…</button>
                  : <>
                    <button className="btn btn-danger" onClick={async () => {
                      const { error } = await deleteAccount();
                      setMsg(error ?? 'Account profile deleted. Remove the auth user in the Supabase dashboard to finish (see docs).');
                      setConfirmDelete(false);
                    }}>Confirm delete</button>
                    <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </>}
              </div>
              {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
