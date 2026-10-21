# Multiplayer architecture & trust model

## Why it looks like this

Revix is hosted on **GitHub Pages — static hosting, no server**. Real-time
multiplayer therefore runs entirely through **Cloud Firestore listeners**
(`onSnapshot`): every client in a room watches `rooms/{code}` and reacts to
document changes. There is no game server, no WebSockets host, and no
paid service.

## Room lifecycle

```
lobby ──host starts──▶ playing ──clock/conditions──▶ finished
```

1. **Lobby** — the host creates `rooms/{CODE}` with mode + settings.
   Players join with the code (or Quick match reuses an open lobby).
   Only the host can edit settings and start.
2. **Playing** — at start the host resolves the question set and writes
   `questionIds` + `startedAt = now + 3s`. Every client derives the current
   question index from the shared clock (`startedAt` + `secondsPerQuestion`
   windows), so there is no per-question sync traffic. Each client writes
   **only its own** `players.{uid}` entry (score/correct/state) — no two
   clients ever write the same field, so writes never conflict.
3. **Finished** — the end condition is deterministic (`isMatchOver` in
   `src/lib/engine.ts`): duel/team end on the clock, royale ends when ≤1
   player is alive, sprint ends at 60s or when everyone finished. The first
   client to notice writes `status: finished` plus `results`. Results are
   computed by a pure function from room state, so racing writers converge
   on the same outcome.

## Gamemodes

| Mode | Players | Win condition | Twist |
|------|---------|---------------|-------|
| Quiz Duel | 2 | Highest score after N questions | Speed bonus: up to +50 pts for fast answers |
| Battle Royale | 3–8 | Last one standing | Any wrong/missed answer eliminates you |
| Team Battle | 2–4 (2v2) | Higher combined team score | Rating moves as a team — everyone on the winning side gains |
| 60s Sprint | 1–8 | Most correct in 60 seconds | Self-paced, ties broken by finish time |

## Rating (ELO)

- Start 1000, K = 32, capped changes per write by security rules (±200).
- Duel: standard 1v1 ELO (zero-sum pair).
- Team: both teams rated as their average member rating, zero-sum across teams.
- Royale/Sprint: placement-based score (1st = 1.0 → last = 0.0) against the
  field average.
- XP rank (Unranked→Alpha) is **separate** and never drops.

## Trust model — read this honestly

Client-side scoring means a **determined cheater can tamper with their own
client** to report better scores. We deliberately do not pretend otherwise:

- Security rules **bound** every self-write (XP, rating, W/L), so tampering
  gains at most a little per match, never unlimited rank.
- Question order is resolved server-visible at match start (`questionIds`)
  so all honest clients see the same set; the question bank itself ships in
  the client bundle because static hosting has no secret store.
- This is casual play among classmates. For ranked integrity beyond that
  you would need a trusted game server (e.g. Cloud Functions or a dedicated
  authority), which is out of scope for a free static-hosting build.

## Failure modes (no fake data)

- No Firebase config → Play page shows "multiplayer is offline" with solo
  alternatives; it never invents opponents.
- Anonymous auth disabled → "needs an account" with a route to sign up.
- Room deleted/closed mid-view → "room unavailable" with a back link.
- Leaderboard fails to load → an error message, not fabricated rows.
