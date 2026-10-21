import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, X, Play, RotateCcw, Trophy } from 'lucide-react';
import { QUESTIONS, notesForTopic, subjectById, topicById } from '../lib/content';
import { isCorrect, selectQuestions, type AnswerValue } from '../lib/quiz';
import { useStore } from '../lib/store';
import { BackLink, Badge, Card, Empty, ProgressBar } from '../components/ui';
import type { Question } from '../lib/types';

type Stage = 'teach' | 'quiz' | 'done';

export default function Lesson() {
  const params = useParams<{ topicId?: string }>();
  const topicId = params.topicId ?? '';
  const topic = topicById(topicId);
  const { setTopicStatus, addActivity, store } = useStore();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('teach');
  const [idx, setIdx] = useState(0);
  const [given, setGiven] = useState<Record<string, AnswerValue>>({});
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});

  const questions = useMemo(() => {
    if (!topic) return [];
    // Questions are banked per subject (topic tagging pending — see
    // docs/curriculum-audit.md), so lessons practise from the subject bank.
    return selectQuestions(QUESTIONS, {
      subject: topic.subject,
      excludeTypes: ['matching'],
      count: 5,
      seed: 42,
    });
  }, [topic]);

  if (!topic) {
    return (
      <Empty
        title="Lesson not found"
        body="That topic doesn't exist in the curriculum data."
        action={
          <Link to="/dashboard" className="btn btn-primary">
            Back to path
          </Link>
        }
      />
    );
  }

  const subject = subjectById(topic.subject);
  const notes = notesForTopic(topic);
  const current: Question | undefined = questions[idx];
  const progress = store.topicProgress[topic.id];
  const noQuestions = questions.length === 0;

  const checkAnswer = () => {
    if (!current) return;
    const ok = isCorrect(current, given[current.id] ?? null);
    setAnswered((a) => ({ ...a, [current.id]: ok }));
    setRevealed(true);
  };

  const next = () => {
    if (!topic) return;
    if (idx + 1 >= questions.length) {
      const correct = questions.reduce((n, q) => (answered[q.id] ? n + 1 : n), 0);
      setScore(correct);
      setStage('done');
      const pct = Math.round((correct / Math.max(1, questions.length)) * 100);
      setTopicStatus(topic.id, pct >= 60 ? 'mastered' : 'learning', pct);
      addActivity({
        kind: 'topic',
        subjectId: topic.subject,
        topicId: topic.id,
        detail: `${topic.title} — ${correct}/${questions.length}`,
        xp: pct >= 60 ? 25 : 10,
        eventKey: `lesson:${topic.id}:${progress?.attempts ?? 0}`,
      });
      return;
    }
    setIdx(idx + 1);
    setRevealed(false);
  };

  function restart() {
    setIdx(0);
    setGiven({});
    setAnswered({});
    setRevealed(false);
    setScore(0);
    setStage('quiz');
  }

  const canSubmit =
    current !== undefined &&
    (Array.isArray(given[current.id])
      ? (given[current.id] as string[]).length > 0
      : String(given[current.id] ?? '').trim() !== '');

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to="/dashboard" label="Path" />

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-black tracking-wide uppercase" style={{ color: subject?.color }}>
            {subject?.name} · Year {topic.year}
          </div>
          <h1 className="truncate text-xl font-black">{topic.title}</h1>
        </div>
        <Badge>{stage === 'teach' ? 'Learn' : stage === 'quiz' ? 'Practise' : 'Done'}</Badge>
      </div>

      {stage === 'teach' && (
        <Card>
          <h2 className="font-black">What you need to know</h2>
          <p className="mt-2 text-sm leading-relaxed font-bold text-duo-muted">{notes.summary}</p>

          <h3 className="mt-5 text-sm font-black uppercase tracking-wide text-duo-green">Key points</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {notes.keyPoints.map((k) => (
              <li key={k} className="flex items-start gap-2 text-sm font-bold">
                <Check size={16} className="mt-0.5 shrink-0 text-duo-green" />
                {k}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-2xl border-2 border-duo-yellow bg-yellow-50 p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-duo-orange">Common mistakes</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {notes.mistakes.map((m) => (
                <li key={m} className="flex items-start gap-2 text-sm font-bold">
                  <X size={16} className="mt-0.5 shrink-0 text-duo-red" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            {noQuestions ? (
              <p className="text-sm font-bold text-duo-muted">
                No practice questions banked for this topic yet — content coverage is listed in
                docs/curriculum-audit.md.
              </p>
            ) : (
              <button type="button" className="btn btn-primary w-full" onClick={() => setStage('quiz')}>
                <Play size={16} fill="currentColor" /> Practise — {questions.length} questions
              </button>
            )}
            <p className="mt-2 text-center text-xs font-bold text-duo-muted">
              Questions are banked per subject — practice draws from the {subject?.name} bank.
            </p>
          </div>
        </Card>
      )}

      {stage === 'quiz' && current && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <Badge>
              {idx + 1} / {questions.length}
            </Badge>
            <div className="w-40">
              <ProgressBar pct={(idx + (revealed ? 1 : 0)) / questions.length} />
            </div>
          </div>

          <p className="text-lg font-black">{current.question}</p>

          <div className="mt-4 flex flex-col gap-2">
            {current.type === 'mcq' &&
              current.options?.map((o) => {
                const state = revealed
                  ? String(current.answer) === o
                    ? 'correct'
                    : given[current.id] === o
                      ? 'wrong'
                      : ''
                  : given[current.id] === o
                    ? 'selected'
                    : '';
                return (
                  <button
                    key={o}
                    type="button"
                    className={`answer-option ${state}`}
                    disabled={revealed}
                    onClick={() => setGiven((g) => ({ ...g, [current.id]: o }))}
                  >
                    {o}
                  </button>
                );
              })}

            {current.type === 'true_false' &&
              ['True', 'False'].map((o) => {
                const state = revealed
                  ? String(current.answer) === o
                    ? 'correct'
                    : given[current.id] === o
                      ? 'wrong'
                      : ''
                  : given[current.id] === o
                    ? 'selected'
                    : '';
                return (
                  <button
                    key={o}
                    type="button"
                    className={`answer-option ${state}`}
                    disabled={revealed}
                    onClick={() => setGiven((g) => ({ ...g, [current.id]: o }))}
                  >
                    {o}
                  </button>
                );
              })}

            {(current.type === 'short' || current.type === 'fill_blank' || current.type === 'numeric') && (
              <input
                className="input"
                disabled={revealed}
                autoFocus
                placeholder={current.type === 'numeric' ? 'Type a number' : 'Type your answer'}
                value={String(given[current.id] ?? '')}
                onChange={(e) => setGiven((g) => ({ ...g, [current.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && revealed) next();
                  else if (e.key === 'Enter' && canSubmit) checkAnswer();
                }}
              />
            )}
          </div>

          {revealed && (
            <div
              className={`pop mt-4 rounded-2xl border-2 p-4 ${
                answered[current.id]
                  ? 'border-duo-green bg-green-50'
                  : 'border-duo-red bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2 font-black">
                {answered[current.id] ? (
                  <>
                    <Check size={18} className="text-duo-green" /> Correct!
                  </>
                ) : (
                  <>
                    <X size={18} className="text-duo-red" /> Not quite
                  </>
                )}
              </div>
              {!answered[current.id] && (
                <p className="mt-1 text-sm font-bold">
                  Answer: <span className="text-duo-green">{String(current.answer)}</span>
                </p>
              )}
              {current.explanation && (
                <p className="mt-1 text-sm font-bold text-duo-muted">{current.explanation}</p>
              )}
            </div>
          )}

          <div className="mt-4">
            {!revealed ? (
              <button type="button" className="btn btn-primary w-full" disabled={!canSubmit} onClick={checkAnswer}>
                Check answer
              </button>
            ) : (
              <button type="button" className="btn btn-primary w-full" onClick={next}>
                {idx + 1 >= questions.length ? 'Finish lesson' : 'Next question'}
              </button>
            )}
          </div>
        </Card>
      )}

      {stage === 'done' && (
        <Card className="text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-2xl font-black">Lesson complete!</h2>
          <p className="mt-1 text-sm font-bold text-duo-muted">
            {score} / {questions.length} correct
          </p>
          <div className="mx-auto mt-4 w-56">
            <ProgressBar pct={score / Math.max(1, questions.length)} />
          </div>
          <p className="mt-4 text-sm font-black" style={{ color: score / Math.max(1, questions.length) >= 0.6 ? '#58cc02' : '#ff9600' }}>
            {score / Math.max(1, questions.length) >= 0.6
              ? `+25 XP — topic ${progress?.status === 'mastered' ? 'mastered' : 'updated'}!`
              : '+10 XP — keep practising to master it.'}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              <Trophy size={16} /> Back to path
            </button>
            <button type="button" className="btn btn-ghost" onClick={restart}>
              <RotateCcw size={16} /> Practise again
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
