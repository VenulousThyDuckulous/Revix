import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { QUESTIONS, SUBJECTS } from '../../lib/content';
import { shuffle } from '../../lib/quiz';
import { Card, PageHeader } from '../../components/ui';

const LEVELS = [
  { id: 'easy', label: 'Easy', pairs: 4 },
  { id: 'medium', label: 'Medium', pairs: 6 },
  { id: 'hard', label: 'Hard', pairs: 8 },
] as const;

type LevelId = (typeof LEVELS)[number]['id'];
type Phase = 'setup' | 'playing' | 'done';

interface Pair {
  key: string;
  a: string;
  b: string;
  difficulty: string;
}

interface MemCard {
  uid: string;
  pairKey: string;
  text: string;
  side: 'term' | 'def';
}

/**
 * Build up to 8 pairs from real 'matching' pairs plus mcq
 * question → correct-answer pairs. Right-hand texts are deduped so
 * duplicate answer text can never create an unmatchable board.
 */
function buildPairs(subjectId: string): Pair[] {
  const out: Pair[] = [];
  const seenB = new Set<string>();
  const push = (key: string, a: string, b: string, difficulty: string) => {
    if (out.length >= 8) return;
    const bn = b.trim().toLowerCase();
    if (!a.trim() || !bn || seenB.has(bn)) return;
    seenB.add(bn);
    out.push({ key, a, b, difficulty });
  };
  QUESTIONS.filter((q) => q.subject === subjectId && q.type === 'matching').forEach((q) => {
    const raw = (q.pairs ?? q.answer) as unknown;
    if (!Array.isArray(raw)) return;
    (raw as string[][]).forEach((row, i) => {
      if (Array.isArray(row) && typeof row[0] === 'string' && typeof row[1] === 'string') {
        push(`m-${q.id}-${i}`, row[0], row[1], q.difficulty);
      }
    });
  });
  QUESTIONS.filter((q) => q.subject === subjectId && q.type === 'mcq').forEach((q, i) => {
    push(`q-${q.id}-${i}`, q.question, String(q.answer), q.difficulty);
  });
  return out;
}

