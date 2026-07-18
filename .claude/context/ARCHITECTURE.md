# Architecture map

Read this instead of globbing the whole `src/` tree. It tells you which
file(s) to open for a given kind of change - most tasks only need 1-3 files
from this app, not a full-repo read.

## One-paragraph summary

VVNA Hub is a Vite + React 19 + TypeScript single-page app. Client-side
routing (`react-router-dom`) switches between a Home screen and two
features: Arithmetic Practice (fully built) and Tamil Homework (a
placeholder page - see ROADMAP.md). There is no backend, no auth, and no
persistence; every arithmetic worksheet is generated fresh in memory. All
styling is Tailwind CSS v4, configured via the `@theme` block in
`src/index.css` (not a `tailwind.config.js` - v4 doesn't need one for this
project's needs).

## Request-to-file map

| If the task is about...                                | Open this, and usually only this                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Home screen copy, layout, or the two feature tiles       | `src/features/home/HomePage.tsx`, `src/components/home/FeatureCard.tsx` |
| Arithmetic operation/digit picker UI                     | `src/features/arithmetic/ArithmeticSetupPage.tsx`                  |
| How questions are generated / answer correctness         | `src/features/arithmetic/generateQuestions.ts` + its `CLAUDE.md`   |
| The 2/3/4-digit multiplication lesson (worked examples)  | `src/features/arithmetic/ArithmeticLearnPage.tsx` + `multiplicationLesson.ts` |
| The worksheet display, "show answers", print, "new set"  | `src/features/arithmetic/ArithmeticQuestionsPage.tsx`              |
| Tamil Homework placeholder                               | `src/features/tamil-homework/TamilHomeworkPage.tsx`                |
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
  `CLAUDE.md` because its logic has correctness rules worth reading first.
- `src/App.tsx` - route table only.
- `src/main.tsx` - app bootstrap (StrictMode + BrowserRouter + CSS import).
  Rarely needs to change.

## Data flow for the Arithmetic feature (the one stateful flow in the app)

1. `ArithmeticSetupPage` holds `operation` and `digits` in local state.
2. On submit, it calls `navigate(path, { state: { operation, digits } })` -
   the selection travels as router state, not global state or a context
   provider. There is no app-wide store in this project; don't introduce
   one (Redux/Zustand/Context) for this single hand-off without discussing
   it first, since the whole app currently has exactly one piece of
   cross-page state. `path` is `/arithmetic/learn` for multiplication with
   `digits > 1`, otherwise `/arithmetic/questions` directly.
3. `ArithmeticLearnPage` (multiplication, `digits > 1` only) teaches the
   long-multiplication algorithm with a worked example built by
   `multiplicationLesson.ts`, and lets the learner generate a new example as
   many times as they want. "I'm ready" forwards the same selection to
   `/arithmetic/questions`. Like the questions page, it redirects to
   `/arithmetic` if `location.state` doesn't match what it expects, rather
   than guessing.
4. `ArithmeticQuestionsPage` reads `location.state`. If it's missing (direct
   URL access/refresh), it redirects to `/arithmetic` instead of guessing a
   default operation/digit count.
5. `generateQuestions(operation, digits)` produces 50 questions client-side.
   Nothing is persisted - refreshing the questions page loses the set
   (regenerate via "New set" or redo setup).
