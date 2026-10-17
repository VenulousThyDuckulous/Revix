import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Award, BarChart3, BookOpen, CreditCard, Gamepad2, Home, Layers, LogOut,
  Moon, Search, Settings as SettingsIcon, Sun, Trophy, User, FileText,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { rankFor } from '../lib/ranks';
import { QUESTIONS, SUBJECTS, TOPICS } from '../lib/content';
import { Logo } from './ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/curriculum', label: 'My Curriculum', icon: BookOpen },
  { to: '/subjects', label: 'Subjects', icon: Layers },
  { to: '/quizzes', label: 'Quizzes', icon: FileText },
  { to: '/flashcards', label: 'Flashcards', icon: CreditCard },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/exam', label: 'Exam Practice', icon: BarChart3 },
  { to: '/ranks', label: 'Ranks', icon: Trophy },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout() {
  const { store, totalXp, streak, updateProfile } = useStore();
  const { user, signOut } = useAuth();
  const [q, setQ] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();

  const results = q.trim().length > 1 ? searchAll(q.trim()) : null;

  const toggleTheme = () => updateProfile({ theme: store.profile.theme === 'dark' ? 'light' : 'dark' });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <a href="#main" className="skip-link">Skip to content</a>
      <aside
        className="sidebar"
        style={{
          width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
          background: 'var(--bg-soft)', padding: 16, position: 'sticky', top: 0, height: '100vh',
          overflowY: 'auto',
        }}
      >
        <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}><Logo /></Link>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '4px 0 16px' }}>Level up your learning</p>
        <nav aria-label="Main navigation" style={{ display: 'grid', gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => (isActive ? 'navlink active' : 'navlink')}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 10, textDecoration: 'none', color: 'var(--text)',
                background: isActive ? 'var(--surface-2)' : 'transparent',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                fontWeight: isActive ? 700 : 500,
              })}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>🔥 Streak {streak}d · ⭐ {totalXp} XP</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{rankFor(totalXp).rank.emoji} {rankFor(totalXp).rank.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>{user ? `Online: ${user.email}` : 'Offline mode'}</div>
          {user && <button className="btn btn-ghost" style={{ marginTop: 8, padding: '4px 10px', fontSize: '0.8rem' }} onClick={signOut}><LogOut size={14} /> Sign out</button>}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{
          display: 'flex', gap: 10, alignItems: 'center', padding: '12px 20px',
          borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button className="btn btn-ghost hamburger" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav}>☰</button>
          <div style={{ position: 'relative', flex: 1, maxWidth: 560 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--muted)' }} />
            <input
              className="input" style={{ paddingLeft: 34 }} placeholder="Search subjects, topics, quizzes, games…"
              value={q} onChange={(e) => setQ(e.target.value)} aria-label="Global search"
              onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }}
            />
            {results && (
              <div className="card" style={{ position: 'absolute', top: 46, left: 0, right: 0, maxHeight: 380, overflowY: 'auto', zIndex: 20, padding: 8 }}>
                {results.length === 0 && <p style={{ color: 'var(--muted)', padding: 8 }}>No results for “{q}”.</p>}
                {results.map((r) => (
                  <button
                    key={r.key} onClick={() => { navigate(r.to); setQ(''); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text)', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    <span className="badge" style={{ marginRight: 8 }}>{r.kind}</span>{r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-ghost" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle light/dark theme">
            {store.profile.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {mobileNav && (
          <nav aria-label="Mobile navigation" className="mobile-nav" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 12, borderBottom: '1px solid var(--border)' }}>
            {NAV.map(({ to, label }) => (
              <NavLink key={to} to={to} onClick={() => setMobileNav(false)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text)', fontSize: '0.85rem' }}>
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <main id="main" style={{ padding: '22px clamp(14px, 4vw, 36px)', maxWidth: 1100, margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 901px) { .hamburger, .mobile-nav { display: none !important; } }
        @media (max-width: 900px) { .sidebar { display: none; } }
      `}</style>
    </div>
  );
}

interface Hit { key: string; kind: string; label: string; to: string; }

function searchAll(term: string): Hit[] {
  const t = term.toLowerCase();
  const hits: Hit[] = [];
  for (const s of SUBJECTS) {
    if (s.name.toLowerCase().includes(t)) hits.push({ key: `s-${s.id}`, kind: 'Subject', label: s.name, to: `/subjects/${s.id}` });
  }
  for (const topic of TOPICS) {
    if (topic.title.toLowerCase().includes(t) || topic.subtopics.some((x) => x.toLowerCase().includes(t))) {
      hits.push({ key: `t-${topic.id}`, kind: 'Topic', label: `${topic.title} (Y${topic.year})`, to: `/curriculum?topic=${topic.id}` });
    }
    if (hits.length > 30) break;
  }
  for (const q of QUESTIONS) {
    if (q.question.toLowerCase().includes(t)) {
      hits.push({ key: `q-${q.id}`, kind: 'Quiz', label: q.question.slice(0, 70), to: `/quizzes?subject=${q.subject}` });
    }
    if (hits.length > 45) break;
  }
  const games = ['quickfire', 'match-up', 'memory-match', 'topic-boss', 'word-scramble', 'exam-rush'];
  for (const g of games) {
    if (g.includes(t.replace(/\s/g, '-'))) hits.push({ key: `g-${g}`, kind: 'Game', label: g, to: `/games/${g}` });
  }
  return hits.slice(0, 45);
}
