import { useRef, useState } from 'react';
import { QUESTIONS, SUBJECTS } from '../../lib/content';
import { checkAnswer, shuffle } from '../../lib/quiz';
import { useStore } from '../../lib/store';
import { Card, Empty, PageHeader, ProgressBar } from '../../components/ui';
import type { Question } from '../../lib/types';

const PLAYABLE = ['mcq', 'true_false', 'short', 'numeric'];
const ROUND_SIZES = [3, 4, 5];
const BOSS_NAMES = ['Goblin of Gaps', 'Troll of Topics', 'Dragon of Doubt'];

type Phase = 'setup' | 'battle' | 'victory' | 'defeat';

function bankFor(subjectId: string): Question[] {
  return shuffle(QUESTIONS.filter((q) => q.subject === subjectId && PLAYABLE.includes(q.type)));
}

function buildRounds(bank: Question[]): Question[][] {
  const rounds: Question[][] = [];
  let i = 0;
  for (const size of ROUND_SIZES) {
    if (i >= bank.length) break;
    rounds.push(bank.slice(i, i + size));
    i += size;
  }
  return rounds;
}

function bossFace(remaining: number, phase: Phase): string {
  if (phase === 'defeat') return '💀';
  if (phase === 'victory') return '🏆';
  if (remaining > 0.66) return '👾';
  if (remaining > 0.33) return '😠';
  if (remaining > 0) return '🥴';
  return '✨';
}

