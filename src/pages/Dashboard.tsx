import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { SUBJECTS, TOPICS } from '../lib/content';
import { Card, ProgressBar } from '../components/ui';
import { rankFor } from '../lib/ranks';
import { Star } from 'lucide-react';

export default function Dashboard() {
  const { store, totalXp, streak } = useStore();
  const p = store.profile;
  const navigate = useNavigate();
  const myRank = rankFor(totalXp);

  const mastered = Object.entries(store.topicProgress).filter(([, v]) => v.status === 'mastered').length;
  const totalTopics = TOPICS.length;
  const firstUse = store.activities.length === 0;

  // Group topics by subject for the learning path
  const subjectGroups = SUBJECTS.map((s) => {
    const year = p.year;
    const topics = TOPICS.filter((t) => t.subject === s.id && (!year || t.year === year));
    const done = topics.filter((t) => store.topicProgress[t.id]?.status === 'mastered').length;
    return { subject: s, topics, done, total: topics.length };
  }).filter((g) => g.topics.length > 0);

  return (
    <div>
      {/* Duolingo-style header banner */}
      <div className="level-header" style={{ padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, fontSize: '10rem', opacity: 0.15, pointerEvents: 'none' }}>🦉</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800 }}>
              {p.year ? `Year ${p.year}` : 'Revix'}
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
              {p.subjects.length > 0 ? `${p.subjects.length} subjects · ${mastered} topics mastered` : 'Pick your subjects to start learning'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{myRank.rank.emoji} {myRank.rank.name}</div>
            <div style={{ marginTop: 6, width: 180 }}><ProgressBar pct={myRank.progress} /></div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>
              {myRank.next ? `${myRank.xpNeeded} XP to ${myRank.next.name}` : 'Max rank!'}
            </div>
          </div>
        </div>
      </div>

      {firstUse && (
        <Card style={{ textAlign: 'center', padding: '34px 20px', background: '#fffbe6', borderColor: '#f6e05e' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🦉</div>
          <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>Welcome to Revix!</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>
            Tap a topic below to start a lesson. Earn XP, keep your streak, and climb the ranks.
          </p>
          {!p.onboarded && (
            <Link to="/onboarding" className="btn btn-primary">Get started →</Link>
          )}
        </Card>
      )}

      {/* Learning path — Duolingo topic tree */}
      <div style={{ display: 'grid', gap: 16 }}>
        {subjectGroups.map((group) => (
          <div key={group.subject.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: group.subject.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem',
              }}>{group.subject.name.charAt(0)}</div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{group.subject.name}</span>
              <span className="badge" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                {group.done}/{group.total}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {group.topics.map((t) => {
                const prog = store.topicProgress[t.id];
                const st = prog?.status ?? 'not-started';
                const isLocked = st === 'not-started' && group.topics.indexOf(t) > 0 && !group.topics.slice(0, group.topics.indexOf(t)).some((pt) => store.topicProgress[pt.id]?.status === 'mastered');
                const crowns = prog?.status === 'mastered' ? 1 : 0;
                return (
                  <Link
                    key={t.id}
                    to={`/curriculum?topic=${t.id}`}
                    onClick={() => navigate(`/curriculum?topic=${t.id}`)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      textDecoration: 'none', color: 'inherit', minWidth: 100,
                    }}
                  >
                    <div className="topic-node" style={{
                      width: 80, height: 80, borderRadius: 16, background: isLocked ? '#e2e8f0' : 'var(--surface-2)',
                      border: `2px solid ${isLocked ? 'var(--border)' : st === 'mastered' ? 'var(--good)' : 'var(--accent-2)'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: isLocked ? 'not-allowed' : 'pointer', position: 'relative',
                    }}>
                      {crowns > 0 && <div className="crown">👑</div>}
                      <span style={{
                        fontSize: '2rem', opacity: isLocked ? 0.4 : 1,
                      }}>{topicEmoji(t.subject)}</span>
                      {st === 'mastered' && <Star size={14} fill='#f6ad55' style={{ position: 'absolute', top: 4, left: 4 }} />}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: isLocked ? 0.5 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 70 }}>
                      {t.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 20 }}>
        <Card style={{ padding: 16, background: '#fff' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Streak</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{streak} day{streak === 1 ? '' : 's'}</div>
        </Card>
        <Card style={{ padding: 16, background: '#fff' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>XP</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalXp}</div>
        </Card>
        <Card style={{ padding: 16, background: '#fff' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Topics</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{mastered}/{totalTopics}</div>
        </Card>
      </div>
    </div>
  );
}

function topicEmoji(subjectId: string): string {
  const map: Record<string, string> = {
    english: '📖', maths: '🔢', 'combined-science': '🧪', biology: '🌱', chemistry: '⚗️', physics: '⚡',
    french: '🇫🇷', german: '🇩🇪', spanish: '🇪🇸', geography: '🌍', history: '🏛️', rs: '✝️',
    sociology: '👥', art: '🎨', 'computer-science': '💻', 'food-nutrition': '🍎', 'hospitality-catering': '🍽️',
    imedia: '📱', photography: '📸', 'design-technology': '🔧', drama: '🎭', music: '🎵',
    'gcse-pe': '⚽', 'btec-sport': '🏉', 'business-studies': '💼', 'big-picture': '🌟',
  };
  return map[subjectId] || '📚';
}
