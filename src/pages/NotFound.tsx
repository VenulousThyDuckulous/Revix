import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function NotFound() {
  return (
    <Card style={{ textAlign: 'center', padding: 40 }}>
      <h1>404 — page not found</h1>
      <p style={{ color: 'var(--muted)' }}>That page doesn't exist. Head back to your revision.</p>
      <Link to="/" className="btn btn-primary">Dashboard</Link>
    </Card>
  );
}
