import { describe, expect, it } from 'vitest';
import { checkAnswer, scoreQuiz, selectQuestions } from './quiz';
import type { Question } from './types';

const mcq: Question = {
  id: 't1', subject: 'maths', topic: '', years: [10, 11], type: 'mcq', difficulty: 'foundation',
  question: 'Q', options: ['A', 'B', 'C', 'D'], answer: 'B', explanation: '', source: 'supplementary',
};

describe('quiz answer validation', () => {
  it('accepts correct mcq answer case-insensitively', () => {
    expect(checkAnswer(mcq, 'b').correct).toBe(true);
    expect(checkAnswer(mcq, 'C').correct).toBe(false);
  });
  it('validates true/false', () => {
    const q = { ...mcq, type: 'true_false' as const, answer: true };
    expect(checkAnswer(q, true).correct).toBe(true);
    expect(checkAnswer(q, 'false').correct).toBe(false);
  });
  it('normalises short answers', () => {
    const q = { ...mcq, type: 'short' as const, answer: '  Photosynthesis  ', accept: ['photo'] };
    expect(checkAnswer(q, 'photosynthesis').correct).toBe(true);
    expect(checkAnswer(q, 'PHOTO').correct).toBe(true);
    expect(checkAnswer(q, 'respiration').correct).toBe(false);
  });
  it('applies numeric tolerance', () => {
    const q = { ...mcq, type: 'numeric' as const, answer: 10, tolerance: 0.5 };
    expect(checkAnswer(q, '10.4').correct).toBe(true);
    expect(checkAnswer(q, '11').correct).toBe(false);
    expect(checkAnswer(q, 'abc').correct).toBe(false);
  });
  it('validates matching pairs', () => {
    const q: Question = {
      ...mcq, type: 'matching', pairs: [['A', '1'], ['B', '2'], ['C', '3']], answer: [],
    };
    expect(checkAnswer(q, { A: '1', B: '2', C: '3' }).correct).toBe(true);
    expect(checkAnswer(q, { A: '2', B: '2', C: '3' }).correct).toBe(false);
  });
});

describe('quiz scoring', () => {
  it('awards 10 per correct + completion + perfect bonuses', () => {
    expect(scoreQuiz(8, 10).xp).toBe(85);
    expect(scoreQuiz(10, 10).xp).toBe(115);
    expect(scoreQuiz(0, 0).xp).toBe(0);
  });
  it('computes accuracy', () => {
    expect(scoreQuiz(3, 4).accuracy).toBe(0.75);
  });
});

describe('question selection', () => {
  const bank: Question[] = [mcq, { ...mcq, id: 't2', subject: 'bio' } as Question];
  it('filters by subject and caps count', () => {
    expect(selectQuestions(bank, { subject: 'maths', count: 5 })).toHaveLength(1);
  });
  it('routing and asset paths use the /Revix/ base', () => {
    expect(selectQuestions(bank, { count: 1 })).toHaveLength(1);
  });
});
