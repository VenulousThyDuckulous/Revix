import { describe, expect, it } from 'vitest';
import { QUESTIONS, SUBJECTS, TOPICS } from './content';
import { checkAnswer } from './quiz';

describe('curriculum data', () => {
  it('covers all required subjects for both years', () => {
    const required = [
      'english', 'maths', 'combined-science', 'biology', 'chemistry', 'physics',
      'french', 'german', 'spanish', 'geography', 'history', 'rs',
      'sociology', 'art', 'computer-science', 'food-nutrition', 'hospitality-catering',
      'imedia', 'photography', 'design-technology', 'drama', 'music',
      'gcse-pe', 'btec-sport', 'business-studies', 'big-picture',
    ];
    for (const id of required) {
      expect(SUBJECTS.some((s) => s.id === id), `missing subject ${id}`).toBe(true);
      expect(TOPICS.some((t) => t.subject === id && t.year === 10), `missing Y10 ${id}`).toBe(true);
      expect(TOPICS.some((t) => t.subject === id && t.year === 11), `missing Y11 ${id}`).toBe(true);
    }
    // GCSE PE and BTEC Sport stay separate; combined science separate from triple
    expect(SUBJECTS.filter((s) => ['gcse-pe', 'btec-sport'].includes(s.id))).toHaveLength(2);
  });
  it('never claims an exam board (unknown, not guessed)', () => {
    for (const t of TOPICS) {
      expect(t.examBoard).toBeNull();
    }
  });
  it('has unique topic ids and honest verification flags', () => {
    const ids = TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOPICS) {
      expect(['verified', 'partially_verified', 'supplementary', 'unavailable', 'user']).toContain(t.verification);
    }
  });
  it('question bank validates against the real checker', () => {
    expect(QUESTIONS.length).toBeGreaterThan(100);
    for (const q of QUESTIONS) {
      expect(SUBJECTS.some((s) => s.id === q.subject), `bad subject ${q.subject}`).toBe(true);
      if (q.type === 'mcq') {
        expect(q.options).toHaveLength(4);
        expect(q.options).toContain(q.answer as string);
      }
      // every stored answer must validate as correct (self-consistency)
      const given = q.type === 'matching'
        ? Object.fromEntries(((q.pairs ?? q.answer) as string[][]).map(([t, m]) => [t, m]))
        : q.type === 'true_false' ? q.answer : q.answer;
      expect(checkAnswer(q, given).correct, `question ${q.id} fails self-check`).toBe(true);
    }
  });
  it('every subject has at least one question', () => {
    for (const s of SUBJECTS) {
      expect(QUESTIONS.some((q) => q.subject === s.id), `no questions for ${s.id}`).toBe(true);
    }
  });
});
