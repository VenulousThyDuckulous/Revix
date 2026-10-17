import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { QUESTIONS, SUBJECTS } from '../../lib/content';
import { shuffle } from '../../lib/quiz';
import { Card, PageHeader } from '../../components/ui';

interface Pair {
  key: string;
  left: string;
  right: string;
  difficulty: string;
}

/**
 * Build up to 6 match pairs for a subject. Prefers real 'matching'
 * questions; falls back to mcq question → correct-option pairs.
 * Match keys are unique per pair (index-suffixed) and right-hand texts
 * are deduped so duplicate option text can never create ambiguity.
 */
function buildPairs(subjectId: string): Pair[] {
  const matchQs = QUESTIONS.filter((q) => q.subject === subjectId && q.type === 'matching');
  const fromMatching: Pair[] = [];
  const seenMatch = new Set<string>();
  matchQs.forEach((q) => {
    const raw = (q.pairs ?? q.answer) as unknown;
    if (!Array.isArray(raw)) return;
    (raw as string[][]).forEach((row, i) => {
      if (fromMatching.length >= 6 || !Array.isArray(row)) return;
      const [l, r] = row;
      if (typeof l !== 'string' || typeof r !== 'string' || !l.trim() || !r.trim()) return;
      const rn = r.trim().toLowerCase();
      if (seenMatch.has(rn)) return;
      seenMatch.add(rn);
      fromMatching.push({ key: `m-${q.id}-${i}`, left: l, right: r, difficulty: q.difficulty });
    });
  });
  if (fromMatching.length >= 3) return fromMatching;

  const mcqs = QUESTIONS.filter((q) => q.subject === subjectId && q.type === 'mcq');
  const fb: Pair[] = [];
  const seen = new Set<string>();
  mcqs.forEach((q, i) => {
    if (fb.length >= 6) return;
    const r = String(q.answer);
    const rn = r.trim().toLowerCase();
    if (!rn || seen.has(rn)) return;
    seen.add(rn);
    fb.push({ key: `q-${q.id}-${i}`, left: q.question, right: r, difficulty: q.difficulty });
  });
  return fb;
}

