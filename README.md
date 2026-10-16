# Revix — Level up your learning

A complete GCSE revision platform for UK students (Years 10–11): dashboard, curriculum
browser, quizzes, flashcards, six revision games, exam practice, achievements, and
competitive weekly leagues.

**Live site:** https://venulousthyduckulous.github.io/Revix/ (after enabling Pages — see below)

## Features

- **Onboarding** — year, subjects, maths tier, science route, daily goal, theme, avatar. No account needed.
- **Dashboard** — streak, XP, weekly League XP, accuracy, weak topics, recommendations — all from real stored data.
- **My Curriculum** — Year → Subject → Topic → Subtopic browser with search, filters, status tracking,
  notes, reminders, difficult flags, personal topics, and honest source-verification badges.
- **26 subject pages** — overviews, topics, progress, and subject-specific revision approaches.
- **Quiz engine** — MCQ, true/false, short, fill-in-the-blank, matching, numeric (with tolerance),
  timed/untimed, explanations, retry, full review.
- **Flashcards** — flip/shuffle/keyboard, spaced repetition (SM-2-lite), due-first ordering,
  personal decks with validated JSON import/export.
- **Six games** — Quickfire, Match-Up, Memory Match, Topic Boss, Word Scramble, Exam Rush.
- **Exam practice** — timed sessions, self-marking against model answers, mistakes-to-revisit list.
- **Achievements** — 12 achievements unlocked from real activity.
- **Leagues** — Bronze → Champion weekly seasons (Mon 00:00 UTC), validated rewards, daily caps,
  duplicate prevention, deterministic tie-breaks. Works locally; global standings need Supabase.
- **Local-first** — everything works signed out; data persists in versioned LocalStorage with
  export/import and reset.

## Tech

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router (HashRouter for GitHub Pages) +
Lucide icons + Supabase (optional) + Vitest.

## Develop

```bash
npm install
npm run dev      # local dev
npm test         # 33 tests
npm run typecheck
npm run build    # production build → dist/
```

## Deploy (GitHub Pages)

1. Push to `main` — the workflow in `.github/workflows/deploy.yml` tests, builds, and deploys automatically.
2. Repository → Settings → **Pages** → Source: **GitHub Actions** (first time only).
3. Site appears at `https://<owner>.github.io/Revix/`.

`vite.config.ts` sets `base: '/Revix/'`; HashRouter means refresh/direct links work with no
server rewrites, and there are no hardcoded localhost URLs or secrets in the build.

## Online leagues (Supabase)

Local mode works out of the box. To enable accounts + global leaderboards, follow
[`docs/supabase-setup.md`](docs/supabase-setup.md) (migration in
`supabase/migrations/001_revix_backend.sql`, then set `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY`). Without these, the app honestly reports local-only mode.

## Curriculum sources

Subject offerings verified from the Harrogate Grammar School KS4 overview image.
The `Key Stage 4 - Years 10 and 11.pdf` binary (with embedded subject-document links) was not
available, so topic detail is original supplementary content, clearly labelled — never
presented as school or exam-board material. See [`docs/curriculum-audit.md`](docs/curriculum-audit.md).
To complete ingestion, place the PDF at `docs/Key-Stage-4-Years-10-and-11.pdf` and follow the audit.
