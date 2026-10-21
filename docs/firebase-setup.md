# Firebase setup (accounts + multiplayer)

Revix uses one Firebase project for both authentication and real-time
multiplayer rooms. It runs on the **Spark (free) plan** — no paid APIs.

## 1. Build-time config (already done for this repo)

The four web-app config values are stored as **GitHub Actions variables**
(repo → Settings → Secrets and variables → Actions → Variables):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

They are injected into the build by `.github/workflows/deploy.yml`. The
build **succeeds without them** — the app then runs in offline mode: solo
revision works, multiplayer shows an honest "offline" state instead of
faking opponents.

For local development, copy `.env.example` to `.env` and fill in the same
four values from Firebase console → Project settings → Your apps.

## 2. Enable the auth providers

Firebase console → Build → Authentication → Sign-in method:

- **Email/Password** → Enable (accounts).
- **Anonymous** → Enable (guest quick-play in multiplayer lobbies).

If Anonymous stays disabled, multiplayer shows "needs an account" and
directs the player to sign up — it never silently fails.

## 3. Firestore + rules

Firebase console → Build → Firestore Database → Create database (production
mode, pick the region closest to the UK, e.g. `europe-west2`).

Deploy the security rules from this repo's `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

The rules enforce:

- profiles: readable by anyone (no secrets stored), writable **only by the
  owner**, with per-write caps (XP +500 max and monotonic, rating ±200,
  W/L/D counters +1 max) so a tampered client cannot mint rank or rating;
- rooms: readable by signed-in players, created only as your own lobby,
  updated only by players present in the room, deleted by the host or when
  empty.

## 4. What lives where

| Data                | Store          | Lifetime |
|---------------------|----------------|----------|
| Lessons, streak, activities, settings | `localStorage` (device) | until reset in Settings |
| Account XP + match rating + leaderboard | Firestore `profiles/{uid}` | permanent |
| Live lobbies/matches | Firestore `rooms/{code}` | match length (cleaned up) |

Local XP is the source of truth for the on-device rank recap; profile sync
happens after matches and carries the same totals server-side (bounded by
the rules above).
