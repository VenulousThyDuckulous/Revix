import { Link, useParams } from 'react-router-dom';
import { QUESTIONS, notesForTopic, subjectById, topicsForSubject } from '../lib/content';
import { useStore } from '../lib/store';
import { BackLink, Card, Empty, PageHeader, ProgressBar } from '../components/ui';

export default function SubjectDetail() {
  const { id } = useParams();
  const { store } = useStore();
  const subj = subjectById(id ?? '');
  if (!subj) return <Empty title="Subject not found" body="That subject doesn't exist." action={<Link to="/subjects" className="btn btn-ghost">All subjects</Link>} />;

  const year = store.profile.year;
  const topics = topicsForSubject(subj.id, year);
  const done = topics.filter((t) => store.topicProgress[t.id]?.status === 'mastered').length;
  const qs = QUESTIONS.filter((q) => q.subject === subj.id);
  const attempts = store.activities.filter((a) => a.subjectId === subj.id && a.total);
  const correct = attempts.reduce((s, a) => s + a.correct, 0);
  const total = attempts.reduce((s, a) => s + a.total, 0);
  const weak = attempts.length >= 2 && total > 0 && correct / total < 0.6;

  const approach = approachFor(subj.id);

  return (
    <div>
      <BackLink to="/subjects" label="Subjects" />
      <PageHeader title={subj.name} sub={`Years ${subj.years.join(' & ')} · ${topics.length} topics${year ? ` (Year ${year})` : ''} · Exam board unknown · ${qs.length} practice questions`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
        <Card><strong>{done}/{topics.length}</strong><div style={{ color: 'var(--muted)' }}>topics mastered</div><ProgressBar pct={topics.length ? done / topics.length : 0} /></Card>
        <Card><strong>{total ? `${Math.round((correct / total) * 100)}%` : '—'}</strong><div style={{ color: 'var(--muted)' }}>quiz accuracy ({attempts.length} attempts)</div></Card>
        <Card><strong>{qs.length}</strong><div style={{ color: 'var(--muted)' }}>practice questions</div></Card>
      </div>

      {weak && <Card style={{ borderColor: 'var(--warn)' }}>⚠️ This looks like a weak area (under 60%). Try flashcards first, then a topic quiz.</Card>}

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>📖 How to revise {subj.name}</h3>
        <p>{approach}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/quizzes?subject=${subj.id}`} className="btn btn-primary">Quiz me</Link>
          <Link to={`/flashcards?subject=${subj.id}`} className="btn btn-ghost">Flashcards</Link>
          <Link to={`/games`} className="btn btn-ghost">Games</Link>
          <Link to={`/exam?subject=${subj.id}`} className="btn btn-ghost">Exam practice</Link>
          <Link to="/curriculum" className="btn btn-ghost">Browse curriculum</Link>
        </div>
      </Card>

      <h3>Topics</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {topics.map((t) => {
          const st = store.topicProgress[t.id]?.status ?? 'not-started';
          const n = notesForTopic(t);
          return (
            <Card key={t.id} style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Link to={`/curriculum?topic=${t.id}`} style={{ fontWeight: 700, color: 'var(--text)' }}>{t.title}</Link>
                <span className="badge">{st}</span>
                <span className="badge">Supplementary</span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{n.keyPoints.slice(0, 3).join(' · ')}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function approachFor(subjectId: string): string {
  const map: Record<string, string> = {
    english: 'Learn literary concepts and writing techniques. Collect sourced quotations, analyse methods, and practise planning essays under time.',
    maths: 'Practise step-by-step problems. Memorise formulae by using them, check every answer, and redo mistakes until the method is automatic.',
    'combined-science': 'Master concepts, definitions, processes and equations. Practise required-practical write-ups and 6-mark explanations.',
    biology: 'Learn processes (osmosis, photosynthesis, respiration) as sequences. Use diagrams and precise vocabulary in longer answers.',
    chemistry: 'Practise calculations (moles, reacting masses) and learn reactions as patterns. Required practicals often earn easy marks.',
    physics: 'Learn equations and practise rearranging them. Show every step in calculations and link each answer to the physics concept.',
    french: 'Build vocabulary in themed sets, practise translations both ways, and learn high-frequency grammar (tenses, agreements) with examples.',
    german: 'Build vocabulary in themed sets, practise translations both ways, and master cases and word order with short model sentences.',
    spanish: 'Build vocabulary in themed sets, practise translations both ways, and master tenses with short model sentences.',
    geography: 'Learn processes and case studies with facts and figures. Practise data-interpretation and 9-mark evaluative answers.',
    history: 'Build timelines of causes, events and consequences. Practise source analysis (provenance, tone, content) and essay structure.',
    rs: 'Learn beliefs, teachings and contrasting views per topic. Practise 12-mark evaluations with evidence on both sides.',
    sociology: 'Learn key studies, concepts and methods. Practise applying items and evaluating sociological explanations.',
    art: 'Record techniques, artists and vocabulary. Plan projects, annotate development, and reflect on what worked.',
    'computer-science': 'Learn terminology precisely, trace algorithms by hand, practise binary/hex conversions, and write small programs regularly.',
    'food-nutrition': 'Learn nutrients, functions and food science. Practise experiment write-ups and high-level evaluation.',
    'hospitality-catering': 'Learn hygiene, safety and service vocabulary. Practise scenario questions with justified recommendations.',
    imedia: 'Learn pre-production documents and software techniques. Plan projects against the brief and review against requirements.',
    photography: 'Learn composition, lighting and camera vocabulary. Plan shoots, annotate contact sheets, and evaluate outcomes.',
    'design-technology': 'Learn materials, processes and maths skills. Practise iterative design and evaluation against specifications.',
    drama: 'Learn practitioner techniques and staging vocabulary. Plan performances and reflect in writing with precise terminology.',
    music: 'Learn theory, vocabulary and listening skills. Practise describing musical elements with short timed examples.',
    'gcse-pe': 'Learn anatomy, movement analysis and training principles. Link every answer to sporting examples and data.',
    'btec-sport': 'Learn assignment criteria vocabulary. Apply theory to your own performance with specific evidence.',
    'business-studies': 'Learn concepts plus calculations (profit, break-even, cash flow). Practise scenario questions with chains of reasoning.',
    'big-picture': 'Develop study skills, careers awareness and reflection. Set goals, review progress, and record next steps.',
  };
  return map[subjectId] ?? 'Work through each topic, test yourself regularly, and revisit mistakes.';
}
