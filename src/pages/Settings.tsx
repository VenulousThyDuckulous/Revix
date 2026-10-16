import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { SUBJECTS } from '../lib/content';
import { Card, PageHeader } from '../components/ui';

export default function Settings() {
  const { store, updateProfile, exportData, importData, resetLocal } = useStore();
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const p = store.profile;

  const toggleSubject = (id: string) => {
    const has = p.subjects.includes(id);
    updateProfile({ subjects: has ? p.subjects.filter((s) => s !== id) : [...p.subjects, id] });
  };

  return (
    <div>
      <PageHeader title="Settings" sub="Every setting here works — nothing decorative." />
      <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Appearance</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label>Theme
              <select className="select" value={p.theme} onChange={(e) => updateProfile({ theme: e.target.value as never })}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={p.reducedMotion} onChange={(e) => updateProfile({ reducedMotion: e.target.checked })} /> Reduce motion
            </label>
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Study</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <label>Daily goal
              <select className="select" value={p.dailyGoalMin} onChange={(e) => updateProfile({ dailyGoalMin: Number(e.target.value) })}>
                {[10, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min/day</option>)}
              </select>
            </label>
            <label>School year
              <select className="select" value={p.year ?? ''} onChange={(e) => updateProfile({ year: e.target.value ? Number(e.target.value) as 10 | 11 : null })}>
                <option value="">Not set</option>
                <option value="10">Year 10</option>
                <option value="11">Year 11</option>
              </select>
            </label>
            <label>Maths tier
              <select className="select" value={p.mathsTier} onChange={(e) => updateProfile({ mathsTier: e.target.value as never })}>
                <option value="unknown">Unknown</option>
                <option value="foundation">Foundation</option>
                <option value="higher">Higher</option>
              </select>
            </label>
            <div>Subjects ({p.subjects.length})
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {SUBJECTS.map((s) => (
                  <button key={s.id} className={p.subjects.includes(s.id) ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => toggleSubject(s.id)} aria-pressed={p.subjects.includes(s.id)}>{s.name}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Data (local-only unless signed in)</h3>
          <p style={{ color: 'var(--muted)' }}>Progress, notes, decks and settings live in this browser. Online sync covers profiles + validated league activity only.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => {
              navigator.clipboard?.writeText(exportData()).catch(() => setMsg('Clipboard blocked — copy from the preview below.'));
              setMsg('Export copied to clipboard.');
            }}>Export (copy JSON)</button>
            <Link to="/profile" className="btn btn-ghost">Account settings</Link>
            {!confirmReset
              ? <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>Reset local progress…</button>
              : <>
                <button className="btn btn-danger" onClick={() => { resetLocal(); setConfirmReset(false); setMsg('Local data cleared.'); }}>Confirm reset</button>
                <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              </>}
          </div>
          <details style={{ marginTop: 10 }}>
            <summary>Import / view export</summary>
            <textarea className="textarea" rows={4} placeholder="Paste a Revix export here, then Import." value={importText} onChange={(e) => setImportText(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn btn-ghost" onClick={() => {
                const r = importData(importText);
                setMsg(r.ok ? 'Import successful.' : `Import failed: ${r.error}`);
              }}>Import</button>
              <button className="btn btn-ghost" onClick={() => setImportText(exportData())}>Show my export</button>
            </div>
          </details>
          {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
        </Card>
      </div>
    </div>
  );
}
