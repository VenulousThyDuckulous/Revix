import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Swords, Trophy, Users, Zap } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { enterGuestMode } from '../App';
import { ActionButton, Card } from '../components/ui';

const FEATURES = [
  {
    icon: Swords,
    title: '1v1 Quiz Duels',
    body: 'Race someone head-to-head on the same GCSE questions — speed and accuracy both count.',
    tone: 'text-duo-green',
  },
  {
    icon: Users,
    title: 'Battle Royale',
    body: 'One wrong answer and you are out. Last student standing takes the crown.',
    tone: 'text-duo-red',
  },
  {
    icon: Trophy,
    title: 'Team Battles',
    body: 'Split into two teams and combine your scores. Climb together or lose together.',
    tone: 'text-duo-blue',
  },
  {
    icon: Zap,
    title: '60-second Sprint',
    body: 'Everyone gets the same 60 seconds — most correct answers wins.',
    tone: 'text-duo-orange',
  },
];

export default function Landing() {
  const { signIn, signUp, configured, error } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = mode === 'in' ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (ok) navigate('/onboarding', { replace: true });
  }

  function playAsGuest() {
    enterGuestMode();
    navigate('/onboarding', { replace: true });
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-duo-green text-xl text-white shadow-duo-green">
            🎮
          </span>
          <span className="text-2xl font-black tracking-tight text-duo-green">Revix</span>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="ghost" size="sm" onClick={() => setMode('in')}>
            Sign in
          </ActionButton>
          <ActionButton size="sm" onClick={() => setMode('up')}>
            Sign up
          </ActionButton>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {/* Hero */}
        <section className="py-8 text-center sm:py-14">
          <h1 className="mx-auto max-w-3xl text-4xl leading-tight font-black sm:text-6xl">
            Multiplayer revision that makes <span className="text-duo-green">GCSE revision</span> feel like a game
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-bold text-duo-muted">
            Battle your friends in quiz duels, survive Battle Royales and climb the ranks — built on the
            real GCSE curriculum, from Year 10 to Year 11.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <ActionButton size="lg" onClick={() => setMode('up')}>
              Get started — it's free
            </ActionButton>
            <ActionButton size="lg" variant="ghost" onClick={playAsGuest}>
              Continue as guest
            </ActionButton>
          </div>
          {!configured && (
            <p className="mx-auto mt-4 max-w-xl rounded-xl border-2 border-duo-yellow bg-yellow-50 px-4 py-2 text-sm font-bold text-duo-ink">
              Heads up: online multiplayer is offline until Firebase keys are configured
              (see docs/firebase-setup.md). Solo revision still works.
            </p>
          )}
        </section>

        {/* Auth card */}
        <section className="mx-auto max-w-md">
          <Card>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black uppercase ${mode === 'in' ? 'border-duo-blue bg-duo-blue/10 text-duo-blue-dark' : 'border-duo-line text-duo-muted'}`}
                onClick={() => setMode('in')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-black uppercase ${mode === 'up' ? 'border-duo-blue bg-duo-blue/10 text-duo-blue-dark' : 'border-duo-line text-duo-muted'}`}
                onClick={() => setMode('up')}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3">
              {mode === 'up' && (
                <label className="text-sm font-black text-duo-muted">
                  Name
                  <input
                    className="input mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How you'll appear in matches"
                    maxLength={24}
                  />
                </label>
              )}
              <label className="text-sm font-black text-duo-muted">
                Email
                <input
                  className="input mt-1"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="text-sm font-black text-duo-muted">
                Password
                <input
                  className="input mt-1"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>

              {error && (
                <p className="rounded-xl border-2 border-duo-red bg-red-50 px-3 py-2 text-sm font-bold text-duo-red">
                  {error}
                </p>
              )}

              <ActionButton type="submit" disabled={busy} full>
                {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
              </ActionButton>
            </form>

            <p className="mt-3 text-center text-xs font-bold text-duo-muted">
              Accounts are free and store your rank, XP and match rating.
            </p>
          </Card>
        </section>

        {/* Features */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body, tone }) => (
            <Card key={title}>
              <Icon size={28} className={tone} />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1 text-sm font-bold text-duo-muted">{body}</p>
            </Card>
          ))}
        </section>

        {/* Ranks teaser */}
        <section className="mt-10">
          <Card className="text-center">
            <Gamepad2 className="mx-auto text-duo-purple" size={30} />
            <h3 className="mt-2 text-xl font-black">13 ranks, zero relegation</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm font-bold text-duo-muted">
              Earn lifetime XP from real revision to climb Unranked → Bronze → Silver → Gold → Platinum →
              Diamond → Champion → Grand Champion → SSL → HSL → Delta → Sigma → Alpha. Your rank never drops.
            </p>
          </Card>
        </section>

        <footer className="mt-12 text-center text-xs font-bold text-duo-muted">
          Built for UK GCSE students. Curriculum-aligned content with sources documented in the repo.
        </footer>
      </main>
    </div>
  );
}
