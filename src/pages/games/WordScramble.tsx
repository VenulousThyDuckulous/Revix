import { useEffect, useMemo, useRef, useState } from 'react';
import { QUESTIONS, SUBJECTS } from '../../lib/content';
import { shuffle } from '../../lib/quiz';
import { useStore } from '../../lib/store';
import { Card, Empty, PageHeader } from '../../components/ui';

const PLAYABLE = ['mcq', 'true_false', 'short', 'numeric'];
const ROUNDS = 8;
const MIN_WORDS = 6;

type Phase = 'setup' | 'playing' | 'done';

interface ScrWord {
  word: string;
  clue: string;
}

/** Derive single-word vocabulary (letters only, length >= 4) from correct answers. */
function buildWords(subjectId: string): ScrWord[] {
  const seen = new Map<string, string>();
  const pool = QUESTIONS.filter((q) => q.subject === subjectId && (q.type === 'mcq' || q.type === 'short'));
  for (const q of pool) {
    let cands: string[];
    if (q.type === 'mcq') {
      cands = [String(q.answer)];
    } else {
      const raw: unknown[] = [q.answer, ...(q.accept ?? [])].flat();
      cands = raw.map((a) => String(a));
    }
    for (const c of cands) {
      for (const tok of String(c).split(/[^A-Za-z]+/)) {
        if (/^[A-Za-z]{4,}$/.test(tok)) {
          const w = tok.toUpperCase();
          if (!seen.has(w)) seen.set(w, q.question);
        }
      }
    }
  }
  return shuffle([...seen.entries()].map(([word, clue]) => ({ word, clue })));
}

