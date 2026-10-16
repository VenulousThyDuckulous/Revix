# Curriculum audit — Harrogate Grammar School KS4

## Source provided

- An image render of **"KEY STAGE 4 – WHAT ARE WE LEARNING EACH TERM? Quick links"**
  (Harrogate Grammar School / Red Kite Learning Trust).
- It lists subject quick-links for **Year 10** and **Year 11**.

## What was verified

Subject offerings confirmed from the overview image (`partially_verified`):

Year 10 & Year 11: English, Maths, Combined Science, Biology, Chemistry, Physics,
French, German, Spanish, Geography, History, RS, Sociology, Art, Computer Science,
Food & Nutrition, Hospitality and Catering, iMedia, Photography, Design and Technology,
Drama, Music, GCSE PE, BTEC Sport, Business Studies, Big Picture Studies.

GCSE PE and BTEC Sport are kept separate; Combined Science is kept separate from
Biology/Chemistry/Physics — as in the source.

## What was NOT accessible

- The file **`Key Stage 4 - Years 10 and 11.pdf` was never provided as a binary** —
  only the rendered image above. PDF hyperlink annotations (the per-subject document links)
  therefore **could not be extracted**, and no linked curriculum document was visited.
- No term/half-term breakdowns, exam boards, tiers, texts, case studies, or assessment
  details were available from the image.

## Consequences (honest labelling)

- Every topic in `src/data/topics.json` is marked `source: "supplementary"`,
  `verification: "supplementary"`, `examBoard: null`, `url: null`, `term: null`.
- No exam board is ever guessed; the UI shows "Exam board unknown" where relevant.
- All 192 questions in `src/data/questions.json` are original Revix practice items
  (`source: "supplementary"`), not past papers.

## How to complete the ingestion

1. Place the real PDF at `docs/Key-Stage-4-Years-10-and-11.pdf`.
2. Extract link annotations (e.g. `pypdf` / `pdfminer`: `page.annots` → `/A` → `/URI`).
3. Visit each destination, record contents per subject/year/term in `src/data/topics.json`,
   flipping entries to `source: "school"` / `verification: "verified"` with the source URL.
4. Update `src/data/sources.json` (`entries` array) and this audit with per-link status.