const trunc = (s: string, n = 90): string => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function MemoryMatch() {
  const { addActivity } = useStore();
  const playable = useMemo(() => SUBJECTS.filter((s) => buildPairs(s.id).length >= 4), []);
  const [subjectId, setSubjectId] = useState<string>(playable[0]?.id ?? '');
  const [level, setLevel] = useState<LevelId>('medium');
  const [phase, setPhase] = useState<Phase>('setup');

  const count = LEVELS.find((l) => l.id === level)?.pairs ?? 6;
  const available = useMemo(() => (subjectId ? buildPairs(subjectId) : []), [subjectId]);
  const levelLabel = LEVELS.find((l) => l.id === level)?.label ?? 'Medium';

  const [deck, setDeck] = useState<MemCard[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [misses, setMisses] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finalXp, setFinalXp] = useState(0);

  const startRef = useRef(0);
  const lockRef = useRef(false);
  const loggedRef = useRef(false);
  const hideRef = useRef<number | null>(null);

  const difficulties = useMemo(
    () => [...new Set(deck.length > 0 ? available.slice(0, count).map((p) => p.difficulty) : [])].join(', '),
    [available, count, deck.length],
  );

  // Live timer while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, deck]);

  useEffect(() => () => {
    if (hideRef.current != null) window.clearTimeout(hideRef.current);
  }, []);

  const deal = (forSubject: string, forLevel: LevelId) => {
    const n = LEVELS.find((l) => l.id === forLevel)?.pairs ?? 6;
    const avail = buildPairs(forSubject).slice(0, n);
    const cards: MemCard[] = [];
    avail.forEach((p, i) => {
      cards.push({ uid: `c-${i}-a`, pairKey: p.key, text: p.a, side: 'term' });
      cards.push({ uid: `c-${i}-b`, pairKey: p.key, text: p.b, side: 'def' });
    });
    if (hideRef.current != null) window.clearTimeout(hideRef.current);
    lockRef.current = false;
    loggedRef.current = false;
    setDeck(shuffle(cards));
    setFlipped([]);
    setSolved([]);
    setMoves(0);
    setMisses(0);
    setElapsed(0);
    startRef.current = Date.now();
  };

  const start = () => {
    if (available.length < count) return;
    deal(subjectId, level);
    setPhase('playing');
  };

  const finish = (finalMoves: number, pairCount: number) => {
    const secs = Math.floor((Date.now() - startRef.current) / 1000);
    setElapsed(secs);
    setPhase('done');
    if (loggedRef.current) return;
    loggedRef.current = true;
    const xp = 10 + Math.min(20, pairCount * 2);
    setFinalXp(xp);
    addActivity({
      kind: 'game',
      subjectId,
      detail: 'MemoryMatch',
      xp,
      leagueXp: xp,
      correct: pairCount,
      total: Math.max(finalMoves, pairCount),
      eventKey: 'game-memorymatch-' + Date.now(),
    });
  };

  const flip = (card: MemCard) => {
    if (phase !== 'playing' || lockRef.current) return;
    if (flipped.includes(card.uid) || solved.includes(card.pairKey)) return;
    if (flipped.length === 0) {
      setFlipped([card.uid]);
      return;
    }
    if (flipped.length >= 2) return;
    const firstUid = flipped[0];
    const first = deck.find((c) => c.uid === firstUid);
    if (!first || first.uid === card.uid) return;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    if (first.pairKey === card.pairKey) {
      const nextSolved = [...solved, card.pairKey];
      setSolved(nextSolved);
      setFlipped([]);
      if (nextSolved.length >= count) finish(nextMoves, count);
    } else {
      setMisses((m) => m + 1);
      setFlipped([first.uid, card.uid]);
      lockRef.current = true;
      hideRef.current = window.setTimeout(() => {
        setFlipped([]);
        lockRef.current = false;
        hideRef.current = null;
      }, 750);
    }
  };

  const accuracy = moves === 0 ? 0 : Math.round((solved.length / moves) * 100);

  if (playable.length === 0) {
    return (
      <div>
        <PageHeader title="Memory Match" sub="Flip cards to find matching pairs." />
        <Card><p style={{ color: 'var(--muted)' }}>No subjects have enough matchable questions yet.</p></Card>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="Memory Match" sub="Flip cards to find matching pairs." />
        <Card>
          <h3 style={{ marginTop: 0 }}>How to play</h3>
          <ul style={{ color: 'var(--muted)', paddingLeft: 20, margin: '0 0 16px' }}>
            <li>Pick a subject and a difficulty: Easy (4 pairs), Medium (6 pairs) or Hard (8 pairs).</li>
            <li>All cards start face-down. Flip two cards per move to find the matching pair.</li>
            <li>Matching pairs stay face-up. Non-matches flip back — try to remember where they were.</li>
            <li>Finish the whole board. Fewer moves means higher accuracy.</li>
          </ul>
          <label htmlFor="mm-subject" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Subject</label>
          <select
            id="mm-subject"
            className="select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{ maxWidth: 360, marginBottom: 14 }}
          >
            {playable.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({buildPairs(s.id).length} pairs)</option>
            ))}
          </select>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Difficulty</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {LEVELS.map((l) => (
              <button
                key={l.id}
                className="btn btn-ghost"
                aria-pressed={level === l.id}
                onClick={() => setLevel(l.id)}
                style={level === l.id ? { borderColor: 'var(--accent-2)', borderWidth: 2 } : undefined}
              >
                {l.label} · {l.pairs} pairs
              </button>
            ))}
          </div>
          {available.length < count ? (
            <p style={{ color: 'var(--warn)' }}>
              This subject only has {available.length} usable pair(s) — {levelLabel} needs {count}. Try an easier
              difficulty or another subject.
            </p>
          ) : (
            <p style={{ color: 'var(--muted)' }}>{count} pairs · {available.length} available on this subject.</p>
          )}
          <button className="btn btn-primary" onClick={start} disabled={available.length < count}>
            Start game
          </button>
        </Card>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div>
        <PageHeader title="Memory Match — board cleared!" sub={`Subject · ${levelLabel} (${count} pairs).`} />
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            <MiniStat label="Pairs" value={`${count}/${count}`} />
            <MiniStat label="Moves" value={String(moves)} />
            <MiniStat label="Misses" value={String(misses)} />
            <MiniStat label="Time" value={`${elapsed}s`} />
            <MiniStat label="Accuracy" value={`${accuracy}%`} />
            <MiniStat label="XP earned" value={`+${finalXp}`} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                deal(subjectId, level);
                setPhase('playing');
              }}
            >
              Play again
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase('setup')}>Change settings</button>
          </div>
        </Card>
      </div>
    );
  }

  // Playing
  return (
    <div>
      <PageHeader title="Memory Match" sub={`Find all ${count} pairs · ${levelLabel} difficulty.`} />
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <span className="badge">Moves: {moves}</span>
          <span className="badge">⏱ {elapsed}s</span>
          <span className="badge">Found: {solved.length}/{count}</span>
          <span className="badge">Level: {levelLabel}</span>
          {difficulties && <span className="badge">Difficulties: {difficulties}</span>}
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}
          role="group"
          aria-label="Memory cards"
        >
          {deck.map((c) => {
            const faceUp = flipped.includes(c.uid) || solved.includes(c.pairKey);
            const isSolved = solved.includes(c.pairKey);
            return (
              <button
                key={c.uid}
                className="btn btn-ghost"
                onClick={() => flip(c)}
                disabled={faceUp}
                aria-pressed={faceUp}
                aria-label={faceUp ? `${c.side === 'term' ? 'Term' : 'Definition'}: ${c.text}` : 'Face-down card, activate to flip'}
                title={faceUp ? c.text : 'Flip this card'}
                style={{
                  minHeight: 104,
                  padding: '10px 12px',
                  fontSize: '0.85rem',
                  lineHeight: 1.35,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  borderWidth: 2,
                  borderColor: isSolved ? 'var(--good)' : faceUp ? 'var(--accent-2)' : undefined,
                  background: isSolved ? 'rgba(52,211,153,.12)' : faceUp ? 'var(--surface-2)' : undefined,
                }}
              >
                {faceUp ? (
                  <span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>
                      {c.side === 'term' ? 'TERM' : 'MATCH'}
                    </span>
                    {trunc(c.text)}
                  </span>
                ) : (
                  <span style={{ fontSize: '1.6rem' }} aria-hidden="true">?</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              deal(subjectId, level);
              setPhase('playing');
            }}
          >
            Restart
          </button>
          <button className="btn btn-ghost" onClick={() => setPhase('setup')}>Change settings</button>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 10 }}>{flipped.length}/2 cards flipped this move.</p>
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
