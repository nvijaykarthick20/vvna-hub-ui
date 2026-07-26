# Roadmap / phasing

## Phase 1 (this codebase, done)

- Home screen with two tiles: Arithmetic Practice and Tamil Homework.
- Arithmetic Practice: pick an operation (addition/subtraction/
  multiplication/division) and a number size (1-4 digits), generate 50
  questions, show/hide answers, regenerate a new set, print the worksheet.

## Phase 2 (this codebase, done)

- Tamil Homework: list existing worksheets, add new ones, and edit an
  existing one (clicking a worksheet on the list opens the same form
  pre-filled, and saving updates that worksheet's file in place rather than
  creating a new one). Each worksheet has "Worksheet for", "Title", and
  "Text", plus created/updated dates. Worksheets are saved as real files
  (one JSON file per worksheet) in a folder the user picks via the File
  System Access API - not a backend, not browser-only storage. See
  `src/features/tamil-homework/CLAUDE.md` for the storage mechanics and
  its browser-support/permission-prompt tradeoffs (Chrome/Edge only; a
  one-click permission re-confirm can reappear each session).
- The "Text" field on the Tamil Homework add/edit form converts Tanglish
  (Tamil typed in Latin letters) to Tamil script live as you type, via
  `@piraisoodan/tanglish` - see
  `src/features/tamil-homework/CLAUDE.md`/`tanglishInput.ts`. Only that
  field does this; "Worksheet for"/"Title" stay plain text.
- Tamil Homework worksheets can be printed (Letter/A4) from a "Print"
  button on the add/edit form (`TamilHomeworkFormPage.tsx`) - it prints
  whatever is currently typed, not a separate read-only view. There's no
  print action on the list screen.
- **Deleting a worksheet is not built yet** - list, create, and edit exist.
  Don't build deletion out speculatively; extend `worksheetStorage.ts` per
  the "What's intentionally not built yet" section of that folder's
  `CLAUDE.md` when asked.

## Explicitly not in scope (don't add without being asked)

- No accounts, login, or per-user history/progress tracking.
- No backend/database. Arithmetic worksheets stay in-memory and reset on
  refresh (except the operation/digit choice, which travels via router
  state for one hop; see ARCHITECTURE.md). Tamil worksheets are the one
  exception to "no persistence" in this app - they're saved as real files
  via the File System Access API, not a database/server.
- No scoring, timers, or "check my answers against what I typed" grading -
  the arithmetic worksheet is print/practice-only right now (answers can
  be revealed, not graded), and Tamil worksheets aren't graded either.
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
