import { Link } from 'react-router-dom';
import { ACHIEVEMENTS, useStore } from '../lib/store';
import { Card, PageHeader } from '../components/ui';

export default function AchievementsPage() {
  const { store } = useStore();
  const unlocked = Object.keys(store.achievements).length;
  return (
    <div>
      <PageHeader title="Achievements" sub={`${unlocked} of ${ACHIEVEMENTS.length} unlocked — every one earned from real activity.`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {ACHIEVEMENTS.map((a) => {
          const at = store.achievements[a.id];
          return (
            <Card key={a.id} style={{ opacity: at ? 1 : 0.65 }}>
              <div style={{ fontSize: '1.8rem' }}>{at ? a.emoji : '🔒'}</div>
              <div style={{ fontWeight: 800 }}>{a.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{a.desc}</div>
              {at && <div style={{ fontSize: '0.8rem', color: 'var(--good)' }}>Unlocked {new Date(at).toLocaleDateString()}</div>}
            </Card>
          );
        })}
      </div>
      <p style={{ color: 'var(--muted)' }}>Missing one? <Link to="/quizzes">Take a quiz</Link> or <Link to="/games">play a game</Link>.</p>
    </div>
  );
}
