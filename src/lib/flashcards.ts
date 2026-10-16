import type { FlashState } from './types';

/** Simple SM-2-lite spaced repetition. quality: 0 (forgot) .. 5 (easy). */
export function scheduleReview(prev: FlashState | null, quality: 0 | 1 | 2 | 3 | 4 | 5, now = Date.now()): FlashState {
  const DAY = 86_400_000;
  const base: FlashState = prev ?? { ease: 2.5, intervalDays: 0, due: now, lastReview: null, reviews: 0, knownCount: 0 };
  let ease = base.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ease = Math.min(3.0, Math.max(1.3, ease));
  let intervalDays: number;
  if (quality < 3) {
    intervalDays = 0; // relearn today
  } else if (base.reviews === 0) {
    intervalDays = 1;
  } else if (base.reviews === 1) {
    intervalDays = 3;
  } else {
    intervalDays = Math.round(base.intervalDays * ease);
  }
  intervalDays = Math.min(120, Math.max(0, intervalDays));
  return {
    ease,
    intervalDays,
    due: now + intervalDays * DAY,
    lastReview: now,
    reviews: base.reviews + 1,
    knownCount: base.knownCount + (quality >= 3 ? 1 : 0),
  };
}

export function isDue(state: FlashState | null, now = Date.now()): boolean {
  if (!state) return true;
  return state.due <= now;
}

/** Order card ids: due cards first, then never-reviewed, then by earliest due. */
export function orderForReview(ids: string[], states: Record<string, FlashState>, now = Date.now()): string[] {
  return [...ids].sort((a, b) => {
    const sa = states[a];
    const sb = states[b];
    const da = sa ? sa.due <= now ? 0 : 1 : 0;
    const db = sb ? sb.due <= now ? 0 : 1 : 0;
    if (da !== db) return da - db;
    return (sa?.due ?? 0) - (sb?.due ?? 0);
  });
}
