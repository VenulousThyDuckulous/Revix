import { SUBJECTS, TOPICS } from '../lib/content';
import { ELO_START, eloTier, rankFor } from '../lib/ranks';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { ActionButton, Badge, Card, PageHeader, ProgressBar } from '../components/ui';

const AVATARS = ['🚀', '🎓', '🦊', '⚡', '🧠', '🦉', '🐙', '🐉'];

export default function Profile() {
  const { user, profile, configured } = useAuth();
  const { store, totalXp, setProfile } = useStore();

  const rank = rankFor(totalXp);
  const elo = profile?.elo ?? ELO_START;
  const tier = eloTier(elo);
  const mastered = Object.values(store.topicProgress).filter((p) => p.status === 'mastered').length;
  const quizzes = store.activities.filter((a) => a.kind === 'topic').length;
  const matches = store.activities.filter((a) => a.kind === 'match').length;
  const name = store.profile.displayName || profile?.displayName || 'revixer';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile" sub={configured ? (user?.email ?? 'Guest on this device') : 'Guest on this device'} />

      <Card>
        <div className="flex items-center gap-4">
          <div
            className="grid h-16 w-16 place-items-center rounded-2xl border-4 bg-white text-3xl"
            style={{ borderColor: rank.rank.color }}
          >
            {store.profile.avatar}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-black">{name}</div>
            <div className="text-sm font-bold" style={{ color: rank.rank.color }}>
              {rank.rank.emoji} {rank.rank.name} · {totalXp.toLocaleString()} XP
            </div>
            <div className="text-xs font-bold text-duo-muted">{store.profile.year ? `Year ${store.profile.year}` : 'Year not set'}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-black text-duo-blue">{elo}</div>
            <div className="text-xs font-black" style={{ color: tier.color }}>
              {tier.emoji} {tier.name}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-black text-duo-muted">
            <span>{rank.next ? `Next: ${rank.next.name}` : 'Max rank'}</span>
            <span>{rank.next ? `${rank.xpNeeded} XP to go` : 'Complete!'}</span>
          </div>
          <ProgressBar pct={rank.progress} />
        </div>
      </Card>

      {/* Avatar picker */}
      <Card className="mt-4">
        <h3 className="mb-3 text-sm font-black tracking-wide uppercase text-duo-muted">Avatar</h3>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setProfile({ avatar: a })}
              className={`grid h-11 w-11 place-items-center rounded-xl border-2 text-xl ${store.profile.avatar === a ? 'border-duo-blue bg-duo-blue/10' : 'border-duo-line'}`}
              aria-pressed={store.profile.avatar === a}
            >
              {a}
            </button>
          ))}
        </div>
      </Card>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="text-center">
          <div className="text-2xl font-black text-duo-green">{mastered}</div>
          <div className="text-xs font-black text-duo-muted">Topics mastered</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-duo-blue">{quizzes}</div>
          <div className="text-xs font-black text-duo-muted">Lessons done</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-duo-orange">{matches}</div>
          <div className="text-xs font-black text-duo-muted">Matches</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-black text-duo-red">🔥 {store.streak}</div>
          <div className="text-xs font-black text-duo-muted">Day streak</div>
        </Card>
      </div>

      {/* Subjects */}
      <Card className="mt-4">
        <h3 className="mb-3 text-sm font-black tracking-wide uppercase text-duo-muted">My subjects</h3>
        <div className="flex flex-wrap gap-2">
          {store.profile.subjects.length === 0 && (
            <span className="text-sm font-bold text-duo-muted">None chosen yet.</span>
          )}
          {store.profile.subjects.map((id) => {
            const s = SUBJECTS.find((x) => x.id === id);
            return s ? (
              <Badge key={id} style={{ color: s.color, borderColor: s.color }}>
                {s.name}
              </Badge>
            ) : null;
          })}
        </div>
        <p className="mt-2 text-xs font-bold text-duo-muted">
          Curriculum covers {TOPICS.length} topics. Re-run onboarding from Settings to change these.
        </p>
      </Card>

      {/* Account state */}
      <Card className="mt-4">
        <h3 className="font-black">Account</h3>
        {!configured && (
          <p className="mt-1 text-sm font-bold text-duo-muted">
            Firebase isn't configured in this build — progress lives only on this device.
          </p>
        )}
        {configured && !user && (
          <p className="mt-1 text-sm font-bold text-duo-muted">
            Guest mode — progress lives only on this device and isn't backed up.
          </p>
        )}
        {configured && user && (
          <p className="mt-1 text-sm font-bold text-duo-muted">
            Signed in as <span className="text-duo-ink">{user.email}</span>
            {user.providerId === 'anonymous' && ' (anonymous account — add an email later to keep it)'}.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton variant={configured && user ? 'ghost' : 'primary'} to={configured && user ? '/settings' : '/'}>
            {configured && user ? 'Settings' : 'Create an account'}
          </ActionButton>
        </div>
      </Card>
    </div>
  );
}
