import { describe, expect, it } from 'vitest';
import { QUESTIONS, SOURCES, SUBJECTS, TOPICS, notesForTopic, questionsForTopic, subjectById, topicsForSubject } from './content';

describe('curriculum data integrity', () => {
  it('has subjects, topics and questions', () => {
    expect(SUBJECTS.length).toBeGreaterThanOrEqual(20);
    expect(TOPICS.length).toBeGreaterThanOrEqual(200);
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(150);
  });

  it('subject ids are unique', () => {
    const ids = SUBJECTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('topic ids are unique and reference a real subject', () => {
    const ids = TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOPICS) {
      expect(subjectById(t.subject)).not.toBeNull();
      expect([10, 11]).toContain(t.year);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.subtopics.length).toBeGreaterThan(0);
    }
  });

  it('question ids are unique and reference a real subject', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      expect(subjectById(q.subject)).not.toBeNull();
    }
  });

  it('every subject has practice questions so lessons never dead-end', () => {
    for (const s of SUBJECTS) {
      const count = QUESTIONS.filter((q) => q.subject === s.id).length;
      expect(count, `${s.id} has no questions`).toBeGreaterThanOrEqual(4);
    }
  });

  it('mcq questions have options containing the answer', () => {
    const mcqs = QUESTIONS.filter((q) => q.type === 'mcq');
    expect(mcqs.length).toBeGreaterThan(30);
    for (const q of mcqs) {
      expect(q.options, q.id).toBeDefined();
      expect(q.options!.length).toBeGreaterThanOrEqual(2);
      expect(q.options!, q.id).toContain(String(q.answer));
    }
  });

  it('only uses known question types', () => {
    const known = new Set(['mcq', 'true_false', 'short', 'fill_blank', 'numeric', 'matching']);
    for (const q of QUESTIONS) expect(known.has(q.type), `${q.id}: ${q.type}`).toBe(true);
  });

  it('documents content provenance honestly', () => {
    expect(SOURCES.overview.length).toBeGreaterThan(0);
    expect(SOURCES.pdfStatus.length).toBeGreaterThan(0);
    expect(SOURCES.subjectVerification.length).toBeGreaterThan(0);
    for (const s of SOURCES.entries) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.note.length).toBeGreaterThan(0);
    }
  });
});

describe('content helpers', () => {
  it('groups topics by subject in curriculum order', () => {
    const maths = topicsForSubject('maths');
    expect(maths.length).toBeGreaterThan(0);
    expect(maths.every((t) => t.subject === 'maths')).toBe(true);
  });

  it('builds honest lesson notes from the topic record', () => {
    const topic = topicsForSubject('maths')[0];
    const notes = notesForTopic(topic);
    expect(notes.summary).toContain(topic.title);
    expect(notes.keyPoints).toEqual(topic.subtopics);
    expect(notes.mistakes.length).toBeGreaterThan(0);
    // Notes must not invent content beyond the recorded subtopics.
    expect(notes.keyPoints.every((k) => topic.subtopics.includes(k))).toBe(true);
  });

  it('questionsForTopic returns [] for untbanked topics (honest, not fabricated)', () => {
    expect(questionsForTopic('no-such-topic')).toEqual([]);
  });
});
