# Roadmap / phasing

## Phase 1 (this codebase, done)

- Home screen with two tiles: Arithmetic Practice and Tamil Homework.
- Arithmetic Practice: pick an operation (addition/subtraction/
  multiplication/division) and a number size (1-4 digits), generate 50
  questions, show/hide answers, regenerate a new set, print the worksheet.
- Tamil Homework: a placeholder page stating the feature is under
  development. **No Tamil-homework logic exists yet** - do not build it out
  speculatively; the owner will scope it separately.

## Explicitly not in Phase 1 (don't add without being asked)

- No accounts, login, or per-user history/progress tracking.
- No backend/database - all state is in-memory and resets on refresh
  (except the operation/digit choice, which travels via router state for
  one hop; see ARCHITECTURE.md).
- No scoring, timers, or "check my answers against what I typed" grading -
  the worksheet is print/practice-only right now (answers can be revealed,
  not graded).
- No negative-number arithmetic, decimals, or fractions.
- No settings/preferences persistence (e.g. remembering the last operation
  chosen).

## What's likely to come later

The project owner said they'll describe remaining features after this
initial phase lands. When that happens:

- If it's a new subject alongside Arithmetic/Tamil Homework: add a new
  `src/features/<subject>/` folder (mirror the `arithmetic` folder's shape)
  and a new `FeatureCard` on `HomePage`, rather than folding it into an
  existing feature folder.
- If it's a new setting on the existing arithmetic worksheet (e.g. negative
  numbers, timed mode, answer grading): see the "if you add a new
  operation or setting" checklist in
  `src/features/arithmetic/CLAUDE.md`.
- Update this file's "Phase 1" section once a new phase actually ships, so
  it stops describing the current app as done and reflects the new state.
