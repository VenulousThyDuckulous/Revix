import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../lib/content';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { ActionButton, Card } from '../components/ui';
import type { Year } from '../lib/types';

const AVATARS = ['🚀', '🎓', '🦊', '⚡', '🧠', '🦉', '🐙', '🐉'];

export default function Onboarding() {
  const { setProfile, store } = useStore();
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(store.profile.displayName || user?.displayName || '');
  const [avatar, setAvatar] = useState(store.profile.avatar || '🚀');
  const [year, setYear] = useState<Year | null>(store.profile.year);
  const [subjects, setSubjects] = useState<string[]>(store.profile.subjects);

  function toggleSubject(id: string) {
    setSubjects((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function finish() {
    setProfile({
      displayName: name.trim() || 'revixer',
      avatar,
      year,
      subjects,
      onboarded: true,
    });
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-duo-green text-white shadow-duo-green">🎮</span>
        <span className="text-xl font-black text-duo-green">Revix</span>
        <span className="ml-auto text-sm font-black text-duo-muted">Step {step + 1} of 3</span>
      </div>

      <div className="mb-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? 'bg-duo-green' : 'bg-duo-line'}`} />
        ))}
      </div>

      {step === 0 && (
        <Card>
          <h1 className="text-2xl font-black">What should we call you?</h1>
          <p className="mt-1 text-sm font-bold text-duo-muted">
            This is the name other players see in matches.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={`grid h-12 w-12 place-items-center rounded-xl border-2 text-2xl ${avatar === a ? 'border-duo-blue bg-duo-blue/10' : 'border-duo-line'}`}
                aria-pressed={avatar === a}
              >
                {a}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm font-black text-duo-muted">
            Display name
            <input
              className="input mt-1"
              value={name}
              maxLength={24}
              placeholder="revixer"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="mt-5">
            <ActionButton onClick={() => setStep(1)} full>
              Continue
            </ActionButton>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h1 className="text-2xl font-black">Which year are you in?</h1>
          <p className="mt-1 text-sm font-bold text-duo-muted">We order your lessons around this.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([10, 11] as Year[]).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded-2xl border-2 p-6 text-center font-black ${year === y ? 'border-duo-green bg-duo-green/10 text-duo-green-dark' : 'border-duo-line'}`}
                aria-pressed={year === y}
              >
                <div className="text-3xl">📅</div>
                <div className="mt-2">Year {y}</div>
                <div className="text-xs font-bold text-duo-muted">
                  {y === 10 ? 'Starting out' : 'Exam year'}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <ActionButton variant="ghost" onClick={() => setStep(0)}>
              Back
            </ActionButton>
            <ActionButton onClick={() => setStep(2)} disabled={!year} full>
              Continue
            </ActionButton>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h1 className="text-2xl font-black">Pick your subjects</h1>
          <p className="mt-1 text-sm font-bold text-duo-muted">
            Choose at least one — you can change these later in Settings.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSubject(s.id)}
                className={`rounded-xl border-2 px-3 py-3 text-sm font-black ${subjects.includes(s.id) ? 'border-duo-green bg-duo-green/10 text-duo-green-dark' : 'border-duo-line text-duo-muted'}`}
                aria-pressed={subjects.includes(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-duo-muted">
            {configured && user
              ? 'Your profile syncs to your account.'
              : 'Playing as guest — progress is stored on this device only.'}
          </p>
          <div className="mt-5 flex gap-2">
            <ActionButton variant="ghost" onClick={() => setStep(1)}>
              Back
            </ActionButton>
            <ActionButton onClick={finish} disabled={subjects.length === 0} full>
              Start revising
            </ActionButton>
          </div>
        </Card>
      )}
    </div>
  );
}
