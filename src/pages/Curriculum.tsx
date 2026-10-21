import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SOURCES, SUBJECTS, TOPICS, subjectById, topicById } from '../lib/content';
import { useStore } from '../lib/store';
import { Badge, Card, PageHeader } from '../components/ui';
import type { Topic } from '../lib/types';

export default function Curriculum() {
  const { store } = useStore();
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [search, setSearch] = useState('');

  const topics: Topic[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TOPICS.filter((t) => {
      if (subjectFilter !== 'all' && t.subject !== subjectFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.subtopics.some((s) => s.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [subjectFilter, search]);

  const statusOf = (t: Topic) => store.topicProgress[t.id]?.status ?? 'not-started';

  return (
    <div>
      <PageHeader
        title="Curriculum"
        sub={`${TOPICS.length} topics across ${SUBJECTS.length} subjects — browsable in curriculum order.`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-duo-muted" />
          <input
            className="input pl-9"
            placeholder="Search topics or subtopics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select className="input sm:w-56" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="all">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {topics.length === 0 ? (
        <Card className="text-center text-sm font-bold text-duo-muted">
          Nothing matches “{search}” — try a different word.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((t) => {
            const subject = subjectById(t.subject);
            const st = statusOf(t);
            const playable = st === 'mastered' || firstUnlocked(t.id);
            return (
              <Card key={t.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase" style={{ color: subject?.color }}>
                      {subject?.name} · Year {t.year}
                    </span>
                    <Badge style={st === 'mastered' ? { color: '#58a700', borderColor: '#58cc02' } : st === 'learning' ? { color: '#1899d6', borderColor: '#1cb0f6' } : undefined}>
                      {st === 'not-started' ? 'not started' : st}
                    </Badge>
                  </div>
                  <div className="truncate font-black">{t.title}</div>
                  <div className="truncate text-xs font-bold text-duo-muted">{t.subtopics.join(' · ')}</div>
                </div>
                {playable ? (
                  <Link to={`/lesson/${t.id}`} className="btn btn-primary btn-sm">
                    Study
                  </Link>
                ) : (
                  <Badge>locked</Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sources / honesty section */}
      <Card className="mt-6">
        <h3 className="font-black">Where this content comes from</h3>
        <ul className="mt-2 flex flex-col gap-2">
          <li className="text-sm font-bold">
            <span className="font-black">Curriculum overview</span> — {SOURCES.overview}{' '}
            <Badge style={{ color: '#b45309', borderColor: '#ffc800' }}>partly verified</Badge>
          </li>
          <li className="text-sm font-bold">
            <span className="font-black">Verification status</span> — {SOURCES.subjectVerification}
          </li>
          <li className="text-sm font-bold">
            <span className="font-black">Source PDF</span> — {SOURCES.pdfStatus}
          </li>
          {SOURCES.entries.map((s) => (
            <li key={s.label} className="text-sm font-bold">
              <span className="font-black">{s.label}</span> — {s.note}{' '}
              {s.verified ? (
                <Badge style={{ color: '#58a700', borderColor: '#58cc02' }}>documented</Badge>
              ) : (
                <Badge style={{ color: '#b45309', borderColor: '#ffc800' }}>supplementary</Badge>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs font-bold text-duo-muted">
          Full provenance notes live in docs/curriculum-audit.md in the repository. We don't claim
          school-sourced material we can't verify.
        </p>
      </Card>
    </div>
  );

  /** Path unlock rule: topic is open if it's first, or the previous is mastered. */
  function firstUnlocked(topicId: string): boolean {
    const idx = TOPICS.findIndex((t) => t.id === topicId);
    if (idx <= 0) return true;
    const prev = TOPICS[idx - 1];
    const cur = topicById(topicId);
    if (!cur || prev.subject !== cur.subject) return true;
    return store.topicProgress[prev.id]?.status === 'mastered';
  }
}
