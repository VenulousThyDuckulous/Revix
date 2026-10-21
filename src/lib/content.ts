import type { Question, Subject, Topic } from './types';
import subjectsJson from '../data/subjects.json';
import topicsJson from '../data/topics.json';
import questionsJson from '../data/questions.json';
import sourcesJson from '../data/sources.json';

export const SUBJECTS = subjectsJson as Subject[];
export const TOPICS = topicsJson as Topic[];
export const QUESTIONS = questionsJson as Question[];
/**
 * Provenance record for the content set — see docs/curriculum-audit.md.
 * `entries` is empty because the source PDF was never machine-readable; we
 * record that honestly rather than inventing citations.
 */
export const SOURCES = sourcesJson as {
  entries: { label: string; note: string; verified: boolean }[];
  overview: string;
  pdfStatus: string;
  subjectVerification: string;
};

export function subjectById(id: string | null | undefined): Subject | null {
  if (!id) return null;
  return SUBJECTS.find((s) => s.id === id) ?? null;
}

export function topicById(id: string | null | undefined): Topic | null {
  if (!id) return null;
  return TOPICS.find((t) => t.id === id) ?? null;
}

export function questionsForTopic(topicId: string): Question[] {
  return QUESTIONS.filter((q) => q.topic === topicId);
}

/** Curriculum order: subjects as listed, topics by year then file order. */
export function topicsForSubject(subjectId: string): Topic[] {
  return TOPICS.filter((t) => t.subject === subjectId);
}

export interface LessonNotes {
  summary: string;
  keyPoints: string[];
  mistakes: string[];
}

/**
 * Lesson notes are derived from the topic record itself — subtopics become
 * key points. We never invent school-sourced detail; see docs/curriculum-audit.md.
 */
export function notesForTopic(topic: Topic): LessonNotes {
  return {
    summary: `${topic.title} — ${topic.subtopics.length} subtopics in the ${topic.term ?? 'full-year'} unit (Year ${topic.year}).`,
    keyPoints: topic.subtopics,
    mistakes: [
      'Answer the question that was asked, not the one you revised.',
      'Use subject terminology, not casual wording.',
      `Check the mark allocation before you write — ${topic.title} questions reward precise points.`,
    ],
  };
}
