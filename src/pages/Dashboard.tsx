import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Lock, Play, Swords } from 'lucide-react';
import { SUBJECTS, topicsForSubject, subjectById } from '../lib/content';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { ActionButton, Badge, Card, ProgressBar } from '../components/ui';
import { rankFor } from '../lib/ranks';

export default function Dashboard() {
  const { store, totalXp } = useStore();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const chosen = store.profile.subjects;
  const [active, setActive] = useState(chosen[0] ?? SUBJECTS[0].id);

  const orderedSubjects = useMemo(() => {
    const mine = SUBJECTS.filter((s) => chosen.includes(s.id));
    const rest = SUBJECTS.filter((s) => !chosen.includes(s.id));
    return [...mine, ...rest];
  }, [chosen]);

  const topics = useMemo(() => topicsForSubject(active), [active]);
  const subject = subjectById(active);
  const rank = rankFor(totalXp);

  const masteredCount = topics.filter((t) => store.topicProgress[t.id]?.status === 'mastered').length;

  const name = store.profile.displayName || profile?.displayName || 'revixer';

  return (
    <div>
      {/* Greeting + CTA */}
      <section className="mb-6 rounded-3xl border-2 border-duo-line bg-duo-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">
              {store.profile.avatar} Hey {name}!
            </h1>
            <p className="mt-1 text-sm font-bold text-duo-muted">
              {rank.next
                ? `${rank.xpNeeded} XP to ${rank.next.name}`
                : 'Max rank reached — legendary.'}
            </p>
            <div className="mt-2 w-56">
              <ProgressBar pct={rank.progress} />
            </div>
          </div>
          <ActionButton variant="secondary" size="lg" to="/play">
            <Swords size={20} /> Play multiplayer
          </ActionButton>
        </div>
      </section>

      {/* Subject tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {orderedSubjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-black transition-colors ${
              active === s.id
                ? 'border-duo-green bg-duo-green text-white'
                : 'border-duo-line text-duo-muted hover:bg-duo-soft'
            }`}
            aria-pressed={active === s.id}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Path header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black" style={{ color: subject?.color }}>
            {subject?.name} path
          </h2>
          <p className="text-sm font-bold text-duo-muted">
            {masteredCount} of {topics.length} lessons mastered
          </p>
        </div>
        <Badge>
          {subject?.years.map((y) => `Year ${y}`).join(' · ')}
        </Badge>
      </div>

      {/* Learning path */}
      <Card>
        {topics.length === 0 ? (
          <p className="text-sm font-bold text-duo-muted">
            No lessons for this subject yet — content is documented in docs/curriculum-audit.md.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {topics.map((t, i) => {
              const prog = store.topicProgress[t.id];
              const mastered = prog?.status === 'mastered';
              const prevMastered =
                i === 0 || store.topicProgress[topics[i - 1].id]?.status === 'mastered';
              const playable = mastered || prevMastered;
              const isNext = !mastered && prevMastered && topics.slice(0, i).every((p) => store.topicProgress[p.id]?.status === 'mastered');

              const cls = mastered
                ? 'topic-node mastered'
                : playable
                  ? 'topic-node playable'
                  : 'topic-node';

              const inner = (
                <>
                  <span className="relative grid h-full w-full place-items-center">
                    {mastered ? <Crown size={26} /> : playable ? <Play size={26} fill="currentColor" /> : <Lock size={22} />}
                    {isNext && (
                      <span className="absolute -top-7 rounded-full bg-duo-blue px-2 py-0.5 text-[10px] font-black whitespace-nowrap text-white">
                        START
                      </span>
                    )}
                  </span>
                </>
              );

              return (
                <li key={t.id} className={`flex items-center gap-3 ${i % 2 === 1 ? 'sm:pl-16' : ''}`}>
                  {playable ? (
                    <button
                      type="button"
                      className={`${cls} h-16 w-16 shrink-0`}
                      onClick={() => navigate(`/lesson/${t.id}`)}
                      aria-label={`${mastered ? 'Review' : 'Start'} lesson: ${t.title}`}
                    >
                      {inner}
                    </button>
                  ) : (
                    <span className={`${cls} h-16 w-16 shrink-0`} aria-label={`Locked: ${t.title}`}>
                      {inner}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-black">{t.title}</div>
                    <div className="text-xs font-bold text-duo-muted">
                      Year {t.year} · {t.subtopics.length} subtopics
                      {mastered && ' · mastered'}
                      {!playable && ' · finish the lesson above first'}
                    </div>
                  </div>
                  {prog && prog.attempts > 0 && (
                    <Badge style={{ marginLeft: 'auto' }}>best {prog.bestScore}%</Badge>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {/* Multiplayer teaser */}
      <Card className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black">Think you're ready?</h3>
          <p className="text-sm font-bold text-duo-muted">
            Duel a classmate, survive a Battle Royale or sprint for 60 seconds.
          </p>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="secondary" to="/play">
            <Swords size={16} /> Play
          </ActionButton>
          <ActionButton variant="ghost" to="/ranks">
            Ranks
          </ActionButton>
        </div>
      </Card>

      {!user && (
        <p className="mt-4 text-center text-xs font-bold text-duo-muted">
          Guest mode — progress stays on this device.{' '}
          <Link to="/settings" className="text-duo-blue hover:underline">
            Sign in to save it to an account
          </Link>
          .
        </p>
      )}
    </div>
  );
}
