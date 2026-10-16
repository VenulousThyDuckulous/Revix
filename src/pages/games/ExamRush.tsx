import { useEffect, useRef, useState } from 'react';
import { QUESTIONS, SUBJECTS } from '../../lib/content';
import { checkAnswer, shuffle } from '../../lib/quiz';
import { useStore } from '../../lib/store';
import { Card, Empty, PageHeader } from '../../components/ui';
import type { Question } from '../../lib/types';

const PLAYABLE = ['mcq', 'true_false', 'short', 'numeric'];
const DURATIONS = [2, 5, 10];

type Difficulty = 'all' | 'foundation' | 'standard' | 'higher';
type Phase = 'setup' | 'running' | 'done';

interface AnswerRec {
  given: string;
  correct: boolean;
  accepted: string;
}

type AnswerMap = Record<string, AnswerRec>;

function fmtClock(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
}

export default function ExamRush() {
  const { addActivity } = useStore();
  const playable = SUBJECTS.filter(
    (s) => QUESTIONS.filter((q) => q.subject === s.id && PLAYABLE.includes(q.type)).length >= 3,
  );
  const [subjectId, setSubjectId] = useState(playable[0]?.id ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [durationMin, setDurationMin] = useState<number>(5);
  const [phase, setPhase] = useState<Phase>('setup');
  const [order, setOrder] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [runId, setRunId] = useState(0);
  const [endXp, setEndXp] = useState(0);
  const [endSnapshot, setEndSnapshot] = useState<{ answers: AnswerMap; correct: number; faced: string[] } | null>(null);
  const loggedRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});

  const poolCount = QUESTIONS.filter(
    (q) =>
      q.subject === subjectId &&
      PLAYABLE.includes(q.type) &&
      (difficulty === 'all' || q.difficulty === difficulty),
  ).length;
  const subjectName = SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId;
  const current: Question | undefined = order[index];
  const lastResult: AnswerRec | undefined = current ? answers[current.id] : undefined;

  const start = () => {
    const pool = shuffle(
      QUESTIONS.filter(
        (q) =>
          q.subject === subjectId &&
          PLAYABLE.includes(q.type) &&
          (difficulty === 'all' || q.difficulty === difficulty),
      ),
    );
    if (pool.length === 0) return;
    loggedRef.current = false;
    setOrder(pool);
    setIndex(0);
    setGiven('');
    setRevealed(false);
    setAnswers({});
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setEndXp(0);
    setEndSnapshot(null);
    setTimeLeft(durationMin * 60);
    setRunId((r) => r + 1);
    setPhase('running');
  };

  const finish = () => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    const final: AnswerMap = { ...answers };
    let cc = correctCount;
    // Auto-submit the pending question when time expires (or run otherwise ends).
    if (current && !final[current.id]) {
      const r = checkAnswer(current, given);
      final[current.id] = {
        given: given.trim() === '' ? '(no answer — time ran out)' : given,
        correct: r.correct,
        accepted: r.acceptedAnswer,
      };
      if (r.correct) cc += 1;
    }
    const faced = order.filter((q) => final[q.id]).map((q) => q.id);
    const total = faced.length;
    const acc = total > 0 ? cc / total : 0;
    const xp = 10 + Math.round(20 * acc);
    setEndXp(xp);
    setCorrectCount(cc);
    setAnswers(final);
    setEndSnapshot({ answers: final, correct: cc, faced });
    addActivity({
      kind: 'game',
      subjectId,
      detail: 'Exam Rush',
      xp,
      leagueXp: xp,
      correct: cc,
      total,
      eventKey: 'game-exam-rush-' + Date.now(),
    });
    setPhase('done');
  };

  // Keep a fresh finish closure for the timer (state ticks every second, so this stays current).
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setTimeout(() => finishRef.current(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, runId]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!current || revealed || phase !== 'running') return;
    const r = checkAnswer(current, given);
    setAnswers((a) => ({ ...a, [current.id]: { given, correct: r.correct, accepted: r.acceptedAnswer } }));
    if (r.correct) {
      const ns = streak + 1;
      setCorrectCount((c) => c + 1);
      setStreak(ns);
      setBestStreak((b) => Math.max(b, ns));
    } else {
      setStreak(0);
    }
    setRevealed(true);
  };

  const next = () => {
    if (index + 1 >= order.length) {
      finish();
    } else {
      setIndex(index + 1);
      setGiven('');
      setRevealed(false);
    }
  };

  if (playable.length === 0) {
    return (
      <div>
        <PageHeader title="Exam Rush" sub="Answer a sequence of questions under time pressure." />
        <Empty title="No questions yet" body="There are no playable questions in the bank yet, so Exam Rush cannot start." />
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="Exam Rush" sub="Answer a sequence of questions under time pressure." />
        <Card>
          <h3 style={{ marginTop: 0 }}>📜 How to play</h3>
          <ul style={{ color: 'var(--muted)', lineHeight: 1.7, paddingLeft: 20 }}>
            <li>Pick a duration — the clock counts down live.</li>
            <li>Answer as many questions as you can before time runs out.</li>
            <li>Correct answers build your streak. Wrong answers reset it.</li>
            <li>When time expires, unanswered work is auto-submitted.</li>
            <li>You get a full review of everything you got wrong.</li>
          </ul>
          <div style={{ display: 'grid', gap: 12, maxWidth: 420, marginTop: 14 }}>
            <div>
              <label htmlFor="er-subject" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Subject
              </label>
              <select id="er-subject" className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {playable.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="er-diff" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Difficulty
              </label>
              <select id="er-diff" className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="all">All levels</option>
                <option value="foundation">Foundation</option>
                <option value="standard">Standard</option>
                <option value="higher">Higher</option>
              </select>
            </div>
            <div>
              <label htmlFor="er-dur" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Duration
              </label>
              <select id="er-dur" className="select" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p style={{ color: 'var(--muted)' }}>
            {poolCount} matching questions{poolCount === 0 ? ' — adjust the filters.' : '.'}
          </p>
          {poolCount === 0 ? (
            <Empty
              title="No questions match"
              body={`No playable ${difficulty === 'all' ? '' : difficulty + ' '}questions found for "${subjectName}". Try another subject or difficulty.`}
            />
          ) : (
            <button className="btn btn-primary" onClick={start} style={{ minHeight: 48, marginTop: 8 }}>
              ⏱ Start {durationMin}-minute rush
            </button>
          )}
        </Card>
      </div>
    );
  }

  if (phase === 'done' && endSnapshot) {
    const total = endSnapshot.faced.length;
    const acc = total > 0 ? Math.round((endSnapshot.correct / total) * 100) : 0;
    const wrong = endSnapshot.faced
      .map((id) => order.find((q) => q.id === id))
      .filter((q): q is Question => !!q && !endSnapshot.answers[q.id]?.correct);
    return (
      <div>
        <PageHeader title="Exam Rush — Results" sub={`${subjectName} · ${durationMin} min · ${difficulty === 'all' ? 'all levels' : difficulty}`} />
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="badge">
              ✅ {endSnapshot.correct}/{total} ({acc}%)
            </span>
            <span className="badge">🔥 Best streak {bestStreak}</span>
            <span className="badge">⭐ +{endXp} XP</span>
          </div>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>
            {acc === 100 && total > 0
              ? 'Flawless under pressure — superb!'
              : acc >= 70
                ? 'Strong pace. Review the misses below.'
                : 'Good effort — work through the review below, then retry.'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="btn btn-primary" onClick={start} style={{ minHeight: 48 }}>
              🔁 Retry
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase('setup')} style={{ minHeight: 48 }}>
              Change settings
            </button>
          </div>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Review — things to fix ({wrong.length})</h3>
          {wrong.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>Nothing to fix — every attempted question was correct.</p>
          ) : (
            wrong.map((q) => {
              const a = endSnapshot.answers[q.id];
              return (
                <div key={q.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
                  <div>
                    <strong>{q.question}</strong>
                  </div>
                  <div style={{ color: 'var(--bad)' }}>
                    ✘ Your answer: {a?.given || '(blank)'} — Correct: {a?.accepted ?? checkAnswer(q, '').acceptedAnswer}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{q.explanation}</div>
                </div>
              );
            })
          )}
        </Card>
      </div>
    );
  }

  if (!current) {
    return (
      <div>
        <PageHeader title="Exam Rush" sub="Answer a sequence of questions under time pressure." />
        <Empty title="Run fizzled out" body="No questions could be loaded for this run. Please try other settings." action={<button className="btn btn-ghost" onClick={() => setPhase('setup')}>Back to setup</button>} />
      </div>
    );
  }

  const urgent = timeLeft <= 30;

  return (
    <div>
      <PageHeader title="Exam Rush" sub={`${subjectName} · ${difficulty === 'all' ? 'all levels' : difficulty}`} />
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge" style={urgent ? { borderColor: 'var(--bad)', color: 'var(--bad)' } : undefined} aria-live="polite">
            ⏱ {fmtClock(timeLeft)}
          </span>
          <span className="badge">
            Q {index + 1}/{order.length}
          </span>
          <span className="badge">✅ {correctCount}</span>
          <span className="badge">🔥 Streak {streak}</span>
        </div>
      </Card>
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span className="badge">{current.difficulty}</span>
          <span className="badge">{current.type.replace('_', ' ')}</span>
        </div>
        <h3 style={{ margin: '6px 0 12px' }}>{current.question}</h3>
        <form onSubmit={submit}>
          {current.type === 'mcq' && (
            <div style={{ display: 'grid', gap: 8 }} role="radiogroup" aria-label="Answer options">
              {(current.options ?? [String(current.answer)]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', minHeight: 48 }}
                  disabled={revealed}
                  aria-pressed={given === opt}
                  onClick={() => setGiven(opt)}
                >
                  <span
                    style={{
                      border: given === opt ? '2px solid var(--accent-2)' : '2px solid var(--border)',
                      borderRadius: 8,
                      padding: '2px 10px',
                      marginRight: 4,
                    }}
                  >
                    {given === opt ? '●' : '○'}
                  </span>{' '}
                  {opt}
                </button>
              ))}
            </div>
          )}
          {current.type === 'true_false' && (
            <div style={{ display: 'flex', gap: 8 }} role="radiogroup" aria-label="True or false">
              {['True', 'False'].map((v) => (
                <button
                  key={v}
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 48, flex: 1 }}
                  disabled={revealed}
                  aria-pressed={given === v}
                  onClick={() => setGiven(v)}
                >
                  {given === v ? '● ' : '○ '}
                  {v}
                </button>
              ))}
            </div>
          )}
          {(current.type === 'short' || current.type === 'numeric') && (
            <input
              className="input"
              disabled={revealed}
              placeholder={current.type === 'numeric' ? `Answer${current.unit ? ` (${current.unit})` : ''}` : 'Type your answer'}
              value={given}
              onChange={(e) => setGiven(e.target.value)}
              aria-label="Your answer"
            />
          )}
          {!revealed && (
            <button type="submit" className="btn btn-primary" style={{ marginTop: 14, minHeight: 48 }} disabled={given.trim() === ''}>
              Check answer
            </button>
          )}
        </form>

        {revealed && lastResult && (
          <div
            aria-live="polite"
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: lastResult.correct ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
              border: `1px solid ${lastResult.correct ? 'var(--good)' : 'var(--bad)'}`,
            }}
          >
            <strong>
              {lastResult.correct ? `✔ Correct! Streak ×${streak}` : `✘ Not quite — answer: ${lastResult.accepted}`}
            </strong>
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>{current.explanation}</div>
            <button className="btn btn-primary" onClick={next} style={{ marginTop: 10, minHeight: 48 }}>
              {index + 1 >= order.length ? 'Finish →' : 'Next →'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
