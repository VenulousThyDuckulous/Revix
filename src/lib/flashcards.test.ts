import { describe, expect, it } from 'vitest';
import { isDue, orderForReview, scheduleReview } from './flashcards';

describe('spaced repetition', () => {
  it('schedules new cards 1 day out on good recall', () => {
    const s = scheduleReview(null, 4, 1_000_000);
    expect(s.reviews).toBe(1);
    expect(s.intervalDays).toBe(1);
    expect(s.due).toBeGreaterThan(1_000_000);
  });
  it('resets interval on forgotten cards', () => {
    const s = scheduleReview(null, 1, 1_000_000);
    expect(s.intervalDays).toBe(0);
    expect(isDue(s, 1_000_000)).toBe(true);
  });
  it('grows intervals on repeated success', () => {
    let s = scheduleReview(null, 5, 0);
    s = scheduleReview(s, 5, 86_400_000);
    const third = scheduleReview(s, 5, 3 * 86_400_000);
    expect(third.intervalDays).toBeGreaterThan(s.intervalDays);
  });
  it('clamps ease and interval', () => {
    let s = scheduleReview(null, 0, 0);
    for (let i = 0; i < 20; i++) s = scheduleReview(s, 0, i);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
    expect(s.intervalDays).toBeLessThanOrEqual(120);
  });
  it('orders due cards first', () => {
    const now = 10_000_000;
    const states = {
      a: scheduleReview(null, 5, 0), // due long ago? due = 86400000 > now? no: 0+86400000 > now → not due
      b: scheduleReview(null, 1, 0), // due = 0 → due
    };
    const ordered = orderForReview(['a', 'b'], states, now);
    expect(ordered[0]).toBe('b');
    expect(isDue(null)).toBe(true);
  });
});