export default function TopicBoss() {
  const { addActivity } = useStore();
  const playable = SUBJECTS.filter(
    (s) => QUESTIONS.filter((q) => q.subject === s.id && PLAYABLE.includes(q.type)).length >= 3,
  );
  const [subjectId, setSubjectId] = useState(playable[0]?.id ?? '');
  const [phase, setPhase] = useState<Phase>('setup');
  const [rounds, setRounds] = useState<Question[][]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [hits, setHits] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [answeredTotal, setAnsweredTotal] = useState(0);
  const [given, setGiven] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [accepted, setAccepted] = useState('');
  const [endXp, setEndXp] = useState(0);
  const loggedRef = useRef(false);

  const bankCount = QUESTIONS.filter((q) => q.subject === subjectId && PLAYABLE.includes(q.type)).length;
  const subjectName = SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId;
  const current: Question | undefined = rounds[roundIdx]?.[qIdx];
  const roundLen = rounds[roundIdx]?.length ?? 1;
  const bossRemaining = Math.max(0, 1 - hits / roundLen);

  const start = () => {
    const bank = bankFor(subjectId);
    if (bank.length < 3) return;
    setRounds(buildRounds(bank));
    setRoundIdx(0);
    setQIdx(0);
    setHearts(3);
    setHits(0);
    setCorrectTotal(0);
    setAnsweredTotal(0);
    setGiven('');
    setRevealed(false);
    setWasCorrect(false);
    setAccepted('');
    setEndXp(0);
    loggedRef.current = false;
    setPhase('battle');
  };

  const logEnd = (win: boolean, correct: number, total: number) => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    const acc = total > 0 ? correct / total : 0;
    const xp = 10 + Math.round(20 * acc);
    setEndXp(xp);
    addActivity({
      kind: 'game',
      subjectId,
      detail: 'Topic Boss',
      xp,
      correct,
      total,
      eventKey: 'game-topic-boss-' + Date.now(),
    });
    setPhase(win ? 'victory' : 'defeat');
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!current || revealed) return;
    const r = checkAnswer(current, given);
    const newCorrect = correctTotal + (r.correct ? 1 : 0);
    const newTotal = answeredTotal + 1;
    setCorrectTotal(newCorrect);
    setAnsweredTotal(newTotal);
    setWasCorrect(r.correct);
    setAccepted(r.acceptedAnswer);
    setRevealed(true);
    if (r.correct) {
      setHits((h) => h + 1);
    } else {
      setHearts((h) => Math.max(0, h - 1));
    }
  };

  const next = () => {
    if (hearts <= 0) {
      logEnd(false, correctTotal, answeredTotal);
      return;
    }
    const round = rounds[roundIdx];
    if (!round) return;
    if (qIdx + 1 < round.length) {
      setQIdx(qIdx + 1);
      setGiven('');
      setRevealed(false);
    } else if (roundIdx + 1 < rounds.length) {
      setRoundIdx(roundIdx + 1);
      setQIdx(0);
      setHearts(3);
      setHits(0);
      setGiven('');
      setRevealed(false);
    } else {
      logEnd(true, correctTotal, answeredTotal);
    }
  };

  const accuracy = answeredTotal > 0 ? Math.round((correctTotal / answeredTotal) * 100) : 0;

  if (playable.length === 0) {
    return (
      <div>
        <PageHeader title="Topic Boss" sub="Revision boss battle over several rounds." />
        <Empty title="No questions yet" body="There are no playable questions in the bank yet, so Topic Boss cannot start." />
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div>
        <PageHeader title="Topic Boss" sub="Revision boss battle over several rounds." />
        <Card>
          <h3 style={{ marginTop: 0 }}>📜 How to play</h3>
          <ul style={{ color: 'var(--muted)', lineHeight: 1.7, paddingLeft: 20 }}>
            <li>Battle through up to 3 rounds of questions (3, then 4, then 5).</li>
            <li>Each correct answer hits the boss and drains its HP.</li>
            <li>Each wrong answer costs you one of 3 hearts per round.</li>
            <li>Lose all 3 hearts and the run ends in defeat.</li>
            <li>Beat every round to win. XP is awarded at the end, win or lose.</li>
          </ul>
          <label htmlFor="tb-subject" style={{ fontWeight: 700, display: 'block', margin: '14px 0 6px' }}>
            Choose a subject
          </label>
          <select
            id="tb-subject"
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
          <p style={{ color: 'var(--muted)' }}>
            {bankCount} playable questions available{bankCount < 12 ? ' — rounds will be shorter than usual.' : '.'}
          </p>
          {bankCount < 3 ? (
            <Empty
              title="Not enough questions"
              body={`"${subjectName}" only has ${bankCount} playable questions (need at least 3). Please pick another subject.`}
            />
          ) : (
            <button className="btn btn-primary" onClick={start} style={{ minHeight: 48, marginTop: 8 }}>
              ⚔️ Start battle
            </button>
          )}
        </Card>
      </div>
    );
  }

  if (phase === 'victory' || phase === 'defeat') {
    const won = phase === 'victory';
    return (
      <div>
        <PageHeader
          title={won ? '🏆 Victory!' : '💀 Defeat'}
          sub={won ? `You defeated every boss in ${subjectName}.` : `The boss stopped you in round ${roundIdx + 1} of ${rounds.length}.`}
        />
        <Card style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: '3rem' }}>{won ? '🏆' : '💀'}</div>
          <h2 style={{ margin: '10px 0 4px' }}>
            {won ? 'All bosses beaten!' : `Defeated in round ${roundIdx + 1}`}
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            {subjectName} · {correctTotal}/{answeredTotal} correct ({accuracy}%) · +{endXp} XP
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
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

  if (!current) {
    return (
      <div>
        <PageHeader title="Topic Boss" sub="Revision boss battle over several rounds." />
        <Empty title="Run fizzled out" body="No questions could be loaded for this run. Please try another subject." action={<button className="btn btn-ghost" onClick={() => setPhase('setup')}>Back to setup</button>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Topic Boss" sub={`${subjectName} · Round ${roundIdx + 1} of ${rounds.length}`} />
      <Card style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', lineHeight: 1 }} role="img" aria-label="Boss">
          {bossFace(bossRemaining, phase)}
        </div>
        <strong>
          {BOSS_NAMES[roundIdx % BOSS_NAMES.length]} — Round {roundIdx + 1}
        </strong>
        <div style={{ marginTop: 8 }}>
          <ProgressBar pct={bossRemaining} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.9rem' }}>
          <span>
            Boss HP: {roundLen - hits}/{roundLen}
          </span>
          <span aria-label={`${hearts} hearts remaining`}>
            {'❤️'.repeat(hearts)}
            {'🖤'.repeat(Math.max(0, 3 - hearts))}
          </span>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span className="badge">
            Question {qIdx + 1} / {roundLen}
          </span>
          <span className="badge">{current.difficulty}</span>
          <span className="badge">
            Score {correctTotal}/{answeredTotal}
          </span>
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
          {!revealed ? (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 14, minHeight: 48 }}
              disabled={given.trim() === ''}
            >
              ⚔️ Attack!
            </button>
          ) : null}
        </form>

        {revealed && (
          <div
            aria-live="polite"
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: wasCorrect ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)',
              border: `1px solid ${wasCorrect ? 'var(--good)' : 'var(--bad)'}`,
            }}
          >
            <strong>
              {wasCorrect ? `💥 Direct hit! The boss reels ${bossFace(bossRemaining, phase)}` : `💔 Ouch! You lose a heart — answer: ${accepted}`}
            </strong>
            {hearts <= 0 && !wasCorrect && <div>That was your last heart…</div>}
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>{current.explanation}</div>
            <button className="btn btn-primary" onClick={next} style={{ marginTop: 10, minHeight: 48 }}>
              {hearts <= 0 ? 'See results' : qIdx + 1 >= roundLen ? (roundIdx + 1 >= rounds.length ? 'Finish battle!' : 'Next round →') : 'Next →'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
