import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QUESTIONS, SUBJECTS } from '../lib/content';
import { checkAnswer, selectQuestions } from '../lib/quiz';
import { useStore } from '../lib/store';
import { BackLink, Card, PageHeader } from '../components/ui';

export default function ExamPractice() {
  const [params] = useSearchParams();
  const { addActivity } = useStore();
  const [subject, setSubject] = useState(params.get('subject') ?? 'mixed');
  const [count, setCount] = useState(6);
  const [timed, setTimed] = useState(false);
  const [started, setStarted] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Lock the shuffled pool when the session starts so answering never re-randomises it.
  const pool = useMemo(
    () => selectQuestions(QUESTIONS, {
      subject: subject === 'mixed' ? null : subject, count, shuffleOrder: true,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runKey, subject, count],
  );

  const submit = () => {
    setSubmitted(true);
    const correct = pool.filter((q) => checkAnswer(q, answers[q.id]).correct).length;
    addActivity({
      kind: 'exam', subjectId: subject === 'mixed' ? null : subject,
      detail: `Exam practice (${pool.length} Q)`, xp: 20 + correct * 5,
      correct, total: pool.length, eventKey: `exam-${Date.now()}`,
    });
  };

  return (
    <div>
      <BackLink to="/" label="Dashboard" />
      <PageHeader title="Exam Practice" sub="Original Revix practice questions — clearly labelled practice, not past papers. Longer answers are self-marked against model guidance." />
      {!started && (
        <Card>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <label>Subject
              <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="mixed">Mixed topics</option>
                {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>Questions
              <select className="select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[4, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 10 }}>
              <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} /> Timed (1 min/question)
            </label>
            <button className="btn btn-primary" onClick={() => { setRunKey((k) => k + 1); setStarted(true); setSubmitted(false); setAnswers({}); }}>Start session</button>
          </div>
          <p style={{ color: 'var(--muted)' }}>Self-marking guidance: compare longer answers to the model points — award yourself the mark only if you made the same point. This won't perfectly match an official mark scheme.</p>
        </Card>
      )}
      {started && !submitted && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Answer all questions, then submit {timed && <span className="badge">⏱ {pool.length} min suggested</span>}</h3>
          {pool.map((q, i) => (
            <div key={q.id} style={{ borderTop: '1px solid var(--border)', padding: '12px 0' }}>
              <p><strong>Q{i + 1}.</strong> {q.question}</p>
              {q.type === 'mcq' ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {q.options!.map((o) => (
                    <label key={o} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} /> {o}
                    </label>
                  ))}
                </div>
              ) : q.type === 'true_false' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  {['True', 'False'].map((v) => (
                    <label key={v} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswers({ ...answers, [q.id]: v })} /> {v}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea className="textarea" rows={q.type === 'matching' ? 1 : 3}
                  placeholder={q.type === 'matching' ? 'This question type needs the quiz engine — attempt it in Quizzes.' : 'Write your answer…'}
                  value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
              )}
            </div>
          ))}
          <button className="btn btn-primary" onClick={submit}>Submit & self-mark</button>
        </Card>
      )}
      {started && submitted && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Feedback</h3>
          {pool.map((q, i) => {
            const r = checkAnswer(q, answers[q.id]);
            return (
              <div key={q.id} style={{ borderTop: '1px solid var(--border)', padding: '12px 0' }}>
                <p><strong>Q{i + 1}.</strong> {q.question}</p>
                <p style={{ color: r.correct ? 'var(--good)' : 'var(--bad)' }}>
                  {r.correct ? '✔ Correct' : `✘ Your answer: ${answers[q.id] || '(blank)'}`}</p>
                <p><strong>Model answer:</strong> {r.acceptedAnswer}</p>
                <p style={{ color: 'var(--muted)' }}>{q.explanation}</p>
              </div>
            );
          })}
          <h4>Mistakes to revisit</h4>
          <ul>
            {pool.filter((q) => !checkAnswer(q, answers[q.id]).correct).map((q) => (
              <li key={q.id}>{q.question} — <Link to={`/quizzes?subject=${q.subject}`}>practise more {q.subject}</Link></li>
            ))}
          </ul>
          <button className="btn btn-ghost" onClick={() => { setRunKey((k) => k + 1); setStarted(false); setSubmitted(false); }}>New session</button>
        </Card>
      )}
    </div>
  );
}
