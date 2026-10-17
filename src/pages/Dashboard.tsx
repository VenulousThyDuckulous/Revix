import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { QUESTIONS, SUBJECTS, TOPICS, subjectById } from '../lib/content';
import { Card, Empty, PageHeader, ProgressBar, Stat } from '../components/ui';
import { rankFor } from '../lib/ranks';
import { useAuth } from '../lib/auth';

export default function Dashboard() {
  const { store, totalXp, streak, accuracy, quizzesTaken } = useStore();
  const { user, configured } = useAuth();
  const p = store.profile;

  const firstUse = store.activities.length === 0;
  const mastered = Object.entries(store.topicProgress).filter(([, v]) => v.status === 'mastered').length;
  const learning = Object.entries(store.topicProgress).filter(([, v]) => v.status === 'learning').length;

  const mySubjects = SUBJECTS.filter((s) => p.subjects.includes(s.id));

  // weak topics: attempted activities with <60% accuracy grouped by topic/subject
  const weak = weakTopics();
  const recent = store.activities.slice(0, 6);
  const myRank = rankFor(totalXp);

  const goalXp = p.dailyGoalMin * 5;
  const todayXp = store.activities
    .filter((a) => new Date(a.at).toDateString() === new Date().toDateString())
    .reduce((s, a) => s + a.xp, 0);

  const name = p.displayName || (user?.email?.split('@')[0]) || 'Revixer';
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  function weakTopics() {
    const by = new Map<string, { c: number; t: number }>();
    for (const a of store.activities) {
      if (!a.total) continue;
      const key = a.topicId ?? a.subjectId ?? 'general';
      const cur = by.get(key) ?? { c: 0, t: 0 };
      cur.c += a.correct;
      cur.t += a.total;
      by.set(key, cur);
    }
    return [...by.entries()]
      .filter(([, v]) => v.t >= 3 && v.c / v.t < 0.6)
      .sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t)
      .slice(0, 4)
      .map(([key, v]) => {
        const topic = TOPICS.find((t) => t.id === key);
        const subj = topic ? subjectById(topic.subject) : subjectById(key);
        return { key, label: topic ? topic.title : (subj?.name ?? key), to: topic ? `/curriculum?topic=${topic.id}` : subj ? `/subjects/${subj.id}` : '/quizzes', acc: v.c / v.t };
      });
  }

  const recommendation = weak[0]
    ? { label: `Revisit ${weak[0].label}`, to: weak[0].to }
    : mySubjects[0]
      ? { label: `Revise ${mySubjects[0].name}`, to: `/subjects/${mySubjects[0].id}` }
      : { label: 'Choose your subjects', to: '/onboarding' };

  return (
    <div>
      <PageHeader
        title={`${greet}, ${name}! ${p.avatar || ''}`}
        sub={p.year ? `Year ${p.year} · ${mySubjects.length} subjects · ${streak}-day streak` : 'Set up your year and subjects to personalise Revix.'}
        actions={!p.onboarded ? <Link to="/onboarding" className="btn btn-primary">Get started</Link> : undefined}
      />

      {firstUse && (
        <Empty
          title="Welcome to Revix!"
          body="Nothing revised yet — your stats, streaks and achievements will appear here once you start. Try a quick quiz or pick your subjects."
          action={<div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/quizzes" className="btn btn-primary">Take a quiz</Link>
            <Link to="/onboarding" className="btn btn-ghost">Set up profile</Link>
          </div>}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '16px 0' }}>
        <Stat label="Total XP" value={String(totalXp)} />
        <Stat label="Rank" value={`${myRank.rank.emoji} ${myRank.rank.name}`} sub={myRank.next ? `${myRank.xpNeeded} XP to ${myRank.next.name}` : 'Max rank!'} />
        <Stat label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        <Stat label="Quiz accuracy" value={quizzesTaken ? `${Math.round(accuracy * 100)}%` : '—'} sub={quizzesTaken ? `${quizzesTaken} quizzes` : 'No quizzes yet'} />
        <Stat label="Topics mastered" value={String(mastered)} sub={`${learning} learning`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>🎯 Daily goal</h3>
          <p style={{ color: 'var(--muted)' }}>{todayXp} / {goalXp} XP ({p.dailyGoalMin} min/day)</p>
          <ProgressBar pct={goalXp ? Math.min(1, todayXp / goalXp) : 0} />
          <p style={{ marginBottom: 0 }}>⭐ <strong>Recommended next:</strong> <Link to={recommendation.to}>{recommendation.label}</Link></p>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>{myRank.rank.emoji} Rank: {myRank.rank.name}</h3>
          {myRank.next ? (
            <>
              <ProgressBar pct={myRank.progress} />
              <p style={{ color: 'var(--muted)' }}>{myRank.xpNeeded} XP to {myRank.next.emoji} {myRank.next.name}. <Link to="/ranks">View all ranks</Link></p>
            </>
          ) : (
            <p style={{ color: 'var(--muted)' }}>Max rank reached — legendary!</p>
          )}
          {!user && (
            <p style={{ color: 'var(--muted)' }}>
              {configured
                ? <>Offline progress only. <Link to="/profile">Sign in</Link> to appear on the online ranks.</>
                : <>Offline progress only. Online ranks need Firebase setup (see docs/firebase-setup.md).</>}
            </p>
          )}
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>⚠️ Weak topics</h3>
          {weak.length === 0
            ? <p style={{ color: 'var(--muted)' }}>No weak spots detected yet — keep quizzing and they will show up here.</p>
            : <ul style={{ margin: 0, paddingLeft: 18 }}>
              {weak.map((w) => <li key={w.key}><Link to={w.to}>{w.label}</Link> — {Math.round(w.acc * 100)}%</li>)}
            </ul>}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>📚 My subjects</h3>
          {mySubjects.length === 0
            ? <p style={{ color: 'var(--muted)' }}>No subjects selected. <Link to="/onboarding">Choose subjects</Link></p>
            : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mySubjects.map((s) => <Link key={s.id} to={`/subjects/${s.id}`} className="badge" style={{ textDecoration: 'none', color: 'var(--text)' }}>{s.name}</Link>)}
            </div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Link to="/quizzes" className="btn btn-ghost">Quizzes</Link>
            <Link to="/flashcards" className="btn btn-ghost">Flashcards</Link>
            <Link to="/games" className="btn btn-ghost">Games</Link>
            <Link to="/exam" className="btn btn-ghost">Exam practice</Link>
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>🕘 Recent activity</h3>
          {recent.length === 0
            ? <p style={{ color: 'var(--muted)' }}>No activity yet.</p>
            : <ul style={{ margin: 0, paddingLeft: 18 }}>
              {recent.map((a) => (
                <li key={a.id} style={{ fontSize: '0.9rem' }}>
                  {a.kind} · {a.detail || a.subjectId} · +{a.xp} XP {a.total ? `(${a.correct}/${a.total})` : ''} · {new Date(a.at).toLocaleDateString()}
                </li>
              ))}
            </ul>}
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{QUESTIONS.length} practice questions across {SUBJECTS.length} subjects.</p>
        </Card>
      </div>
    </div>
  );
}
