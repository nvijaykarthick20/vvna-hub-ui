# Architecture map

Read this instead of globbing the whole `src/` tree. It tells you which
file(s) to open for a given kind of change - most tasks only need 1-3 files
from this app, not a full-repo read.

## One-paragraph summary

VVNA Hub is a Vite + React 19 + TypeScript single-page app. Client-side
routing (`react-router-dom`) switches between a Home screen and two
features: Arithmetic Practice (fully built, in-memory only) and Tamil
Homework (list + add worksheets, persisted as real files via the File
System Access API - see ROADMAP.md). There is no backend and no auth;
every arithmetic worksheet is generated fresh in memory, and Tamil
worksheets are saved to a folder the user picks in-browser, not to a
server. All styling is Tailwind CSS v4, configured via the `@theme` block
in `src/index.css` (not a `tailwind.config.js` - v4 doesn't need one for
this project's needs).

## Request-to-file map

| If the task is about...                                | Open this, and usually only this                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Home screen copy, layout, or the two feature tiles       | `src/features/home/HomePage.tsx`, `src/components/home/FeatureCard.tsx` |
| Arithmetic operation/digit picker UI                     | `src/features/arithmetic/ArithmeticSetupPage.tsx`                  |
| How questions are generated / answer correctness         | `src/features/arithmetic/generateQuestions.ts` + its `CLAUDE.md`   |
| The worksheet display, "show answers", print, "new set"  | `src/features/arithmetic/ArithmeticQuestionsPage.tsx`              |
| Tamil Homework list / worksheet form                      | `src/features/tamil-homework/TamilHomeworkListPage.tsx`, `TamilHomeworkNewPage.tsx` |
| How Tamil worksheets are saved/read (File System Access)  | `src/features/tamil-homework/worksheetStorage.ts` + its `CLAUDE.md` |
| Header, footer, page frame, the kolam motif               | `src/components/layout/AppShell.tsx`, `src/components/ui/KolamMotif.tsx` |
| Adding a route                                            | `src/App.tsx` only - it's intentionally a thin route map            |
| Colors, fonts, spacing tokens                             | `src/index.css` (`@theme` block) - see CONVENTIONS.md before adding a raw hex value elsewhere |
| Build/dev tooling (Vite, TS, ESLint, Prettier)             | `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc.json` |
| What's planned but not built yet                          | `.claude/context/ROADMAP.md`                                        |

## Folder roles

- `src/components/` - presentational, reusable, no business logic. Has its
  own `CLAUDE.md`.
- `src/features/<name>/` - one folder per user-facing feature. Owns its own
  types, logic, and pages. `src/features/arithmetic/` has its own
  `CLAUDE.md` because its logic has correctness rules worth reading first;
  `src/features/tamil-homework/` has its own `CLAUDE.md` because it's the
  one feature that talks to the real file system, with non-obvious browser
  permission behavior worth reading before touching it.
- `src/App.tsx` - route table only.
- `src/main.tsx` - app bootstrap (StrictMode + BrowserRouter + CSS import).
  Rarely needs to change.

## Data flow for the Arithmetic feature (the one stateful flow in the app)

1. `ArithmeticSetupPage` holds `operation` and `digits` in local state.
2. On submit, it calls `navigate('/arithmetic/questions', { state: { operation, digits } })` -
   the selection travels as router state, not global state or a context
   provider. There is no app-wide store in this project; don't introduce
   one (Redux/Zustand/Context) for this single hand-off without discussing
   it first, since the whole app currently has exactly one piece of
   cross-page state.
3. `ArithmeticQuestionsPage` reads `location.state`. If it's missing (direct
   URL access/refresh), it redirects to `/arithmetic` instead of guessing a
   default operation/digit count.
4. `generateQuestions(operation, digits)` produces 50 questions client-side.
   Nothing is persisted - refreshing the questions page loses the set
   (regenerate via "New set" or redo setup).

## Data flow for the Tamil Homework feature (the one persisted flow in the app)

1. `useWorksheetsDirectory()` resolves where worksheets live: a
   `FileSystemDirectoryHandle` persisted in IndexedDB
   (`directoryHandleStore.ts`) plus its *live* permission state (queried
   fresh every mount, since Chromium can require a new user gesture to
   reuse a handle's permission each session). It returns a
   `DirectoryStatus`, not a global store - `TamilHomeworkListPage` and
   `TamilHomeworkNewPage` each mount it independently, the same way
   arithmetic pages each read `location.state` independently rather than
   sharing a context provider. Don't introduce Context/Redux/Zustand to
   share this between the two pages.
2. `TamilHomeworkListPage` renders a different body per `DirectoryStatus`
   (unsupported browser / choose a folder / re-grant permission / ready),
   and only calls `listWorksheets(handle)` once `status === 'ready'`.
3. "Add new work" navigates to `/tamil-homework/new`.
   `TamilHomeworkNewPage` also resolves `useWorksheetsDirectory()`; if it
   settles on anything other than `'ready'`, it redirects back to
   `/tamil-homework` instead of guessing - same pattern as
   `ArithmeticQuestionsPage` redirecting on missing router state.
4. `saveWorksheet(handle, input)` writes one `<uuid>.json` file per
   worksheet directly into the chosen folder via
   `FileSystemFileHandle.createWritable()`, then the page navigates back
   to the list, which re-fetches on mount. See
   `src/features/tamil-homework/CLAUDE.md` for the storage mechanics and
   deliberate tradeoffs (Chrome/Edge only, permission re-prompts).
