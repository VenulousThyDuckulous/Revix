import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SUBJECTS, TOPICS, notesForTopic, subjectById } from '../lib/content';
import { useStore, uid } from '../lib/store';
import { BackLink, Card, PageHeader, VerifyBadge } from '../components/ui';
import type { Topic, TopicStatus } from '../lib/types';

const STATUS: TopicStatus[] = ['not-started', 'learning', 'mastered'];

export default function Curriculum() {
  const { store, setTopicStatus, addUserTopic, removeUserTopic, addActivity } = useStore();
  const [params, setParams] = useSearchParams();
  const [year, setYear] = useState<'all' | '10' | '11'>(store.profile.year ? String(store.profile.year) as '10' | '11' : 'all');
  const [subject, setSubject] = useState('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('topic'));
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(store.profile.subjects[0] ?? 'english');

  const allTopics: Topic[] = useMemo(() => [...store.userTopics, ...TOPICS], [store.userTopics]);

  const filtered = allTopics.filter((t) => {
    if (year !== 'all' && t.year !== Number(year)) return false;
    if (subject !== 'all' && t.subject !== subject) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(t.title.toLowerCase().includes(s) || t.subtopics.some((x) => x.toLowerCase().includes(s)))) return false;
    }
    return true;
  });

  const open = openId ? allTopics.find((t) => t.id === openId) ?? null : null;

  const markMastered = (t: Topic) => {
    setTopicStatus(t.id, 'mastered');
    addActivity({ kind: 'topic', subjectId: t.subject, topicId: t.id, detail: `Mastered ${t.title}`, xp: 25, eventKey: `master-${t.id}` });
  };

  return (
    <div>
      <PageHeader title="My Curriculum" sub="Year → Subject → Topic → Subtopic. School-sourced entries are badged; supplementary and personal topics are clearly labelled." />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <select className="select" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(e.target.value as never)} aria-label="Filter by year">
          <option value="all">All years</option>
          <option value="10">Year 10</option>
          <option value="11">Year 11</option>
        </select>
        <select className="select" style={{ width: 'auto' }} value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filter by subject">
          <option value="all">All subjects</option>
          {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Search topics…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search topics" />
      </div>

      {!open && (
        <p style={{ color: 'var(--muted)' }}>{filtered.length} topics {subject !== 'all' && `in ${subjectById(subject)?.name} `}(exam board: unknown unless shown — never guessed).</p>
      )}

      {open ? (
        <div>
          <BackLink to="/curriculum" label="All topics" />
          <TopicDetail
            topic={open}
            onBack={() => { setOpenId(null); setParams({}); }}
            onMaster={() => markMastered(open)}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.slice(0, 200).map((t) => {
            const prog = store.topicProgress[t.id];
            const st = prog?.status ?? 'not-started';
            return (
              <div key={t.id} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <button onClick={() => { setOpenId(t.id); setParams({ topic: t.id }); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontSize: '1rem', padding: 0 }}>
                    {t.title}
                  </button>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {subjectById(t.subject)?.name} · Year {t.year} {t.tier && t.tier !== 'all' ? `· ${t.tier}` : ''}
                  </div>
                </div>
                <VerifyBadge topic={t} />
                {prog?.difficult && <span className="badge">⚠️ difficult</span>}
                <select
                  className="select" style={{ width: 'auto' }} value={st}
                  onChange={(e) => (e.target.value === 'mastered' ? markMastered(t) : setTopicStatus(t.id, e.target.value as TopicStatus))}
                  aria-label={`Status for ${t.title}`}
                >
                  {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            );
          })}
          {filtered.length > 200 && <p style={{ color: 'var(--muted)' }}>Showing first 200 of {filtered.length} — narrow the filters.</p>}
          {filtered.length === 0 && <Card><p style={{ color: 'var(--muted)' }}>No topics match. Try clearing the search or add your own below.</p></Card>}
        </div>
      )}

      <Card style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>➕ Add my own topic</h3>
        <p style={{ color: 'var(--muted)' }}>Personal topics are labelled “My topic” — never presented as school content.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 280 }} placeholder="Topic title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <select className="select" style={{ width: 'auto' }} value={newSubject} onChange={(e) => setNewSubject(e.target.value)}>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!newTitle.trim()} onClick={() => {
            addUserTopic({ id: `user-${uid()}`, subject: newSubject, year: store.profile.year ?? 10, term: null, title: newTitle.trim(), subtopics: [], tier: 'all', practical: null, examBoard: null });
            setNewTitle('');
          }}>Add topic</button>
        </div>
        {store.userTopics.length > 0 && (
          <ul>
            {store.userTopics.map((t) => (
              <li key={t.id}>{t.title} <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => removeUserTopic(t.id)}>Remove</button></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TopicDetail({ topic, onBack, onMaster }: { topic: Topic; onBack: () => void; onMaster: () => void }) {
  const { store, setTopicMeta } = useStore();
  const prog = store.topicProgress[topic.id];
  const notes = notesForTopic(topic);
  const [note, setNote] = useState(prog?.notes ?? '');
  const [reminder, setReminder] = useState('');

  const subj = subjectById(topic.subject);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 style={{ margin: 0, flex: 1 }}>{topic.title}</h2>
          <VerifyBadge topic={topic} />
        </div>
        <p style={{ color: 'var(--muted)' }}>
          {subj?.name} · Year {topic.year}
          {topic.examBoard ? ` · ${topic.examBoard}` : ' · Exam board unknown'}
          {topic.tier && topic.tier !== 'all' ? ` · ${topic.tier} tier` : ''}
        </p>
        {topic.practical && <p>🧪 Practical: {topic.practical}</p>}
        <h4>Subtopics</h4>
        <ul>{topic.subtopics.map((s) => <li key={s}>{s}</li>)}</ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/quizzes?subject=${topic.subject}&topic=${topic.id}`} className="btn btn-primary">Quiz this topic</Link>
          <Link to={`/flashcards?subject=${topic.subject}`} className="btn btn-ghost">Flashcards</Link>
          <button className="btn btn-ghost" onClick={onMaster}>Mark mastered (+25 XP)</button>
          <button className="btn btn-ghost" onClick={() => setTopicMeta(topic.id, { difficult: !(prog?.difficult) })}>
            {prog?.difficult ? 'Unflag difficult' : '⚠️ Flag as difficult'}
          </button>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>📝 Revision notes <span className="badge">Supplementary</span></h3>
        <p>{notes.summary}</p>
        <h4>Key points</h4>
        <ul>{notes.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
        <h4>Checklist</h4>
        <ul>{notes.checklist.map((k) => <li key={k}>{k}</li>)}</ul>
        <h4>Common mistakes</h4>
        <ul>{notes.mistakes.map((k) => <li key={k}>{k}</li>)}</ul>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>📌 My notes & reminders</h3>
        <textarea className="textarea" rows={3} placeholder="Personal notes for this topic…" value={note}
          onChange={(e) => setNote(e.target.value)} onBlur={() => setTopicMeta(topic.id, { notes: note })} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 300 }} placeholder="Add a reminder…" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          <button className="btn btn-ghost" disabled={!reminder.trim()} onClick={() => {
            setTopicMeta(topic.id, { reminders: [...(prog?.reminders ?? []), reminder.trim()] });
            setReminder('');
          }}>Add</button>
        </div>
        {(prog?.reminders ?? []).length > 0 && (
          <ul>{prog!.reminders.map((r, i) => (
            <li key={i}>{r} <button className="btn btn-ghost" style={{ padding: '0 6px' }}
              onClick={() => setTopicMeta(topic.id, { reminders: prog!.reminders.filter((_, j) => j !== i) })} aria-label={`Delete reminder ${r}`}>✕</button></li>
          ))}</ul>
        )}
        <button className="btn btn-ghost" onClick={onBack}>← Back to topics</button>
      </Card>
    </div>
  );
}
