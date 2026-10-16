import { Link } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui';

const GAMES = [
  { slug: 'quickfire', name: '⚡ Quickfire', desc: 'As many questions as possible before the timer ends. Streaks earn bonuses.' },
  { slug: 'match-up', name: '🔗 Match-Up', desc: 'Match terms with definitions against the clock.' },
  { slug: 'memory-match', name: '🃏 Memory Match', desc: 'Flip cards to find pairs. Fewest moves wins.' },
  { slug: 'topic-boss', name: '👾 Topic Boss', desc: 'Three-round boss battle — beat the boss before it beats you.' },
  { slug: 'word-scramble', name: '🔤 Word Scramble', desc: 'Unscramble subject vocabulary with definition clues.' },
  { slug: 'exam-rush', name: '⏱ Exam Rush', desc: 'Question sequences under real time pressure.' },
];

export default function GamesHub() {
  return (
    <div>
      <PageHeader title="Revision Games" sub="Six playable games powered by real practice questions. Every result earns XP." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {GAMES.map((g) => (
          <Link key={g.slug} to={`/games/${g.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card>
              <h3 style={{ margin: '0 0 6px' }}>{g.name}</h3>
              <p style={{ color: 'var(--muted)', margin: 0 }}>{g.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
