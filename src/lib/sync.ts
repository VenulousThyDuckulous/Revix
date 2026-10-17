import { useEffect } from 'react';
import { doc, increment, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from './auth';
import { useStore } from './store';
import { firebaseDb } from './firebase';

const KEY = 'revix:synced:v1';

function loadSynced(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Syncs local XP to the signed-in user's Firestore profile (best-effort).
 *  Local progress is always kept; failures stay queued for next time. */
export function OnlineSync() {
  const { user, configured } = useAuth();
  const { store } = useStore();

  useEffect(() => {
    const db = firebaseDb();
    if (!db || !configured || !user) return;
    const synced = loadSynced();
    const pending = store.activities.filter((a) => !synced.has(a.eventKey));
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      const ref = doc(db, 'profiles', user.uid);
      try {
        await setDoc(ref, {
          displayName: store.profile.displayName || user.displayName || user.email?.split('@')[0] || 'revixer',
          avatar: store.profile.avatar || '🚀',
          updatedAt: Date.now(),
        }, { merge: true });
        // Push XP in one capped increment per flush (rules cap each write at +500).
        const batch = pending.slice(0, 50);
        const total = batch.reduce((s, a) => s + Math.min(200, Math.max(0, a.xp)), 0);
        if (total > 0) {
          if (total <= 500) {
            await updateDoc(ref, { lifetimeXp: increment(total), updatedAt: Date.now() });
          } else {
            // Split so no single write exceeds the rules cap.
            let remaining = total;
            while (remaining > 0) {
              const chunk = Math.min(500, remaining);
              await updateDoc(ref, { lifetimeXp: increment(chunk), updatedAt: Date.now() });
              remaining -= chunk;
            }
          }
        }
        if (!cancelled) {
          const next = [...synced, ...batch.map((a) => a.eventKey)].slice(-500);
          try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
        }
      } catch { /* offline / rules rejection — retry on next activity */ }
    })();
    return () => { cancelled = true; };
  }, [store.activities, store.profile.displayName, store.profile.avatar, user, configured]);

  return null;
}
