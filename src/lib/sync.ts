import { useEffect } from 'react';
import { useAuth } from './auth';
import { useStore } from './store';
import { seasonIdFor } from './leagues';
import { supabase } from './supabase';

const KEY = 'revix:synced:v1';

function loadSynced(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Forwards new local activities to Supabase award_activity() once signed in.
 *  Best-effort: local progress is always kept; failures stay queued for next time. */
export function OnlineSync() {
  const { user, configured } = useAuth();
  const { store } = useStore();

  useEffect(() => {
    const sb = supabase();
    if (!sb || !configured || !user) return;
    const synced = loadSynced();
    const pending = store.activities.filter((a) => !synced.has(a.eventKey)).slice(0, 25);
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      const done: string[] = [];
      for (const a of pending) {
        const { error } = await sb.rpc('award_activity', {
          p_event_key: a.eventKey,
          p_kind: a.kind,
          p_subject_id: a.subjectId,
          p_detail: a.detail.slice(0, 200),
          p_xp: Math.min(200, a.xp),
          p_league_xp: Math.min(200, a.leagueXp),
          p_correct: a.correct,
          p_total: a.total,
          p_season_id: seasonIdFor(new Date(a.at)),
        });
        if (!error) done.push(a.eventKey);
        else break; // retry later (offline / backend hiccup)
      }
      if (!cancelled && done.length > 0) {
        const next = [...synced, ...done].slice(-500);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
      }
    })();
    return () => { cancelled = true; };
  }, [store.activities, user, configured]);

  return null;
}
