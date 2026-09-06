# Architecture map

Read this instead of globbing the whole `src/` tree. It tells you which
file(s) to open for a given kind of change - most tasks only need 1-3 files
from this app, not a full-repo read.

## One-paragraph summary

VVNA Hub is a Vite + React 19 + TypeScript single-page app. Client-side
routing (`react-router-dom`) switches between a Home screen and three
features: Arithmetic Practice, Tamil Homework, and Duplicate Media Cleaner.
There is no backend and no auth. Arithmetic is in-memory, Tamil worksheets
are saved as real files, and duplicate photos/videos are scanned/deleted locally
from a folder the user explicitly selects. Both file features use the File
System Access API (see ROADMAP.md). All styling is Tailwind CSS v4, configured
via the `@theme` block
in `src/index.css` (not a `tailwind.config.js` - v4 doesn't need one for
this project's needs).

## Request-to-file map

| If the task is about...                                  | Open this, and usually only this                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Home screen copy, layout, or feature tiles               | `src/features/home/HomePage.tsx`, `src/components/home/FeatureCard.tsx`                       |
| Arithmetic operation/digit picker UI                     | `src/features/arithmetic/ArithmeticSetupPage.tsx`                                             |
| How questions are generated / answer correctness         | `src/features/arithmetic/generateQuestions.ts` + its `CLAUDE.md`                              |
| The worksheet display, answer submission, timer, print   | `src/features/arithmetic/ArithmeticQuestionsPage.tsx`                                         |
| Tamil Homework list / worksheet form                     | `src/features/tamil-homework/TamilHomeworkListPage.tsx`, `TamilHomeworkFormPage.tsx`          |
| How Tamil worksheets are saved/read (File System Access) | `src/features/tamil-homework/worksheetStorage.ts` + its `CLAUDE.md`                           |
| Duplicate scan UI, progress, previews, or selection      | `src/features/duplicate-media/DuplicateMediaPage.tsx` + its `CLAUDE.md`                       |
| Exact/visual matching or deletion safeguards             | `src/features/duplicate-media/duplicateMedia.ts` + its test                                   |
| Shared File System Access browser declarations           | `src/fileSystemAccess.d.ts`                                                                   |
| Header, footer, page frame, the kolam motif              | `src/components/layout/AppShell.tsx`, `src/components/ui/KolamMotif.tsx`                      |
| Adding a route                                           | `src/App.tsx` only - it's intentionally a thin route map                                      |
| Colors, fonts, spacing tokens                            | `src/index.css` (`@theme` block) - see CONVENTIONS.md before adding a raw hex value elsewhere |
| Build/dev tooling (Vite, TS, ESLint, Prettier)           | `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc.json`                    |
| What's planned but not built yet                         | `.claude/context/ROADMAP.md`                                                                  |

## Folder roles

- `src/components/` - presentational, reusable, no business logic. Has its
  own `CLAUDE.md`.
- `src/features/<name>/` - one folder per user-facing feature. Owns its own
  types, logic, and pages. `src/features/arithmetic/` has its own
  `CLAUDE.md` because its logic has correctness rules worth reading first;
  `src/features/tamil-homework/` and `src/features/duplicate-media/` have
  their own `CLAUDE.md` files because they talk to the real file system, with
  non-obvious permission and deletion behavior worth reading first.
- `src/App.tsx` - route table only.
- `src/main.tsx` - app bootstrap (StrictMode + BrowserRouter + CSS import).
  Rarely needs to change.

## Data flow for the Arithmetic feature

1. `ArithmeticSetupPage` holds `operation` and `digits` in local state.
2. On submit, it calls `navigate('/arithmetic/questions', { state: { operation, digits } })` -
   the selection travels as router state, not global state or a context
   provider. There is no app-wide store in this project; don't introduce
   one (Redux/Zustand/Context) for this single hand-off without discussing
   it first.
3. `ArithmeticQuestionsPage` reads `location.state`. If it's missing (direct
   URL access/refresh), it redirects to `/arithmetic` instead of guessing a
   default operation/digit count.
4. `generateQuestions(operation, digits)` produces 50 questions client-side.
   Nothing is persisted - refreshing the questions page loses the set
   (regenerate via "New set" or redo setup).

## Data flow for the Tamil Homework feature

1. `useWorksheetsDirectory()` resolves where worksheets live: a
   `FileSystemDirectoryHandle` persisted in IndexedDB
   (`directoryHandleStore.ts`) plus its _live_ permission state (queried
   fresh every mount, since Chromium can require a new user gesture to
   reuse a handle's permission each session). It returns a
   `DirectoryStatus`, not a global store - `TamilHomeworkListPage` and
   `TamilHomeworkFormPage` each mount it independently, the same way
   arithmetic pages each read `location.state` independently rather than
   sharing a context provider. Don't introduce Context/Redux/Zustand to
   share this between the two pages.
2. `TamilHomeworkListPage` renders a different body per `DirectoryStatus`
   (unsupported browser / choose a folder / re-grant permission / ready),
   and only calls `listWorksheets(handle)` once `status === 'ready'`.
3. "Add new work" navigates to `/tamil-homework/new`.
   `TamilHomeworkFormPage` also resolves `useWorksheetsDirectory()`; if it
   settles on anything other than `'ready'`, it redirects back to
   `/tamil-homework` instead of guessing - same pattern as
   `ArithmeticQuestionsPage` redirecting on missing router state.
4. `saveWorksheet(handle, input)` writes one `<uuid>.json` file per
   worksheet directly into the chosen folder via
   `FileSystemFileHandle.createWritable()`, then the page navigates back
   to the list, which re-fetches on mount. See
   `src/features/tamil-homework/CLAUDE.md` for the storage mechanics and
   deliberate tradeoffs (Chrome/Edge only, permission re-prompts).
5. Selected bold ranges travel as safe `{ text, bold }` runs in the same input
   and JSON file; size remains text-wide. Legacy worksheets omit these fields
   and load with normal, non-bold defaults.

## Data flow for Duplicate Media Cleaner

1. `DuplicateMediaPage` asks the user for a read/write directory handle and
   deliberately does not persist it. The page owns scan status, selected file
   IDs, confirmation, and result rendering.
2. `scanDuplicateMedia` recursively enumerates supported photos and videos.
   Exact mode groups by size, builds bounded-memory chunked SHA-256
   fingerprints, and verifies candidate files byte-for-byte. Visual mode uses
   image fingerprints for photos and duration/aspect ratio plus four sampled
   frame fingerprints for videos.
3. Duplicate groups retain live file/parent-directory handles. Bulk selection
   uses `suggestedDuplicateIds` so one keeper remains in every group; the UI
   also disables selecting the final unselected member manually.
4. `deleteSelectedMedia` re-reads each selected file, skips it if its size,
   modified time, or complete byte content changed, and then removes it through
   its parent directory.
   Successful and failed deletions are reported separately.
