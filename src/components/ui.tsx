import { Link } from 'react-router-dom';
import { verificationLabel } from '../lib/content';
import type { Topic } from '../lib/types';

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#140f2e" stroke="#7c3aed" strokeWidth="2" />
        <path d="M18 14h14a12 12 0 0 1 0 24H26l12 12-6 0-11-11v11H18z" fill="#a78bfa" />
        <circle cx="46" cy="46" r="5" fill="#22d3ee" />
      </svg>
      <span style={{ fontWeight: 800, fontSize: size * 0.55, letterSpacing: 0.5 }}>
        Revix
      </span>
    </span>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
      <div>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>{title}</h1>
        {sub && <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={{ padding: 18, ...style }}>{children}</div>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Card style={{ textAlign: 'center', padding: '34px 20px' }}>
      <div style={{ fontSize: '2rem' }}>📭</div>
      <h3 style={{ margin: '10px 0 6px' }}>{title}</h3>
      <p style={{ color: 'var(--muted)', margin: '0 0 14px' }}>{body}</p>
      {action}
    </Card>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{sub}</div>}
    </Card>
  );
}

export function VerifyBadge({ topic }: { topic: Topic }) {
  const color = topic.verification === 'user' ? 'var(--accent-2)'
    : topic.verification === 'supplementary' ? 'var(--warn)'
    : topic.verification === 'unavailable' ? 'var(--bad)' : 'var(--good)';
  return (
    <span className="badge" title={topic.url ?? 'No source document linked'}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: color, display: 'inline-block' }} />
      {verificationLabel(topic)}
    </span>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} style={{ height: 10 }}>
      <div className="progress-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
    </div>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="btn btn-ghost" style={{ marginBottom: 14, textDecoration: 'none' }}>← {label}</Link>;
}
