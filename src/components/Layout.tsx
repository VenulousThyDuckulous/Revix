import { Link, NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  Award, Gamepad2, Home, LogOut, Trophy, User,
  Heart, Flame, Gem, MoreHorizontal, Crown,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { rankFor } from '../lib/ranks';
import { Logo } from './ui';

const NAV = [
  { to: '/dashboard', label: 'Learn', icon: Home },
  { to: '/ranks', label: 'Ranks', icon: Trophy },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'More', icon: MoreHorizontal },
];

export default function Layout() {
  const { totalXp, streak } = useStore();
  const { user, signOut, configured } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);

  const myRank = rankFor(totalXp);
  const heartCount = 5;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Left sidebar — Duolingo style */}
      <aside
        className="sidebar"
        style={{
          width: 250, flexShrink: 0, borderRight: '1px solid var(--border)',
          background: '#fff', padding: '18px 12px', position: 'sticky', top: 0, height: '100vh',
          overflowY: 'auto', zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Logo size={32} />
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-dark)' }}>Revix</span>
        </div>
        <nav aria-label="Main navigation" style={{ display: 'grid', gap: 4 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => (isActive ? 'navlink active' : 'navlink')}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                borderRadius: 12, textDecoration: 'none', color: 'var(--text)',
                background: isActive ? '#e3f2fd' : 'transparent',
                border: isActive ? '1px solid var(--accent-2)' : '1px solid transparent',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.95rem',
              })}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Right side: header + content */}
      <div style={{ flex: 1, minWidth: 0, background: 'var(--bg)' }}>
        {/* Top bar */}
        <header
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 24px', borderBottom: '1px solid var(--border)', background: '#fff',
            position: 'sticky', top: 0, zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">☰</button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              display: 'flex', gap: 4, alignItems: 'center', padding: '6px 10px',
              background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <Heart size="16" strokeWidth={2} fill={heartCount > 0 ? 'var(--bad)' : '#94a3b8'} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{heartCount}</span>
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Flame size="16" fill='#ff9800' />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{streak}</span>
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Gem size="16" fill='#5890ff' />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{totalXp}</span>
            </div>
            <div style={{
              display: 'flex', gap: 2, alignItems: 'center', padding: '4px 8px',
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <Crown size="16" fill='#f6ad55' />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{myRank.rank.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {configured && user ? (
              <button className="btn btn-ghost" onClick={signOut} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                <LogOut size="14" /> Sign out
              </button>
            ) : (
              <Link to="/profile" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>Sign in</Link>
            )}
          </div>
        </header>

        {mobileNav && (
          <nav aria-label="Mobile navigation" style={{ display: 'flex', gap: 6, padding: 10, borderBottom: '1px solid var(--border)', background: '#fff' }}>
            {NAV.map(({ to, label }) => (
              <NavLink key={to} to={to} onClick={() => setMobileNav(false)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600 }}>
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <main id="main" style={{ padding: '24px clamp(14px, 4vw, 40px)', maxWidth: 980, margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 901px) { .sidebar { display: block; } .sidebar + div header .btn:nth-child(1) { display: none; } }
        @media (max-width: 900px) { .sidebar { display: none; } }
      `}</style>
    </div>
  );
}
