import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StoreProvider, defaultStore, loadStore, useStore } from './store';

const wrapper = ({ children }: { children: ReactNode }) => <StoreProvider>{children}</StoreProvider>;

describe('local progress store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty, honest default state', () => {
    const s = defaultStore();
    expect(s.lifetimeXp).toBe(0);
    expect(s.activities).toEqual([]);
    expect(s.topicProgress).toEqual({});
    expect(s.profile.onboarded).toBe(false);
  });

  it('awards XP exactly once per event key', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    let first = 0;
    act(() => {
      first = result.current.addActivity({
        kind: 'topic',
        detail: 'Mastered something',
        xp: 25,
        eventKey: 'lesson:topic-1:0',
      });
    });
    expect(first).toBe(25);
    expect(result.current.totalXp).toBe(25);

    // Duplicate click / retry must not award again.
    act(() => {
      result.current.addActivity({
        kind: 'topic',
        detail: 'Mastered something',
        xp: 25,
        eventKey: 'lesson:topic-1:0',
      });
    });
    expect(result.current.totalXp).toBe(25);
    expect(result.current.store.activities).toHaveLength(1);
  });

  it('awards different event keys independently', () => {
    const { result } = renderHook(() => useStore(), { wrapper });
    act(() => {
      result.current.addActivity({ kind: 'quiz', detail: 'a', xp: 10, eventKey: 'a' });
      result.current.addActivity({ kind: 'quiz', detail: 'b', xp: 10, eventKey: 'b' });
    });
    expect(result.current.totalXp).toBe(20);
  });

  it('ignores negative XP', () => {
    const { result } = renderHook(() => useStore(), { wrapper });
    act(() => {
      result.current.addActivity({ kind: 'game', detail: 'x', xp: -50, eventKey: 'neg' });
    });
    expect(result.current.totalXp).toBe(0);
  });

  it('tracks topic mastery and best scores', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => result.current.setTopicStatus('topic-1', 'learning', 40));
    expect(result.current.store.topicProgress['topic-1']).toMatchObject({
      status: 'learning',
      attempts: 1,
      bestScore: 40,
    });

    act(() => result.current.setTopicStatus('topic-1', 'mastered', 80));
    expect(result.current.store.topicProgress['topic-1']).toMatchObject({
      status: 'mastered',
      attempts: 2,
      bestScore: 80,
    });

    // Best score never regresses.
    act(() => result.current.setTopicStatus('topic-1', 'learning', 60));
    expect(result.current.store.topicProgress['topic-1'].bestScore).toBe(80);
  });

  it('persists to localStorage and reloads', () => {
    const { result, unmount } = renderHook(() => useStore(), { wrapper });
    act(() => {
      result.current.setProfile({ displayName: 'Sam', onboarded: true });
      result.current.addActivity({ kind: 'quiz', detail: 'q', xp: 5, eventKey: 'k' });
    });
    unmount();

    const reloaded = loadStore();
    expect(reloaded.profile.displayName).toBe('Sam');
    expect(reloaded.profile.onboarded).toBe(true);
    expect(reloaded.lifetimeXp).toBe(5);
  });

  it('resetAll returns to defaults', () => {
    const { result } = renderHook(() => useStore(), { wrapper });
    act(() => {
      result.current.addActivity({ kind: 'quiz', detail: 'q', xp: 999, eventKey: 'r' });
      result.current.resetAll();
    });
    expect(result.current.totalXp).toBe(0);
    expect(result.current.store.activities).toHaveLength(0);
  });
});