const trunc = (s: string, n = 60): string => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function MatchUp() {
  const { addActivity } = useStore();
  const playable = useMemo(() => SUBJECTS.filter((s) => buildPairs(s.id).length >= 3), []);
  const [subjectId, setSubjectId] = useState<string>(playable[0]?.id ?? '');
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);

  const pairs = useMemo(() => (subjectId ? buildPairs(subjectId) : []), [subjectId]);
  const rights = useMemo(() => shuffle(pairs), [pairs, round]);

  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wrong, setWrong] = useState<{ l: string; r: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [finalXp, setFinalXp] = useState(0);

  const startRef = useRef(0);
  const attemptsRef = useRef(0);
  const loggedRef = useRef(false);
  const flashRef = useRef<number | null>(null);

  // Reset the board whenever the subject changes or a new round starts.
  useEffect(() => {
    setSelected(null);
    setMatched([]);
    setAttempts(0);
    setErrors(0);
    setWrong(null);
    setElapsed(0);
    setDone(false);
    attemptsRef.current = 0;
    loggedRef.current = false;
    startRef.current = Date.now();
  }, [pairs, round, started]);

  // Live timer while playing.
  useEffect(() => {
    if (!started || done) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [started, done, pairs, round]);

  useEffect(() => () => {
    if (flashRef.current != null) window.clearTimeout(flashRef.current);
  }, []);

  const difficulties = useMemo(
    () => [...new Set(pairs.map((p) => p.difficulty))].join(', '),
    [pairs],
  );

  const finish = (attemptTotal: number) => {
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    setDone(true);
    if (loggedRef.current) return;
    loggedRef.current = true;
    const xp = 10 + Math.min(20, pairs.length * 2);
    setFinalXp(xp);
    addActivity({
      kind: 'game',
      subjectId,
      detail: 'MatchUp',
      xp,
      correct: pairs.length,
      total: Math.max(attemptTotal, pairs.length),
      eventKey: 'game-matchup-' + Date.now(),
    });
  };

  const tryMatch = (rKey: string) => {
    if (!started || done || matched.includes(rKey)) return;
    if (selected == null) return; // pick a term on the left first
    const total = attemptsRef.current + 1;
    attemptsRef.current = total;
    setAttempts(total);
    if (rKey === selected) {
      const next = [...matched, rKey];
      setMatched(next);
      setSelected(null);
      setWrong(null);
      if (next.length >= pairs.length) finish(total);
    } else {
      setErrors((e) => e + 1);
      setWrong({ l: selected, r: rKey });
      setSelected(null);
      if (flashRef.current != null) window.clearTimeout(flashRef.current);
      flashRef.current = window.setTimeout(() => {
        setWrong(null);
        flashRef.current = null;
      }, 600);
    }
  };

  const accuracy = attempts === 0 ? 0 : Math.round((matched.length / attempts) * 100);

  if (playable.length === 0) {
    return (
      <div>
        <PageHeader title="MatchUp" sub="Match terms with their definitions." />
        <Card><p style={{ color: 'var(--muted)' }}>No subjects have enough matchable questions yet.</p></Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div>
        <PageHeader title="MatchUp" sub="Match terms with their definitions." />
        <Card>
          <h3 style={{ marginTop: 0 }}>How to play</h3>
          <ul style={{ color: 'var(--muted)', paddingLeft: 20, margin: '0 0 16px' }}>
            <li>Pick a subject — pairs are built from real revision questions.</li>
            <li>Click a card on the left, then its match on the right.</li>
            <li>Correct matches lock in green. Wrong matches flash red and count as an error.</li>
            <li>Match every pair as fast and accurately as you can.</li>
          </ul>
          <label htmlFor="mu-subject" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Subject</label>
          <select
            id="mu-subject"
            className="select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{ maxWidth: 360, marginBottom: 14 }}
          >
            {playable.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({buildPairs(s.id).length} pairs)</option>
            ))}
          </select>
          {pairs.length < 3 ? (
            <p style={{ color: 'var(--warn)' }}>
              This subject only has {pairs.length} usable pair(s) — MatchUp needs at least 3. Try another subject.
            </p>
          ) : (
            <p style={{ color: 'var(--muted)' }}>{pairs.length} pairs · Difficulties: {difficulties}.</p>
          )}
          <button className="btn btn-primary" onClick={() => setStarted(true)} disabled={pairs.length < 3}>
            Start matching
          </button>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <PageHeader title="MatchUp — complete!" sub="All pairs matched." />
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            <MiniStat label="Pairs" value={`${pairs.length}/${pairs.length}`} />
            <MiniStat label="Time" value={`${elapsed}s`} />
            <MiniStat label="Accuracy" value={`${accuracy}%`} />
            <MiniStat label="Errors" value={String(errors)} />
            <MiniStat label="XP earned" value={`+${finalXp}`} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setRound((r) => r + 1)}>Play again</button>
            <button className="btn btn-ghost" onClick={() => setStarted(false)}>Change subject</button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="MatchUp" sub="Click a left card, then its match on the right." />
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <label htmlFor="mu-subject-live" style={{ fontWeight: 700 }}>Subject</label>
          <select
            id="mu-subject-live"
            className="select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{ maxWidth: 240 }}
          >
            {playable.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="badge">Matched: {matched.length}/{pairs.length}</span>
          <span className="badge">⏱ {elapsed}s</span>
          <span className="badge">Errors: {errors}</span>
          <span className="badge">Difficulties: {difficulties}</span>
        </div>

        {pairs.length < 3 ? (
          <p style={{ color: 'var(--warn)' }}>
            This subject only has {pairs.length} usable pair(s) — MatchUp needs at least 3. Please pick another subject.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ display: 'grid', gap: 8 }} aria-label="Terms">
              {pairs.map((p) => {
                const isMatched = matched.includes(p.key);
                const isSel = selected === p.key;
                const isWrong = wrong?.l === p.key;
                return (
                  <button
                    key={p.key}
                    className="btn btn-ghost"
                    title={p.left}
                    disabled={isMatched}
                    aria-pressed={isSel}
                    onClick={() => setSelected(p.key)}
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minHeight: 52,
                      borderWidth: 2,
                      borderColor: isMatched ? 'var(--good)' : isWrong ? 'var(--bad)' : isSel ? 'var(--accent-2)' : undefined,
                      background: isMatched ? 'rgba(52,211,153,.12)' : isWrong ? 'rgba(248,113,113,.12)' : undefined,
                    }}
                  >
                    {isMatched ? '✔ ' : ''}{trunc(p.left)}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gap: 8 }} aria-label="Definitions">
              {rights.map((p) => {
                const isMatched = matched.includes(p.key);
                const isWrong = wrong?.r === p.key;
                return (
                  <button
                    key={p.key}
                    className="btn btn-ghost"
                    title={p.right}
                    disabled={isMatched}
                    onClick={() => tryMatch(p.key)}
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minHeight: 52,
                      borderWidth: 2,
                      borderColor: isMatched ? 'var(--good)' : isWrong ? 'var(--bad)' : undefined,
                      background: isMatched ? 'rgba(52,211,153,.12)' : isWrong ? 'rgba(248,113,113,.12)' : undefined,
                    }}
                  >
                    {isMatched ? '✔ ' : ''}{p.right}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selected == null && wrong == null && matched.length < pairs.length && (
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>Tip: select a card on the left first, then its match on the right.</p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setRound((r) => r + 1)}>Reshuffle</button>
          <button className="btn btn-ghost" onClick={() => setStarted(false)}>Quit to setup</button>
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value}</div>
    </div>
  );
}
