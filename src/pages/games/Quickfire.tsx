import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { QUESTIONS, SUBJECTS } from '../../lib/content';
import { checkAnswer, shuffle } from '../../lib/quiz';
import { Card, PageHeader } from '../../components/ui';
import type { Question } from '../../lib/types';

const GAME_TYPES = ['mcq', 'true_false', 'short', 'numeric'];

const PACES = [
  { id: 'chill', label: 'Chill', seconds: 60, hint: '60 seconds · relaxed' },
  { id: 'standard', label: 'Standard', seconds: 45, hint: '45 seconds · steady' },
  { id: 'blitz', label: 'Blitz', seconds: 30, hint: '30 seconds · full speed' },
] as const;

type PaceId = (typeof PACES)[number]['id'];
type Phase = 'setup' | 'playing' | 'done';

interface Feedback {
  correct: boolean;
  accepted: string;
}

function poolFor(subjectId: string): Question[] {
  return QUESTIONS.filter((q) => q.subject === subjectId && GAME_TYPES.includes(q.type));
}

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Quickfire() {
  const { addActivity } = useStore();
  const playable = useMemo(() => SUBJECTS.filter((s) => poolFor(s.id).length >= 3), []);
  const [subjectId, setSubjectId] = useState<string>(playable[0]?.id ?? '');
  const [pace, setPace] = useState<PaceId>('standard');
  const [phase, setPhase] = useState<Phase>('setup');

  const seconds = PACES.find((p) => p.id === pace)?.seconds ?? 45;
  const pool = useMemo(() => (subjectId ? poolFor(subjectId) : []), [subjectId]);

  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(seconds);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [locked, setLocked] = useState(false);
  const [finalXp, setFinalXp] = useState(0);

  const statsRef = useRef({ correct: 0, answered: 0, streak: 0, best: 0, score: 0 });
  const poolRef = useRef<Question[]>([]);
  const metaRef = useRef({ subjectId: '', seconds: 45 });
  const t0Ref = useRef(0);
  const advRef = useRef<number | null>(null);
  const lockRef = useRef(false);
  const loggedRef = useRef(false);

  const endGame = useCallback(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    if (advRef.current != null) {
      window.clearTimeout(advRef.current);
      advRef.current = null;
    }
    const s = statsRef.current;
    const xp = 10 + Math.min(20, s.correct * 2);
    setFinalXp(xp);
    addActivity({
      kind: 'game',
      subjectId: metaRef.current.subjectId,
      detail: 'Quickfire',
      xp,
      correct: s.correct,
      total: s.answered,
      eventKey: 'game-quickfire-' + Date.now(),
    });
    setPhase('done');
  }, [addActivity]);

  // Countdown while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const left = metaRef.current.seconds - Math.floor((Date.now() - t0Ref.current) / 1000);
      if (left <= 0) {
        setTimeLeft(0);
        window.clearInterval(id);
        endGame();
      } else {
        setTimeLeft(left);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, endGame]);

  // Clear any pending auto-advance on unmount.
  useEffect(() => () => {
    if (advRef.current != null) window.clearTimeout(advRef.current);
  }, []);

  const start = () => {
    if (pool.length < 3) return;
    statsRef.current = { correct: 0, answered: 0, streak: 0, best: 0, score: 0 };
    poolRef.current = pool;
    metaRef.current = { subjectId, seconds };
    loggedRef.current = false;
    lockRef.current = false;
    setQueue(shuffle(pool));
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setAnswered(0);
    setStreak(0);
    setBest(0);
    setInput('');
    setFeedback(null);
    setLocked(false);
    setTimeLeft(seconds);
    t0Ref.current = Date.now();
    setPhase('playing');
  };

  const advance = (curIndex: number, curQueue: Question[]) => {
    advRef.current = window.setTimeout(() => {
      advRef.current = null;
      setFeedback(null);
      setInput('');
      setLocked(false);
      lockRef.current = false;
      if (curIndex + 1 >= curQueue.length) {
        const fresh = shuffle(poolRef.current);
        setQueue(fresh);
        setIndex(0);
      } else {
        setIndex(curIndex + 1);
      }
    }, 800);
  };

  const answer = (value: unknown) => {
    if (phase !== 'playing' || lockRef.current || timeLeft <= 0) return;
    const q = queue[index];
    if (!q) return;
    lockRef.current = true;
    setLocked(true);
    const res = checkAnswer(q, value);
    const s = statsRef.current;
    s.answered += 1;
    if (res.correct) {
      s.correct += 1;
      s.streak += 1;
      s.best = Math.max(s.best, s.streak);
      s.score += 1 + (s.streak >= 3 ? 1 : 0); // streak bonus: +1 per answer on streaks of 3+
    } else {
      s.streak = 0;
    }
    setScore(s.score);
    setCorrectCount(s.correct);
    setAnswered(s.answered);
    setStreak(s.streak);
    setBest(s.best);
    setFeedback({ correct: res.correct, accepted: res.acceptedAnswer });
    advance(index, queue);
  };

  const q = queue[index];

  if (playable.length === 0) {
    return (
      <div>
        <PageHeader title="Quickfire" sub="Answer as many questions as possible before the timer ends." />
        <Card><p style={{ color: 'var(--muted)' }}>No subjects have enough playable questions yet.</p></Card>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="Quickfire" sub="Answer as many questions as possible before the timer ends." />
        <Card>
          <h3 style={{ marginTop: 0 }}>How to play</h3>
          <ul style={{ color: 'var(--muted)', paddingLeft: 20, margin: '0 0 16px' }}>
            <li>Pick a subject and a pace: Chill (60s), Standard (45s) or Blitz (30s).</li>
            <li>Answer as many real revision questions as you can before time runs out.</li>
            <li>Each correct answer scores 1 point. Streaks of 3+ earn +1 bonus point per answer.</li>
            <li>Questions cycle, so keep going until the clock hits zero.</li>
          </ul>
          <label htmlFor="qf-subject" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Subject</label>
          <select
            id="qf-subject"
            className="select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{ maxWidth: 360, marginBottom: 14 }}
          >
            {playable.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({poolFor(s.id).length} questions)</option>
            ))}
          </select>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Pace</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {PACES.map((p) => (
              <button
                key={p.id}
                className="btn btn-ghost"
                aria-pressed={pace === p.id}
                onClick={() => setPace(p.id)}
                style={pace === p.id ? { borderColor: 'var(--accent-2)', borderWidth: 2 } : undefined}
              >
                {p.label} · {p.hint}
              </button>
            ))}
          </div>
          {pool.length < 3 ? (
            <p style={{ color: 'var(--warn)' }}>
              This subject only has {pool.length} playable question(s) — Quickfire needs at least 3. Try another subject.
            </p>
          ) : (
            <p style={{ color: 'var(--muted)' }}>{pool.length} questions available · {PACES.find((p) => p.id === pace)?.hint}.</p>
          )}
          <button className="btn btn-primary" onClick={start} disabled={pool.length < 3}>
            Start Quickfire
          </button>
        </Card>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div>
        <PageHeader title="Quickfire — results" sub="Time up! Here is how you did." />
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            <Stat label="Score" value={String(score)} />
            <Stat label="Correct" value={`${correctCount}/${answered}`} />
            <Stat label="Accuracy" value={`${answered === 0 ? 0 : Math.round((correctCount / answered) * 100)}%`} />
            <Stat label="Best streak" value={String(best)} />
            <Stat label="XP earned" value={`+${finalXp}`} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={start}>Play again</button>
            <button className="btn btn-ghost" onClick={() => setPhase('setup')}>Change settings</button>
          </div>
        </Card>
      </div>
    );
  }

  // Playing
  return (
    <div>
      <PageHeader title="Quickfire" sub="Answer as many as you can before the timer ends." />
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <span className="badge" role="timer" aria-label={`${timeLeft} seconds left`}>⏱ {fmtTime(timeLeft)}</span>
          <span className="badge">Score: {score}</span>
          <span className="badge">🔥 Streak: {streak}</span>
          <span className="badge">Answered: {answered}</span>
        </div>
        {!q ? (
          <p style={{ color: 'var(--muted)' }}>Loading questions…</p>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className="badge">Question {index + 1}</span>
              <span className="badge">Difficulty: {q.difficulty}</span>
              {streak >= 3 && <span className="badge">Streak bonus active (+1)</span>}
            </div>
            <h3 style={{ margin: '6px 0 12px' }}>{q.question}</h3>

            {q.type === 'mcq' && (
              <div style={{ display: 'grid', gap: 8 }}>
                {(q.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    className="btn btn-ghost"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', minHeight: 52 }}
                    disabled={locked}
                    onClick={() => answer(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'true_false' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['True', 'False'].map((v) => (
                  <button
                    key={v}
                    className="btn btn-ghost"
                    style={{ minHeight: 52, minWidth: 120 }}
                    disabled={locked}
                    onClick={() => answer(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {(q.type === 'short' || q.type === 'numeric') && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input.trim() !== '') answer(input);
                }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
              >
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 200 }}
                  placeholder={q.type === 'numeric' ? `Answer${q.unit ? ` (${q.unit})` : ''}` : 'Type your answer, then press Enter'}
                  value={input}
                  disabled={locked}
                  onChange={(e) => setInput(e.target.value)}
                  aria-label="Your answer"
                />
                <button className="btn btn-primary" type="submit" disabled={locked || input.trim() === ''}>
                  Submit
                </button>
              </form>
            )}

            {feedback && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: feedback.correct ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
                  border: `1px solid ${feedback.correct ? 'var(--good)' : 'var(--bad)'}`,
                }}
              >
                <strong>
                  {feedback.correct
                    ? streak >= 3 ? '✔ Correct! Streak bonus +1.' : '✔ Correct!'
                    : `✘ Not quite — answer: ${feedback.accepted}`}
                </strong>
                {!feedback.correct && <div style={{ color: 'var(--muted)' }}>{q.explanation}</div>}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value}</div>
    </div>
  );
}
