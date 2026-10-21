import { Crown, Flame, Timer, Users } from 'lucide-react';
import type { GameMode } from './types';
import { capacityFor } from './multiplayer';

export interface ModeInfo {
  id: GameMode;
  name: string;
  tagline: string;
  blurb: string;
  icon: typeof Crown;
  color: string;
  minPlayers: number;
}

export const MODES: ModeInfo[] = [
  {
    id: 'duel',
    name: 'Quiz Duel',
    tagline: '1 v 1',
    blurb: 'Same questions, same clock. Faster correct answers score more — highest score takes the win.',
    icon: Crown,
    color: '#58cc02',
    minPlayers: 2,
  },
  {
    id: 'royale',
    name: 'Battle Royale',
    tagline: 'Free for all',
    blurb: 'One wrong answer eliminates you. Survive every round — last student standing wins.',
    icon: Flame,
    color: '#ff4b4b',
    minPlayers: 3,
  },
  {
    id: 'team',
    name: 'Team Battle',
    tagline: '2 v 2',
    blurb: 'Two teams, one combined score per side. Everyone answers — the better team takes it.',
    icon: Users,
    color: '#1cb0f6',
    minPlayers: 2,
  },
  {
    id: 'sprint',
    name: '60s Sprint',
    tagline: 'Race the clock',
    blurb: '60 seconds on the clock, questions keep coming. Most correct answers when time expires wins.',
    icon: Timer,
    color: '#ff9600',
    minPlayers: 1,
  },
];

export function modeInfo(mode: GameMode): ModeInfo {
  return MODES.find((m) => m.id === mode) ?? MODES[0];
}

export function capacityLabel(mode: GameMode): string {
  const cap = capacityFor(mode);
  if (mode === 'duel') return '2 players';
  if (mode === 'team') return '4 players (2v2)';
  return `up to ${cap}`;
}
