import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  BookOpen,
  Home,
  LogOut,
  Menu,
  Settings,
  Swords,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { rankFor } from '../lib/ranks';

const NAV = [
  { to: '/dashboard', label: 'Learn', icon: Home },
  { to: '/play', label: 'Play', icon: Swords },
  { to: '/curriculum', label: 'Curriculum', icon: BookOpen },
  { to: '/ranks', label: 'Ranks', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { totalXp, store } = useStore();
  const { signOut, configured, user } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();

  const rank = rankFor(totalXp).rank;

  const navItems = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setDrawer(false)}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wide transition-colors',
              isActive
                ? 'bg-duo-blue/15 text-duo-blue-dark'
                : 'text-duo-muted hover:bg-duo-soft hover:text-duo-ink',
            ].join(' ')
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
      <button
        type="button"
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black uppercase tracking-wide text-duo-muted hover:bg-duo-soft hover:text-duo-red"
        onClick={() => {
          void signOut();
          navigate('/');
        }}
      >
        <LogOut size={20} /> {configured && user ? 'Sign out' : 'Exit guest'}
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 border-r-2 border-duo-line p-4 lg:flex">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-duo-green text-xl text-white shadow-duo-green">🎮</span>
          <span className="text-xl font-black tracking-tight text-duo-green">Revix</span>
        </Link>
        {navItems}
        <div className="mt-auto rounded-xl border-2 border-duo-line bg-duo-soft p-3 text-xs font-bold text-duo-muted">
          <div className="mb-1 flex items-center justify-between">
            <span>Rank</span>
            <span className="text-sm font-black" style={{ color: rank.color }}>
              {rank.emoji} {rank.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Lifetime XP</span>
            <span className="font-black text-duo-ink">{totalXp.toLocaleString()}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b-2 border-duo-line bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-1.5 text-duo-muted hover:bg-duo-soft"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-1.5 text-lg font-black text-duo-green">
            🎮 Revix
          </Link>
          <div className="flex items-center gap-2 text-sm font-black">
            <span title="Streak">🔥 {store.streak}</span>
            <span title="Lifetime XP" className="text-duo-blue">⚡ {totalXp}</span>
          </div>
        </header>

        {/* Desktop top stats */}
        <div className="hidden items-center justify-end gap-3 border-b-2 border-duo-line px-6 py-3 lg:flex">
          <span className="stat-pill" title="Daily streak">🔥 {store.streak} day streak</span>
          <span className="stat-pill" title="Lifetime XP">⚡ {totalXp.toLocaleString()} XP</span>
          <span className="stat-pill" title="Current rank" style={{ color: rank.color, borderColor: rank.color }}>
            {rank.emoji} {rank.name}
          </span>
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <div className="absolute top-0 left-0 flex h-full w-64 flex-col gap-6 bg-white p-4">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" onClick={() => setDrawer(false)} className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-duo-green text-white shadow-duo-green">🎮</span>
                <span className="text-lg font-black text-duo-green">Revix</span>
              </Link>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="p-1 text-duo-muted">
                <X size={22} />
              </button>
            </div>
            {navItems}
          </div>
        </div>
      )}
    </div>
  );
}