function scrambleLetters(word: string): string[] {
  const letters = word.split('');
  if (new Set(letters).size <= 1) return letters;
  for (let i = 0; i < 12; i++) {
    const s = shuffle(letters);
    if (s.join('') !== word) return s;
  }
  return shuffle(letters);
}

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function WordScramble() {
  const { addActivity } = useStore();
  const playable = SUBJECTS.filter(
    (s) => QUESTIONS.filter((q) => q.subject === s.id && PLAYABLE.includes(q.type)).length >= 3,
  );
  const [subjectId, setSubjectId] = useState(playable[0]?.id ?? '');
  const [phase, setPhase] = useState<Phase>('setup');
  const [words, setWords] = useState<ScrWord[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [tiles, setTiles] = useState<string[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'wrong' | 'right'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [endXp, setEndXp] = useState(0);
  const startAt = useRef(0);
  const loggedRef = useRef(false);

  const wordCount = useMemo(() => buildWords(subjectId).length, [subjectId]);
  const subjectName = SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId;
  const target = words[roundIdx]?.word ?? '';
  const guess = picked.map((i) => tiles[i]).join('');

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const setupRound = (w: ScrWord[], idx: number) => {
    setTiles(scrambleLetters(w[idx].word));
    setPicked([]);
    setTyped('');
    setHintUsed(false);
    setFeedback('idle');
  };

  const start = () => {
    const all = buildWords(subjectId);
    if (all.length < MIN_WORDS) return;
    const chosen = all.slice(0, Math.min(ROUNDS, all.length));
    setWords(chosen);
    setRoundIdx(0);
    setScore(0);
    setSolved(0);
    setElapsed(0);
    setEndXp(0);
    loggedRef.current = false;
    startAt.current = Date.now();
    setupRound(chosen, 0);
    setPhase('playing');
  };

  /** Map typed text onto tile indices so duplicate letters resolve to distinct tiles. */
  const applyTyped = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, tiles.length);
    setTyped(val);
    if (feedback === 'right') return;
    const used = new Array<boolean>(tiles.length).fill(false);
    const next: number[] = [];
    for (const ch of clean) {
      const idx = tiles.findIndex((t, i) => !used[i] && t === ch);
      if (idx === -1) break;
      used[idx] = true;
      next.push(idx);
    }
    setPicked(next);
  };

  const toggleTile = (tileIdx: number) => {
    if (feedback === 'right') return;
    let next: number[];
    if (picked.includes(tileIdx)) {
      next = picked.filter((i) => i !== tileIdx);
    } else if (picked.length < tiles.length) {
      next = [...picked, tileIdx];
    } else {
      return;
    }
    setPicked(next);
    setTyped(next.map((i) => tiles[i]).join(''));
  };

  const backspace = () => {
    if (feedback === 'right' || picked.length === 0) return;
    const next = picked.slice(0, -1);
    setPicked(next);
    setTyped(next.map((i) => tiles[i]).join(''));
  };

  const clear = () => {
    if (feedback === 'right') return;
    setPicked([]);
    setTyped('');
  };

  const useHint = () => {
    if (hintUsed || feedback === 'right') return;
    setHintUsed(true);
    setScore((s) => Math.max(0, s - 1));
  };

  const check = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (feedback === 'right' || picked.length === 0) return;
    if (guess === target) {
      setFeedback('right');
      setSolved((n) => n + 1);
      setScore((s) => s + 2);
    } else {
      setFeedback('wrong');
    }
  };

  const advance = () => {
    if (roundIdx + 1 >= words.length) {
      const xp = 10 + Math.min(20, score);
      setEndXp(xp);
      if (!loggedRef.current) {
        loggedRef.current = true;
        addActivity({
          kind: 'game',
          subjectId,
          detail: 'Word Scramble',
          xp,
          leagueXp: xp,
          correct: solved,
          total: words.length,
          eventKey: 'game-word-scramble-' + Date.now(),
        });
      }
      setPhase('done');
    } else {
      const ni = roundIdx + 1;
      setRoundIdx(ni);
      setupRound(words, ni);
    }
  };

  const skip = () => advance();

  if (playable.length === 0) {
    return (
      <div>
        <PageHeader title="Word Scramble" sub="Unscramble subject vocabulary." />
        <Empty title="No questions yet" body="There are no playable questions in the bank yet, so Word Scramble cannot start." />
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="Word Scramble" sub="Unscramble subject vocabulary." />
        <Card>
          <h3 style={{ marginTop: 0 }}>📜 How to play</h3>
          <ul style={{ color: 'var(--muted)', lineHeight: 1.7, paddingLeft: 20 }}>
            <li>Unscramble {ROUNDS} vocabulary words (fewer if the subject bank is small).</li>
            <li>Tap letter tiles to build the word, or type with your keyboard.</li>
            <li>Each word you solve scores 2 points.</li>
            <li>Stuck? The first-letter hint costs 1 point (never below 0).</li>
            <li>Untimed — take your time. Your time is shown for your own reference.</li>
          </ul>
          <label htmlFor="ws-subject" style={{ fontWeight: 700, display: 'block', margin: '14px 0 6px' }}>
            Choose a subject
          </label>
          <select
            id="ws-subject"
            className="select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{ maxWidth: 360 }}
          >
            {playable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
          <p style={{ color: 'var(--muted)' }}>{wordCount} scrambleable words found in {subjectName}.</p>
          {wordCount < MIN_WORDS ? (
            <Empty
              title="Not enough words here"
              body={`"${subjectName}" only yields ${wordCount} suitable words (need at least ${MIN_WORDS}). Try another subject with more vocabulary — English, Science or Geography usually work well.`}
            />
          ) : (
            <button className="btn btn-primary" onClick={start} style={{ minHeight: 48, marginTop: 8 }}>
              🔤 Start unscrambling
            </button>
          )}
        </Card>
      </div>
    );
  }

  if (phase === 'done') {
    const acc = words.length > 0 ? Math.round((solved / words.length) * 100) : 0;
    return (
      <div>
        <PageHeader title="Word Scramble — Results" sub={`${subjectName} · finished in ${fmtTime(elapsed)}`} />
        <Card style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: '3rem' }}>🔤</div>
          <h2 style={{ margin: '10px 0 4px' }}>
            {solved}/{words.length} words ({acc}%)
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            Score {score} pts · {fmtTime(elapsed)} elapsed · +{endXp} XP
          </p>
          <h4 style={{ textAlign: 'left', marginBottom: 6 }}>Review</h4>
          <div style={{ textAlign: 'left' }}>
            {words.map((w) => (
              <div key={w.word} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
                <strong>{w.word}</strong>
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{w.clue}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn btn-primary" onClick={start} style={{ minHeight: 48 }}>
              🔁 Play again
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase('setup')} style={{ minHeight: 48 }}>
              Change subject
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const current = words[roundIdx];
  if (!current) {
    return (
      <div>
        <PageHeader title="Word Scramble" sub="Unscramble subject vocabulary." />
        <Empty title="No words loaded" body="Something went wrong loading words. Please try again." action={<button className="btn btn-ghost" onClick={() => setPhase('setup')}>Back to setup</button>} />
      </div>
    );
  }

  const available = tiles.map((_, i) => i).filter((i) => !picked.includes(i));

  return (
    <div>
      <PageHeader title="Word Scramble" sub={`${subjectName} · Word ${roundIdx + 1} of ${words.length}`} />
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="badge">🔤 {roundIdx + 1}/{words.length}</span>
          <span className="badge">⭐ {score} pts</span>
          <span className="badge">⏱ {fmtTime(elapsed)}</span>
          <span className="badge">✅ {solved} solved</span>
        </div>

        <p style={{ color: 'var(--muted)', margin: '4px 0 2px', fontSize: '0.85rem' }}>Clue — the word comes from this question:</p>
        <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{current.clue}</p>
        {hintUsed ? (
          <p style={{ margin: '0 0 10px' }}>
            <span className="badge">💡 Starts with “{target[0]}” (−1 pt)</span>
          </p>
        ) : (
          <button className="btn btn-ghost" onClick={useHint} style={{ minHeight: 44, marginBottom: 10 }}>
            💡 First-letter hint (−1 pt, never below 0)
          </button>
        )}

        <div aria-label="Your built word" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 56, marginBottom: 10 }}>
          {picked.length === 0 && <span style={{ color: 'var(--muted)' }}>Tap letters below (or type) to build the word…</span>}
          {picked.map((tileIdx) => (
            <button
              key={`built-${tileIdx}`}
              type="button"
              className="btn btn-primary"
              onClick={() => toggleTile(tileIdx)}
              disabled={feedback === 'right'}
              aria-label={`Remove letter ${tiles[tileIdx]}`}
              style={{ minWidth: 48, minHeight: 52, fontSize: '1.2rem', fontWeight: 800 }}
            >
              {tiles[tileIdx]}
            </button>
          ))}
        </div>

        <div aria-label="Available letters" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {available.map((tileIdx) => (
            <button
              key={`tile-${tileIdx}`}
              type="button"
              className="btn btn-ghost"
              onClick={() => toggleTile(tileIdx)}
              disabled={feedback === 'right'}
              aria-label={`Use letter ${tiles[tileIdx]}`}
              style={{ minWidth: 48, minHeight: 52, fontSize: '1.2rem', fontWeight: 800 }}
            >
              {tiles[tileIdx]}
            </button>
          ))}
        </div>

        <form onSubmit={check} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            value={typed}
            onChange={(e) => applyTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && typed.length === 0) backspace();
            }}
            placeholder="Or type your guess"
            aria-label="Type your guess"
            disabled={feedback === 'right'}
            autoCapitalize="characters"
            autoComplete="off"
            style={{ flex: '1 1 200px' }}
          />
          <button type="submit" className="btn btn-primary" disabled={feedback === 'right' || picked.length === 0} style={{ minHeight: 48 }}>
            Check
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={backspace} style={{ minHeight: 44 }}>
            ⌫ Backspace
          </button>
          <button type="button" className="btn btn-ghost" onClick={clear} style={{ minHeight: 44 }}>
            Clear
          </button>
          {feedback !== 'right' && (
            <button type="button" className="btn btn-ghost" onClick={skip} style={{ minHeight: 44 }}>
              Skip →
            </button>
          )}
        </div>

        {feedback === 'wrong' && (
          <div aria-live="polite" style={{ marginTop: 12, padding: 10, borderRadius: 10, background: 'rgba(248,113,113,.12)', border: '1px solid var(--bad)' }}>
            <strong>✘ Not quite — try again.</strong> You can rearrange tiles, use the hint, or skip.
          </div>
        )}
        {feedback === 'right' && (
          <div aria-live="polite" style={{ marginTop: 12, padding: 10, borderRadius: 10, background: 'rgba(52,211,153,.12)', border: '1px solid var(--good)' }}>
            <strong>✔ Correct! “{target}” (+2 pts)</strong>
            <div>
              <button className="btn btn-primary" onClick={advance} style={{ marginTop: 8, minHeight: 48 }}>
                {roundIdx + 1 >= words.length ? 'Finish →' : 'Next word →'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
