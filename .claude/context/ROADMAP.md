# Roadmap / phasing

## Phase 1 (this codebase, done)

- Home screen with Arithmetic Practice and Tamil Homework tiles.
- Arithmetic Practice: pick an operation (addition/subtraction/
  multiplication/division) and a number size (1-4 digits), generate 50
  questions, enter and submit answers, see correctness and elapsed time,
  regenerate a new set, and print the worksheet.

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
- Selected Text-field ranges can be toggled bold, while Normal, Large, or Extra
  Large size applies to the whole field. Formatting is stored as safe text
  runs with the worksheet and used by both the editor and print output.
- Tamil Homework worksheets can be printed (Letter/A4) from a "Print"
  button on the add/edit form (`TamilHomeworkFormPage.tsx`) - it prints
  whatever is currently typed, not a separate read-only view. There's no
  print action on the list screen.
- Worksheets can be deleted from the list after an explicit confirmation.

## Phase 3 (this codebase, done)

- Duplicate Media Cleaner: recursively scan a user-selected folder for exact
  photo/video copies using bounded-memory SHA-256 fingerprints plus byte
  verification, or strict visual copies using photo and sampled-video-frame
  fingerprints.
- Review duplicate groups with thumbnails, paths, sizes, and dimensions;
  select suggested duplicate copies while keeping one file per group.
- Delete selected copies only after confirmation, with fresh
  size/modified/content-hash checks and explicit partial-failure reporting.
  Processing stays on-device.

## Explicitly not in scope (don't add without being asked)

- No accounts, login, or per-user history/progress tracking.
- No backend/database. Arithmetic worksheets and duplicate scan results stay in-memory and reset on
  refresh (except the operation/digit choice, which travels via router
  state for one hop; see ARCHITECTURE.md). Tamil worksheets are the one
  exception to "no persistence" in this app - they're saved as real files
  via the File System Access API, not a database/server.
- No saved scoring/history or grading for Tamil worksheets. Arithmetic answer
  feedback and timing exist only for the current in-memory worksheet.
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
