import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { Logo } from '../components/ui';

const FEATURES = [
  { emoji: '📊', title: 'Dashboard', desc: 'Streaks, XP, ranks, weak topics and recommendations from your real activity.' },
  { emoji: '📚', title: 'Curriculum browser', desc: 'Year → Subject → Topic → Subtopic, with notes, reminders and progress tracking.' },
  { emoji: '📝', title: 'Quizzes & exam practice', desc: 'Six question types, timed modes, explanations and self-marked practice.' },
  { emoji: '🃏', title: 'Flashcards', desc: 'Spaced repetition, personal decks and validated import/export.' },
  { emoji: '🎮', title: 'Six revision games', desc: 'Quickfire, Match-Up, Memory Match, Topic Boss, Word Scramble and Exam Rush.' },
  { emoji: '🏅', title: 'Ranks & achievements', desc: 'Climb from Rookie to Champion and collect achievements as you revise.' },
];

export default function Landing() {
  const { configured, signIn, signUp } = useAuth();
  const { updateProfile } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    const { error } = mode === 'signup'
      ? await signUp(email, password, name || email.split('@')[0])
      : await signIn(email, password);
    if (error) setMsg(error);
    else nav('/dashboard');
  };

  const goOffline = () => {
    updateProfile({ guestMode: true });
    nav('/onboarding');
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Logo size={56} />
        </div>
        <p style={{ fontSize: '1.2rem', color: 'var(--muted)', margin: '8px 0' }}>Level up your learning.</p>
        <p style={{ maxWidth: 560, margin: '0 auto', color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>Revix</strong> is a free GCSE revision platform for
          Years 10–11: quizzes, flashcards, games and exam practice across 26 subjects,
          with ranks and achievements that track your real progress.
        </p>
      </div>

      <div className="card" style={{ padding: 22, textAlign: 'center', marginBottom: 24 }}>
        {!mode && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {configured ? (
              <>
                <button className="btn btn-primary" onClick={() => setMode('signup')}>Sign up</button>
                <button className="btn btn-ghost" onClick={() => setMode('signin')}>Sign in</button>
              </>
            ) : (
              <p style={{ color: 'var(--muted)' }}>Online accounts are not configured yet — start offline, sign in later.</p>
            )}
            <button className="btn btn-ghost" onClick={goOffline}>Continue without an account</button>
          </div>
        )}
        {mode && (
          <form onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 360, margin: '0 auto', textAlign: 'left' }}>
            <h3 style={{ margin: 0, textAlign: 'center' }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h3>
            {mode === 'signup' && (
              <input className="input" placeholder="Display name" value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))} aria-label="Display name" />
            )}
            <input className="input" type="email" required placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input className="input" type="password" required placeholder="Password (min 6 chars)" value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            <button className="btn btn-primary" type="submit">{mode === 'signup' ? 'Sign up' : 'Sign in'}</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setMode(null); setMsg(''); }}>
              ← Back
            </button>
            {msg && <p style={{ color: 'var(--muted)', textAlign: 'center' }}>{msg}</p>}
          </form>
        )}
      </div>

      <h2 style={{ textAlign: 'center' }}>Everything you need to revise</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {FEATURES.map((f) => (
          <div key={f.title} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '1.6rem' }}>{f.emoji}</div>
            <div style={{ fontWeight: 800 }}>{f.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 24 }}>
        No account needed to start · progress stays on your device unless you sign in ·{' '}
        <button onClick={goOffline} style={{ background: 'none', border: 'none', color: 'var(--accent-2)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}>
          browse as guest
        </button>
      </p>
    </div>
  );
}
