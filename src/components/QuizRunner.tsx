import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { checkAnswer, scoreQuiz, shuffle } from '../lib/quiz';
import type { Question } from '../lib/types';
import { Card } from './ui';

interface Props {
  questions: Question[];
  subjectId: string | null;
  topicId: string | null;
  title: string;
  timedSeconds?: number | null;
  onDone?: (correct: number, total: number) => void;
}

/** Reusable quiz engine: mcq, true/false, short, fill-blank, numeric, matching. */
export default function QuizRunner({ questions, subjectId, topicId, title, timedSeconds = null, onDone }: Props) {
  const { addActivity } = useStore();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<Record<string, unknown>>({});
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [matchSel, setMatchSel] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(timedSeconds);
  const order = useMemo(() => shuffle(questions), [questions]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (questions.length === 0) {
    return <Card><p style={{ color: 'var(--muted)' }}>No questions available for this selection yet — try another subject or add personal flashcards.</p></Card>;
  }

  const q = order[Math.min(index, order.length - 1)];

  const matchSelFor = (qid: string): Record<string, string> =>
    (qid === q.id ? matchSel : ((given[`match:${qid}`] as Record<string, string> | undefined) ?? {}));

  const currentGiven: unknown = q.type === 'matching' ? matchSel : (given[q.id] ?? '');

  const finish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = order.filter((qq) => {
      const g = qq.type === 'matching' ? (given[`match:${qq.id}`] as Record<string, string> | undefined) : given[qq.id];
      const gg = qq.id === q.id && qq.type === 'matching' ? matchSel : g;
      return checkAnswer(qq, gg).correct;
    }).length;
    const { xp, leagueXp } = scoreQuiz(correct, order.length);
    addActivity({
      kind: 'quiz', subjectId, topicId, detail: title, xp, leagueXp,
      correct, total: order.length, eventKey: `quiz-${Date.now()}-${title}`,
    });
    setFinished(true);
    onDone?.(correct, order.length);
  };

  const start = () => {
    setStarted(true);
    if (timedSeconds) {
      setTimeLeft(timedSeconds);
      const t0 = Date.now();
      const id = setInterval(() => {
        const left = timedSeconds - Math.floor((Date.now() - t0) / 1000);
        setTimeLeft(Math.max(0, left));
        if (left <= 0) {
          clearInterval(id);
          finish();
        }
      }, 500);
      timerRef.current = id;
    }
  };

  const submit = () => {
    if (q.type === 'matching') setGiven((g) => ({ ...g, [`match:${q.id}`]: { ...matchSel } }));
    setRevealed(true);
  };

  const next = () => {
    if (index + 1 >= order.length) finish();
    else {
      setIndex(index + 1);
      setRevealed(false);
      setMatchSel({});
    }
  };

  if (!started) {
    return (
      <Card>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: 'var(--muted)' }}>{order.length} questions · mixed types · immediate feedback with explanations.</p>
        {timedSeconds ? <p>⏱ Timed: {Math.round(timedSeconds / 60)} min.</p> : <p>Untimed — take your time.</p>}
        <button className="btn btn-primary" onClick={start}>Start quiz</button>
      </Card>
    );
  }

  if (finished) {
    const correct = order.filter((qq) =>
      checkAnswer(qq, qq.type === 'matching' ? matchSelFor(qq.id) : given[qq.id]).correct).length;
    const acc = order.length ? Math.round((correct / order.length) * 100) : 0;
    return (
      <Card>
        <h3 style={{ marginTop: 0 }}>Results: {correct}/{order.length} ({acc}%)</h3>
        <p style={{ color: 'var(--muted)' }}>{acc === 100 ? 'Perfect — outstanding!' : acc >= 70 ? 'Solid work. Review the ones you missed.' : 'Good effort — retry the incorrect ones below.'}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className="btn btn-primary" onClick={() => { setIndex(0); setGiven({}); setMatchSel({}); setRevealed(false); setFinished(false); setStarted(false); }}>Retry quiz</button>
        </div>
        <h4>Review</h4>
        {order.map((qq) => {
          const g = qq.type === 'matching' ? matchSelFor(qq.id) : given[qq.id];
          const r = checkAnswer(qq, g);
          return (
            <div key={qq.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
              <div><strong>{qq.question}</strong></div>
              <div style={{ color: r.correct ? 'var(--good)' : 'var(--bad)' }}>
                {r.correct ? '✔ Correct' : `✘ Your answer: ${fmtGiven(g)} — Answer: ${r.acceptedAnswer}`}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{qq.explanation}</div>
            </div>
          );
        })}
      </Card>
    );
  }

  const result = revealed ? checkAnswer(q, currentGiven) : null;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <span className="badge">Question {index + 1} / {order.length}</span>
        {timeLeft != null && <span className="badge">⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>}
        <span className="badge">{q.difficulty}</span>
      </div>
      <h3 style={{ margin: '6px 0 12px' }}>{q.question}</h3>

      {q.type === 'mcq' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {q.options!.map((opt) => (
            <button
              key={opt} className="btn btn-ghost" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              disabled={revealed} onClick={() => setGiven({ ...given, [q.id]: opt })}
              aria-pressed={given[q.id] === opt}
            >
              <span style={{
                border: given[q.id] === opt ? '2px solid var(--accent-2)' : '2px solid var(--border)',
                borderRadius: 8, padding: '2px 10px', marginRight: 4,
              }}>{given[q.id] === opt ? '●' : '○'}</span> {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === 'true_false' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {['True', 'False'].map((v) => (
            <button key={v} className="btn btn-ghost" disabled={revealed}
              onClick={() => setGiven({ ...given, [q.id]: v })} aria-pressed={given[q.id] === v}>
              {given[q.id] === v ? '● ' : '○ '}{v}
            </button>
          ))}
        </div>
      )}

      {(q.type === 'short' || q.type === 'fill_blank' || q.type === 'numeric') && (
        <input
          className="input" disabled={revealed}
          placeholder={q.type === 'numeric' ? `Answer${q.unit ? ` (${q.unit})` : ''}` : 'Type your answer'}
          value={String(given[q.id] ?? '')}
          onChange={(e) => setGiven({ ...given, [q.id]: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter' && !revealed) submit(); }}
        />
      )}

      {q.type === 'matching' && (
        <MatchingInput
          pairs={(q.pairs ?? q.answer) as string[][]}
          sel={matchSel}
          setSel={setMatchSel}
          disabled={revealed}
        />
      )}

      {result && (
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 10,
          background: result.correct ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
          border: `1px solid ${result.correct ? 'var(--good)' : 'var(--bad)'}`,
        }}>
          <strong>{result.correct ? '✔ Correct!' : `✘ Not quite — answer: ${result.acceptedAnswer}`}</strong>
          <div style={{ color: 'var(--muted)' }}>{q.explanation}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {!revealed ? (
          <button
            className="btn btn-primary" onClick={submit}
            disabled={q.type !== 'matching' && (given[q.id] == null || String(given[q.id]).trim() === '')}
          >
            Check answer
          </button>
        ) : (
          <button className="btn btn-primary" onClick={next}>
            {index + 1 >= order.length ? 'Finish' : 'Next →'}
          </button>
        )}
      </div>
    </Card>
  );
}

function fmtGiven(g: unknown): string {
  if (g == null || g === '') return '(blank)';
  if (typeof g === 'object') {
    return Object.entries(g as Record<string, string>).map(([k, v]) => `${k}→${v || '?'}`).join('; ');
  }
  return String(g);
}

function MatchingInput({ pairs, sel, setSel, disabled }: {
  pairs: string[][]; sel: Record<string, string>; setSel: (s: Record<string, string>) => void; disabled: boolean;
}) {
  const matches = useMemo(() => shuffle(pairs.map((p) => p[1])), [pairs]);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {pairs.map(([term]) => (
        <div key={term} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ minWidth: 120 }}>{term}</strong>
          <span>→</span>
          <select
            className="select" style={{ flex: 1, minWidth: 160 }} disabled={disabled}
            value={sel[term] ?? ''} onChange={(e) => setSel({ ...sel, [term]: e.target.value })}
            aria-label={`Match for ${term}`}
          >
            <option value="">Choose…</option>
            {matches.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
