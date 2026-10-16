import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AVATARS, useStore } from '../lib/store';
import { SUBJECTS } from '../lib/content';
import { Card, PageHeader } from '../components/ui';
import type { Year } from '../lib/types';

export default function Onboarding() {
  const { store, updateProfile } = useStore();
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const p = store.profile;

  const toggleSubject = (id: string) => {
    const has = p.subjects.includes(id);
    updateProfile({ subjects: has ? p.subjects.filter((s) => s !== id) : [...p.subjects, id] });
  };

  const finish = (skip = false) => {
    updateProfile({ onboarded: true });
    if (!skip) void 0;
    nav('/');
  };

  const steps = ['Year', 'Subjects', 'Details', 'Goals & theme'];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Welcome to Revix" sub={`Step ${step + 1} of ${steps.length}: ${steps[step]} — you can skip anything and change it later in Settings.`} />
      <div className="progress-track" style={{ height: 8, marginBottom: 18 }}>
        <div className="progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      {step === 0 && (
        <Card>
          <h3>Which year are you in?</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {([10, 11] as Year[]).map((y) => (
              <button key={y} className={p.year === y ? 'btn btn-primary' : 'btn btn-ghost'}
                onClick={() => updateProfile({ year: y })} aria-pressed={p.year === y}>Year {y}</button>
            ))}
          </div>
          <p style={{ color: 'var(--muted)' }}>No account needed — local-only progress stays on this browser/device and won't sync elsewhere.</p>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h3>Which subjects do you study?</h3>
          <p style={{ color: 'var(--muted)' }}>Pick only your actual subjects — {p.subjects.length} selected.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUBJECTS.map((s) => (
              <button key={s.id} className={p.subjects.includes(s.id) ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                onClick={() => toggleSubject(s.id)} aria-pressed={p.subjects.includes(s.id)}>{s.name}</button>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h3>Details (all optional)</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <label>Maths tier
              <select className="select" value={p.mathsTier} onChange={(e) => updateProfile({ mathsTier: e.target.value as never })}>
                <option value="unknown">Not sure / prefer not to say</option>
                <option value="foundation">Foundation</option>
                <option value="higher">Higher</option>
              </select>
            </label>
            <label>Science route
              <select className="select" value={p.scienceRoute} onChange={(e) => updateProfile({ scienceRoute: e.target.value as never })}>
                <option value="unknown">Not sure</option>
                <option value="combined">Combined Science</option>
                <option value="triple">Triple (Biology/Chemistry/Physics)</option>
              </select>
            </label>
            <label>Exam board (if known)
              <input className="input" value={p.examBoard} placeholder="e.g. AQA, Edexcel, OCR"
                onChange={(e) => updateProfile({ examBoard: e.target.value })} />
            </label>
            <label>Display name (for future online profiles)
              <input className="input" value={p.displayName} placeholder="Pick a display name"
                onChange={(e) => updateProfile({ displayName: e.target.value.slice(0, 24) })} />
            </label>
            <div>Avatar
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {AVATARS.map((a) => (
                  <button key={a} className={p.avatar === a ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ fontSize: '1.3rem', padding: '4px 10px' }} onClick={() => updateProfile({ avatar: a })}
                    aria-pressed={p.avatar === a} aria-label={`Avatar ${a}`}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h3>Goal & theme</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <label>Daily revision goal (minutes)
              <select className="select" value={p.dailyGoalMin} onChange={(e) => updateProfile({ dailyGoalMin: Number(e.target.value) })}>
                {[10, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min/day</option>)}
              </select>
            </label>
            <label>Theme
              <select className="select" value={p.theme} onChange={(e) => updateProfile({ theme: e.target.value as never })}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Back</button>}
        {step < steps.length - 1
          ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Continue →</button>
          : <button className="btn btn-primary" onClick={() => finish()}>Finish → Dashboard</button>}
        <button className="btn btn-ghost" onClick={() => finish(true)}>Skip for now</button>
        <Link to="/" className="btn btn-ghost">Cancel</Link>
      </div>
    </div>
  );
}
