import { Link } from 'react-router-dom';
import { SUBJECTS } from '../lib/content';
import { useStore } from '../lib/store';
import { Card, PageHeader } from '../components/ui';

export default function Subjects() {
  const { store } = useStore();
  return (
    <div>
      <PageHeader title="Subjects" sub="Every subject from the school overview. Starred subjects are the ones you study." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {SUBJECTS.map((s) => {
          const mine = store.profile.subjects.includes(s.id);
          return (
            <Link key={s.id} to={`/subjects/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card style={{ borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{mine ? '⭐ ' : ''}{s.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Years {s.years.join(' & ')} · {s.blurb}</div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
