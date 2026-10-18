import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QUESTIONS, TOPICS, subjectById, notesForTopic } from '../lib/content';
import { selectQuestions } from '../lib/quiz';
import { useStore } from '../lib/store';
import { BackLink, Card, Empty, PageHeader, ProgressBar } from '../components/ui';
import { rankFor } from '../lib/ranks';
import { Play } from 'lucide-react';

export default function Lesson() {
  const { topicId: rawTopicId } = useParams<{ topicId?: string }>();
  const topicId = rawTopicId ?? '';
  const { store, setTopicStatus, addActivity } = useStore();
  const navigate = useNavigate();
  const topic = TOPICS.find((t) => t.id === topicId);
  const subj = topic ? subjectById(topic.subject) : null;
  const totalXp = store.activities.reduce((s, a) => s + a.xp, 0);
  const myRank = rankFor(totalXp);

  if (!topic) return <Empty title="Lesson not found" body="That topic doesn't exist." action={<Link to="/dashboard" className="btn btn-primary">Back to Learn</Link>} />;

  const [stage, setStage] = useState<'teach' | 'quiz' | 'done'>('teach');
  const [qIndex, setQIndex] = useState(0);
  const [given, setGiven] = useState<Record<string, unknown>>({});
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const questions = useMemo(() => selectQuestions(
    QUESTIONS, { subject: topic.subject, topic: topic.id, count: 5, shuffleOrder: true }),
    [topic.subject, topic.id]);

  const notes = notesForTopic(topic);
  const prog = store.topicProgress[topicId];
  const alreadyMastered = prog?.status === 'mastered';

  const answerQuestion = (qid: string, val: unknown) => setGiven((g) => ({ ...g, [qid]: val }));

  const checkAnswer = (q: { id: string; type: string; answer: unknown; accept?: unknown[]; tolerance?: number }, val: unknown): boolean => {
    if (q.type === 'mcq') return String(val).toLowerCase() === String(q.answer).toLowerCase();
    if (q.type === 'true_false') return val === q.answer;
    if (q.type === 'numeric') return Math.abs(Number(val) - Number(q.answer)) <= (q.tolerance ?? 0) + 1e-9;
    const c = [q.answer, ...(q.accept ?? [])].flat().map((x) => String(x).trim().toLowerCase());
    return c.includes(String(val).trim().toLowerCase());
  };

  const checkAndNext = () => {
    setRevealed(true);
  };

  const nextQ = () => {
    if (qIndex + 1 >= questions.length) finishLesson();
    else { setQIndex(qIndex + 1); setRevealed(false); }
  };

  const finishLesson = () => {
    const correct = questions.reduce((n, q) => n + (checkAnswer(q, given[q.id]) ? 1 : 0), 0);
    setScore(correct);
    setStage('done');
    setTopicStatus(topicId, 'mastered');
    addActivity({
      kind: 'topic', subjectId: topic.subject, topicId: topic.id,
      detail: `Mastered ${topic.title}`, xp: 25, eventKey: `lesson-${topic.id}`,
    });
  };

  const teachContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 1 · Learn</div>
      <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>{topic.title}</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 12px' }}>{subj?.name} · Year {topic.year}</p>
      <Card style={{ background: '#fff', borderColor: 'var(--border)', padding: 16 }}>
        <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 8 }}>{notes.summary}</div>
        <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '0.85rem', marginTop: 12, marginBottom: 6 }}>Key points</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)' }}>
          {notes.keyPoints.map((k) => <li key={k} style={{ marginBottom: 4 }}>{k}</li>)}
        </ul>
      </Card>
      <Card style={{ background: '#fef3e6', borderColor: '#fde6a3', padding: 16 }}>
        <div style={{ fontWeight: 700, color: '#b45309', fontSize: '0.85rem', marginBottom: 6 }}>⚠️ Common mistakes</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)' }}>
          {notes.mistakes.map((k) => <li key={k} style={{ marginBottom: 4 }}>{k}</li>)}
        </ul>
      </Card>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => setStage('quiz')}>
          <Play size={16} /> Practise — {questions.length} questions
        </button>
        <Link to="/dashboard" className="btn btn-ghost">Back to path</Link>
      </div>
    </div>
  );

  const quizContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 2 · Practise</div>
      <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>{topic.title}</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="badge">Question {qIndex + 1} of {questions.length}</span>
        <div style={{ width: 140 }}><ProgressBar pct={(qIndex + 1) / questions.length} /></div>
      </div>
      <Card style={{ padding: 20 }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 14px' }}>{questions[qIndex].question}</p>
        {questions[qIndex].type === 'mcq' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {questions[qIndex].options!.map((o) => (
              <button
                key={o} className="btn btn-ghost" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                disabled={revealed}
                onClick={() => answerQuestion(questions[qIndex].id, o)}
                aria-pressed={given[questions[qIndex].id] === o}
              >
                {given[questions[qIndex].id] === o ? '● ' : '○ '}{o}
              </button>
            ))}
          </div>
        )}
        {(questions[qIndex].type === 'short' || questions[qIndex].type === 'fill_blank' || questions[qIndex].type === 'numeric') && (
          <input
            className="input" disabled={revealed}
            placeholder={questions[qIndex].type === 'numeric' ? 'Number' : 'Type your answer'}
            value={String(given[questions[qIndex].id] ?? '')}
            onChange={(e) => answerQuestion(questions[qIndex].id, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !revealed) checkAndNext(); }}
          />
        )}
        {questions[qIndex].type === 'true_false' && (
          <div style={{ display: 'flex', gap: 10 }}>
            {['True', 'False'].map((v) => (
              <button key={v} className="btn btn-ghost" disabled={revealed} onClick={() => answerQuestion(questions[qIndex].id, v)} aria-pressed={given[questions[qIndex].id] === v}>
                {given[questions[qIndex].id] === v ? '● ' : '○ '}{v}
              </button>
            ))}
          </div>
        )}
        {revealed && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10,
            background: checkAnswer(questions[qIndex], given[questions[qIndex].id]) ? 'rgba(86, 204, 79, 0.12)' : 'rgba(252, 129, 129, 0.12)',
            border: `1px solid ${checkAnswer(questions[qIndex], given[questions[qIndex].id]) ? 'var(--good)' : 'var(--bad)'}` }}>
            <strong>{checkAnswer(questions[qIndex], given[questions[qIndex].id]) ? '✔ Correct!' : `✘ Answer: ${questions[qIndex].answer}`}</strong>
          </div>
        )}
      </Card>
      <div style={{ display: 'flex', gap: 8 }}>
        {!revealed ? (
          <button className="btn btn-primary" disabled={given[questions[qIndex].id] == null || String(given[questions[qIndex].id]).trim() === ''} onClick={checkAndNext}>
            Check answer
          </button>
        ) : (
          <button className="btn btn-primary" onClick={nextQ}>
            {qIndex + 1 >= questions.length ? 'Finish lesson' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );

  const doneContent = (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: '4rem', marginBottom: 12 }}>🎉</div>
      <h2 style={{ margin: '0 0 8px', fontSize: '1.75rem', fontWeight: 800 }}>Lesson complete!</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>{score}/{questions.length} correct · +25 XP</p>
      <div style={{ width: 150, height: 150, borderRadius: '50%', margin: '0 auto 18px', background: 'var(--surface-2)', border: '2px solid var(--good)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '3rem' }}>{myRank.rank.emoji}</span>
      </div>
      <div style={{ marginBottom: 20 }}>{alreadyMastered ? 'Topic already mastered.' : `Topic mastered — ${topic.title} added to your path.`}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to path</button>
        <button className="btn btn-ghost" onClick={() => setStage('teach')}>Review notes</button>
      </div>
    </div>
  );

  return (
    <div>
      <BackLink to="/dashboard" label="Learn path" />
      <PageHeader title={topic.title} sub={`${subj?.name} · Year {topic.year} · Lesson`} />
      {stage === 'teach' && teachContent}
      {stage === 'quiz' && quizContent}
      {stage === 'done' && doneContent}
    </div>
  );
}
