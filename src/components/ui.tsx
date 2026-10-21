import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Card({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={`card ${className ?? ''}`} style={style}>
      {children}
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        {sub && <p className="mt-1 text-sm font-bold text-duo-muted">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function ProgressBar({ pct, tone = 'green' }: { pct: number; tone?: 'green' | 'blue' | 'yellow' }) {
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill ${tone === 'green' ? '' : tone}`} style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

export function Badge({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="badge" style={style}>
      {children}
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="text-center">
      <div className="mb-2 text-4xl">🔍</div>
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm font-bold text-duo-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1 text-sm font-black uppercase tracking-wide text-duo-blue hover:underline"
    >
      <ArrowLeft size={16} /> {label}
    </Link>
  );
}

/** Call-to-action button rendered as either a router Link or a <button>. */
export function ActionButton({
  to,
  onClick,
  children,
  variant = 'primary',
  size,
  disabled,
  type = 'button',
  full,
}: {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'warn';
  size?: 'sm' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
  full?: boolean;
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    full ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (to && !disabled) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
