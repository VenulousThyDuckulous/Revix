import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QUESTIONS, SUBJECTS, TOPICS } from '../lib/content';
import { selectQuestions } from '../lib/quiz';
import QuizRunner from '../components/QuizRunner';
import { Card, PageHeader } from '../components/ui';

export default function Quizzes() {
  const [params] = useSearchParams();
  const [subject, setSubject] = useState(params.get('subject') ?? 'mixed');
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(false);
  const [runId, setRunId] = useState(0);

  const topic = params.get('topic');
  const pool = subject === 'mixed'
    ? QUESTIONS
    : selectQuestions(QUESTIONS, { subject, topic, count: 500, shuffleOrder: false });
  const picked = selectQuestions(QUESTIONS, { subject: subject === 'mixed' ? null : subject, topic, count, shuffleOrder: true });
  const topicTitle = topic ? TOPICS.find((t) => t.id === topic)?.title : null;

  return (
    <div>
      <PageHeader title="Quizzes" sub="Original Revix practice questions (supplementary — not official exam-board questions). Immediate feedback with explanations." />
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>Subject
            <select className="select" value={subject} onChange={(e) => { setSubject(e.target.value); setRunId(runId + 1); }}>
              <option value="mixed">Mixed revision</option>
              {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name} ({QUESTIONS.filter((q) => q.subject === s.id).length})</option>)}
            </select>
          </label>
          <label>Questions
            <select className="select" value={count} onChange={(e) => { setCount(Number(e.target.value)); setRunId(runId + 1); }}>
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 10 }}>
            <input type="checkbox" checked={timed} onChange={(e) => { setTimed(e.target.checked); setRunId(runId + 1); }} /> Timed (15 min)
          </label>
          <button className="btn btn-ghost" onClick={() => setRunId(runId + 1)}>↻ New set</button>
        </div>
        {topicTitle && <p>Topic focus: <strong>{topicTitle}</strong> (falls back to subject pool when no tagged questions exist).</p>}
        <p style={{ color: 'var(--muted)' }}>{pool.length} questions available in this pool.</p>
      </Card>
      <QuizRunner
        key={`${subject}-${runId}`}
        questions={picked}
        subjectId={subject === 'mixed' ? null : subject}
        topicId={topic}
        title={topicTitle ? `Quiz: ${topicTitle}` : subject === 'mixed' ? 'Mixed revision quiz' : `Quiz: ${subject}`}
        timedSeconds={timed ? 900 : null}
      />
    </div>
  );
}
