import subjectsRaw from '../data/subjects.json';
import topicsRaw from '../data/topics.json';
import questionsRaw from '../data/questions.json';
import sourcesRaw from '../data/sources.json';
import type { Question, Subject, Topic } from './types';

export const SUBJECTS = subjectsRaw as Subject[];
export const TOPICS = topicsRaw as Topic[];
export const QUESTIONS = questionsRaw as Question[];
export const SOURCES = sourcesRaw as { overview: string; pdfStatus: string; subjectVerification: string };

export const subjectById = (id: string): Subject | undefined => SUBJECTS.find((s) => s.id === id);

export function topicsForSubject(subjectId: string, year: 10 | 11 | null): Topic[] {
  return TOPICS.filter((t) => t.subject === subjectId && (year == null || t.year === year));
}

export function questionsFor(subjectId: string | null, topicId?: string | null, year?: 10 | 11 | null): Question[] {
  let pool = QUESTIONS;
  if (subjectId) pool = pool.filter((q) => q.subject === subjectId);
  if (topicId) {
    const tagged = pool.filter((q) => q.topic === topicId);
    if (tagged.length > 0) pool = tagged;
  }
  if (year) pool = pool.filter((q) => q.years.includes(year));
  return pool;
}

/** Auto-generated revision notes per topic: key-point checklists derived from subtopics (supplementary). */
export interface StudyNotes {
  summary: string;
  keyPoints: string[];
  checklist: string[];
  mistakes: string[];
}

export function notesForTopic(topic: Topic): StudyNotes {
  return {
    summary: `${topic.title} — work through each subtopic, say it back in your own words, then test yourself.`,
    keyPoints: topic.subtopics.map((s) => s),
    checklist: [
      `Define the key terms in ${topic.title}.`,
      'Make one flashcard per subtopic.',
      'Attempt 5+ practice questions without notes.',
      'Revisit mistakes after 2 days (spaced repetition).',
    ],
    mistakes: [
      'Reading notes without testing yourself.',
      'Skipping the subtopics you find hardest.',
      'Leaving exam-style practice until the last minute.',
    ],
  };
}

export function verificationLabel(t: Topic): string {
  switch (t.verification) {
    case 'verified': return 'School-confirmed';
    case 'partially_verified': return 'Subject confirmed · detail supplementary';
    case 'supplementary': return 'Supplementary';
    case 'user': return 'My topic';
    default: return 'Unavailable';
  }
}
