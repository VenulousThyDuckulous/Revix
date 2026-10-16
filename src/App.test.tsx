import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('app routing (GitHub Pages HashRouter)', () => {
  it('renders the dashboard with nav at #/', () => {
    window.location.hash = '#/';
    render(<App />);
    expect(screen.getByText(/Level up your learning/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
  it('navigates directly to games hub', () => {
    window.location.hash = '#/games';
    render(<App />);
    expect(screen.getByText('Revision Games')).toBeInTheDocument();
    expect(screen.getByText(/Quickfire/)).toBeInTheDocument();
  });
  it('shows leaderboard offline state without fake users', () => {
    window.location.hash = '#/leaderboard';
    render(<App />);
    expect(screen.getByText(/Online leaderboards unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/^\d+\. .* · .* XP$/)).not.toBeInTheDocument();
  });
});
