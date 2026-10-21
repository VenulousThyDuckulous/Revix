import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { leaveGuestMode } from '../App';
import { ActionButton, Card, PageHeader } from '../components/ui';
import { SUBJECTS } from '../lib/content';
import type { Year } from '../lib/types';

export default function Settings() {
  const { configured, user, signOut } = useAuth();
  const { store, setProfile, setSettings, resetAll } = useStore();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  function exit() {
    leaveGuestMode();
    void signOut();
    navigate('/', { replace: true });
  }

  function toggleSubject(id: string) {
    const has = store.profile.subjects.includes(id);
    setProfile({ subjects: has ? store.profile.subjects.filter((s) => s !== id) : [...store.profile.subjects, id] });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" />

      {/* Profile */}
      <Card>
        <h3 className="mb-3 text-sm font-black tracking-wide uppercase text-duo-muted">Profile</h3>
        <label className="block text-sm font-black text-duo-muted">
          Display name
          <input
            className="input mt-1"
            maxLength={24}
            value={store.profile.displayName}
            placeholder="revixer"
            onChange={(e) => setProfile({ displayName: e.target.value })}
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-black text-duo-muted">
            Year group
            <select
              className="input mt-1"
              value={store.profile.year ?? ''}
              onChange={(e) => setProfile({ year: e.target.value ? (Number(e.target.value) as Year) : null })}
            >
              <option value="">Not set</option>
              <option value={10}>Year 10</option>
              <option value={11}>Year 11</option>
            </select>
          </label>
          <label className="text-sm font-black text-duo-muted">
            Daily goal (minutes)
            <select
              className="input mt-1"
              value={store.settings.dailyGoal}
              onChange={(e) => setSettings({ dailyGoal: Number(e.target.value) })}
            >
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>
        </div>
      </Card>

      {/* Subjects */}
      <Card className="mt-4">
        <h3 className="mb-3 text-sm font-black tracking-wide uppercase text-duo-muted">Subjects</h3>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => {
            const on = store.profile.subjects.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSubject(s.id)}
                aria-pressed={on}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-black ${
                  on ? 'border-duo-green bg-duo-green/10 text-duo-green-dark' : 'border-duo-line text-duo-muted'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Preferences */}
      <Card className="mt-4">
        <h3 className="mb-3 text-sm font-black tracking-wide uppercase text-duo-muted">Preferences</h3>
        <label className="flex items-center justify-between gap-3 py-2 text-sm font-black">
          Sound effects
          <input
            type="checkbox"
            checked={store.settings.sound}
            onChange={(e) => setSettings({ sound: e.target.checked })}
            className="h-5 w-5 accent-[#58cc02]"
          />
        </label>
        <label className="flex items-center justify-between gap-3 border-t-2 border-duo-line py-2 text-sm font-black">
          Reduce motion
          <input
            type="checkbox"
            checked={store.settings.reduceMotion}
            onChange={(e) => setSettings({ reduceMotion: e.target.checked })}
            className="h-5 w-5 accent-[#58cc02]"
          />
        </label>
      </Card>

      {/* Account */}
      <Card className="mt-4">
        <h3 className="font-black">Account</h3>
        <p className="mt-1 text-sm font-bold text-duo-muted">
          {configured && user
            ? `Signed in as ${user.email}${user.providerId === 'anonymous' ? ' (anonymous)' : ''}.`
            : configured
              ? 'Guest mode — not signed in.'
              : 'Firebase is not configured in this build; everything stays on this device.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton variant="ghost" onClick={exit}>
            Sign out / leave guest
          </ActionButton>
          <ActionButton variant="secondary" to="/">
            {configured && user ? 'Account page' : 'Create account'}
          </ActionButton>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="mt-4" style={{ borderColor: '#ff4b4b' }}>
        <h3 className="font-black text-duo-red">Reset progress</h3>
        <p className="mt-1 text-sm font-bold text-duo-muted">
          Clears XP, streak, lesson progress and activities on this device. Online profile data is not
          affected.
        </p>
        <div className="mt-3">
          {!confirmReset ? (
            <ActionButton variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
              <Trash2 size={14} /> Reset…
            </ActionButton>
          ) : (
            <div className="flex gap-2">
              <ActionButton
                variant="danger"
                size="sm"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
              >
                Yes, reset everything
              </ActionButton>
              <ActionButton variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Cancel
              </ActionButton>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
