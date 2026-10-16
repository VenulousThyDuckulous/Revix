# Supabase setup for Revix online accounts + leagues

The static site works fully without Supabase (local-only mode). Follow these steps to enable online accounts and leaderboards.

## 1. Create the project

1. Go to https://supabase.com → New project (free tier is fine).
2. Note the **Project URL** and **anon (publishable) key** from Settings → API.

## 2. Run the migration

In the Supabase dashboard: SQL Editor → New query → paste the entire contents of
`supabase/migrations/001_revix_backend.sql` → Run.

This creates:
- `profiles` (display name, avatar, tier, week/lifetime XP) with a rank-protection trigger —
  users **cannot** edit their own tier/XP directly.
- `revision_activity` with a unique `(user_id, event_key)` constraint (no double rewards).
- `league_seasons` + `league_results` (world-readable, no client write access).
- `award_activity()` — SECURITY DEFINER function that validates kind, per-kind XP caps,
  the 500/day league cap (UTC), and rolls XP into the profile. All client writes go through this.
- `process_due_seasons()` — promotion/relegation, callable by service role only.
- `handle_new_user()` — auto-creates a profile row with a unique display name on sign-up.

## 3. Configure auth

- Authentication → Sign In / Up → enable **Email** provider.
- Optionally disable "Confirm email" for a school pilot (keep it ON for public use).

## 4. Wire the frontend

Deployment options for the two keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`):

- **Local dev:** copy `.env.example` to `.env` and fill in the values.
- **GitHub Pages:** repository Settings → Secrets and variables → Actions → add both as
  **Actions variables** (they are publishable, not secret), then reference them in the
  workflow build step, e.g.:
  ```yaml
  - run: npm run build
    env:
      VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
  ```
  Only the anon key goes in the frontend. **Never** put the service-role key in the site.

Without these variables the app runs in local-only mode and says so honestly.

## 5. Weekly season processing

`process_due_seasons()` must run once a week after Monday 00:00 UTC. Pick one:

- **pg_cron** (Supabase): schedule `select public.process_due_seasons();` weekly, plus insert
  the upcoming season row into `league_seasons` (any service-role client can do this).
- **Scheduled GitHub Action** with the service-role key stored as an Actions **secret**,
  calling the function via the Supabase REST RPC endpoint.

The function is idempotent per season (`processed` flag) — running it twice cannot double-process.

## 6. Test it

1. Sign up two test accounts in the app.
2. Complete quizzes on both → check `profiles.week_xp` rises in Table Editor.
3. Try direct tampering (SQL editor as the user, or console): updating `tier`/`week_xp`
   must have no effect (trigger resets them).
4. Call `award_activity` twice with the same `event_key` → second call returns 0.
5. Run `process_due_seasons()` after inserting an ended season → check `league_results`.

## Account deletion

In-app deletion removes the profile row and signs the user out. Orphaned auth users should be
removed by the project owner in Authentication → Users (service-role operation, by design).
