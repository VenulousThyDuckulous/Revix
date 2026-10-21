# Revix — multiplayer GCSE revision

Battle your classmates at GCSE revision. Revix combines a Duolingo-style
solo learning path with **real-time multiplayer gamemodes**, a lifetime XP
rank ladder and a competitive match rating — built on the UK GCSE
curriculum (Year 10 & 11).

🌐 **Live:** https://venulousthyduckulous.github.io/Revix/

## What's inside

- **Learn** — 208 curriculum topics across 26 subjects as an ordered
  learning path. Each lesson teaches (summary, key points, common
  mistakes) then practises with banked questions; mastering topics earns
  XP. Topics unlock in order.
- **Play (multiplayer)** — four gamemodes over Firestore listeners:
  - **Quiz Duel** (1v1, speed-bonus scoring)
  - **Battle Royale** (wrong answer = eliminated, last standing wins)
  - **Team Battle** (2v2 combined scores)
  - **60s Sprint** (most correct in a minute)
  Create a room, share the code, or Quick match.
- **Ranks** — 13-tier lifetime XP ladder (Unranked → Bronze → … → Alpha)
  that **never drops**, plus a separate ELO match rating for competitive
  comparison, and an online leaderboard.
- **Honesty** — content provenance is documented in
  `docs/curriculum-audit.md`; offline states are real (no fake
  opponents/leaderboards), and questions are original practice items, not
  past papers.

## Stack

React 19 + TypeScript + Vite + Tailwind v4 · Firebase (Auth + Firestore)
· Vitest + Testing Library · oxlint · GitHub Pages via GitHub Actions.

## Development

```bash
npm ci
npm run dev        # local dev server
npm test           # vitest (unit + hook tests)
npm run typecheck  # tsc -b
npm run lint       # oxlint
npm run build      # production build to dist/
```

Copy `.env.example` → `.env` for local Firebase config. Without it the app
runs in offline mode (solo works, multiplayer disabled).

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`: test → build (with
Firebase config injected from repo Actions variables) → deploy to GitHub
Pages. `vite.config.ts` sets `base: '/Revix/'` and the app uses
`HashRouter`, so deep links work on Pages without server rewrites.

## Docs

- `docs/multiplayer.md` — room architecture, ELO, and the honest trust
  model for client-side scoring.
- `docs/firebase-setup.md` — auth providers, rules deploy, env vars.
- `docs/curriculum-audit.md` — what curriculum content is verified vs
  supplementary.
- `firestore.rules` — security rules with bounded self-writes.

## Tests

61 tests across ranks/ELO, quiz grading & selection, the multiplayer
engine (shared clock, eliminations, results, payouts), the local progress
store, and curriculum data integrity.
