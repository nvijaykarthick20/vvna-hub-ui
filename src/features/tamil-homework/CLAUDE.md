# Rules for `src/features/tamil-homework/`

Read this before touching worksheet storage - this is the one folder in the
app that talks to the real file system instead of staying in-memory, and
the browser API involved has some non-obvious behavior worth knowing before
you "fix" something that looks like a bug.

## Files in this folder

- `types.ts` - `TamilWorksheet` / `TamilWorksheetInput` / `isTamilWorksheet`.
  The type guard is used when parsing worksheet JSON read back from disk -
  a file could be corrupt or foreign, so callers skip it rather than throw.
- `fileSystemAccess.d.ts` - ambient augmentation for the parts of the File
  System Access API that TypeScript's bundled `lib.dom.d.ts` doesn't
  include yet (`window.showDirectoryPicker`, `queryPermission` /
  `requestPermission` on `FileSystemHandle`, async iteration on
  `FileSystemDirectoryHandle`). Not a new npm dependency - if a future
  TypeScript upgrade adds these to `lib.dom.d.ts`, this file's declarations
  will just become redundant duplicates and `tsc` will flag the conflict;
  delete the ones that collide at that point.
- `directoryHandleStore.ts` - a minimal hand-rolled IndexedDB wrapper that
  persists **only** the chosen `FileSystemDirectoryHandle` (handles are
  structured-cloneable). This is the one piece of browser storage in the
  app; it does not store worksheet content - that lives in real files.
- `worksheetStorage.ts` - the only place that touches worksheet files:
  `chooseWorksheetsDirectory`, `getPermissionState`/`requestPermission`,
  `listWorksheets`, `saveWorksheet`, `updateWorksheet`. `saveWorksheet`
  names each file `<uuid>.json` (via `crypto.randomUUID()`) specifically to
  avoid dealing with illegal filename characters in a user-typed title -
  don't switch the filename to the title without solving that.
  `updateWorksheet` takes the existing `TamilWorksheet` plus the edited
  input, keeps its `id`/`createdAt`, refreshes `updatedAt`, and writes to
  the same `<uuid>.json` - it overwrites in place rather than creating a
  second file.
- `tanglishInput.ts` - live Tanglish -> Tamil transliteration for the "Text"
  field on `TamilHomeworkFormPage`, backed by the `@piraisoodan/tanglish`
  npm package (offline, zero deps, dictionary + phonetic-trie engine - see
  its README for how it guesses unknown words). `convertWordBeforeCursor`
  converts the Latin word just before the cursor the moment a boundary
  char (space/punctuation) is typed after it, so already-converted Tamil
  text earlier in the field is never touched or re-processed.
  `convertTrailingWord` catches the last word on blur, since it has no
  following boundary char to trigger on. Has its own
  `tanglishInput.test.ts` - update it if the boundary/word-detection rules
  change. Only "Text" does this today, not "Worksheet for"/"Title" - not a
  gap to "fix", it was scoped that way deliberately (see
  `.claude/context/ROADMAP.md`).
- `useWorksheetsDirectory.ts` - resolves the persisted handle + its live
  permission into a `DirectoryStatus` (`'checking' | 'unsupported' |
  'no-directory' | 'needs-permission' | 'ready' | 'error'`). Both pages
  mount this independently rather than sharing it via Context - see "Data
  flow" below.
- `TamilHomeworkListPage.tsx` - route `/tamil-homework`. Renders a
  different body per `DirectoryStatus` and only fetches
  `listWorksheets` once `status === 'ready'`.
- `TamilHomeworkFormPage.tsx` - handles both `/tamil-homework/new` (add) and
  `/tamil-homework/edit` (edit). Add mode has no router `state`; edit mode
  receives the existing `TamilWorksheet` via `state` from the "Edit" button
  on a `WorksheetCard` in `TamilHomeworkListPage` (not the card itself -
  the rest of the card is plain, non-interactive text so a click elsewhere
  on it does nothing), and the form fields are seeded from it.
  Whether `handleSave` calls `saveWorksheet` or `updateWorksheet` is decided
  purely by whether `state` held a worksheet - there's no separate
  "isEditing" flag to keep in sync. Redirects back to `/tamil-homework` if
  the directory isn't `'ready'` once resolved, rather than guessing - same
  convention as `ArithmeticQuestionsPage`/`ArithmeticLearnPage` redirecting
  to `/arithmetic` on missing router state. Also has its own "Print" button
  that prints the current field values (Letter/A4, via the shared `@page`
  rule in `src/index.css`) directly via a `hidden print:block` view next to
  the `no-print` form. This is the only place worksheets can be printed
  from - there's no print action on `TamilHomeworkListPage`, so printing
  always goes through the form (add or edit) rather than a read-only view.

## Rules that are deliberate, not bugs

- **The folder permission prompt can reappear every browser session.**
  Chromium requires a fresh user gesture to reuse a persisted directory
  handle's permission; the handle itself survives via IndexedDB, only the
  permission grant doesn't always. `needs-permission` status and its
  "Allow access" button are the fix - don't try to silently
  `requestPermission()` without a click, it won't work and will look
  broken instead.
- **Chrome/Edge only.** `window.showDirectoryPicker` doesn't exist in
  Firefox or Safari - `unsupported` status is the deliberate fallback, not
  a bug to route around with a different storage mechanism. This was an
  explicit tradeoff the project owner chose (real files over
  browser-only storage) - see `.claude/context/ROADMAP.md`.
- **A corrupt or unrelated `.json` file in the chosen folder is skipped,
  not fatal.** `listWorksheets` relies on `isTamilWorksheet` for this -
  don't change it to throw on the first bad file.

## What's intentionally not built yet

No deleting a saved worksheet, and no grading/scoring - list, create, and
edit exist today (see `TamilHomeworkFormPage.tsx`/`updateWorksheet`). Don't
add deletion speculatively; if requested, extend `worksheetStorage.ts` with
a `deleteWorksheet` that removes the `<uuid>.json` file via
`handle.removeEntry`, and add UI for it following the same "redirect
instead of guessing" and per-`DirectoryStatus` rendering conventions used
by the existing pages.
