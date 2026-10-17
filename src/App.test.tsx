import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.location.hash = '#/';
});

describe('app routing (GitHub Pages HashRouter)', () => {
  it('shows the main landing page when logged out', () => {
    render(<App />);
    expect(screen.getByText('Level up your learning.')).toBeInTheDocument();
    expect(screen.getByText('Everything you need to revise')).toBeInTheDocument();
    expect(screen.queryByText(/Good morning|Good afternoon|Good evening/)).not.toBeInTheDocument();
  });
  it('redirects logged-out deep links to the main page', () => {
    window.location.hash = '#/games';
    render(<App />);
    expect(screen.getByText('Everything you need to revise')).toBeInTheDocument();
  });
  it('does not show ranks dashboard when logged out', () => {
    window.location.hash = '#/ranks';
    render(<App />);
    expect(screen.getByText('Everything you need to revise')).toBeInTheDocument();
    expect(screen.queryByText(/Top revisers/)).not.toBeInTheDocument();
  });
});
