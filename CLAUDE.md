# CLAUDE.md

Context for AI assistants (Claude Code or similar) working in this repo.
Read this file first on any task. It's kept short on purpose - deeper
context lives in the linked files below and is loaded only when the task
actually needs it, to keep token usage down.

## Read this first, then branch out only as needed

1. **Always read this file.**
2. **Before touching `src/`**, skim `.claude/context/ARCHITECTURE.md` - it
   has a table mapping "kind of task" -> "which file(s) to open", so you
   don't need to read the whole `src/` tree for most changes.
3. **Before writing or editing any component/page/logic**, check whether
   the folder you're in has its own `CLAUDE.md`
   (`src/components/CLAUDE.md`, `src/features/arithmetic/CLAUDE.md`,
   `src/features/tamil-homework/CLAUDE.md`,
   `src/features/duplicate-media/CLAUDE.md`) and read that too - those
   rules are specific and override generic guidance here if the two ever
   conflict.
4. **Coding style questions** (TypeScript strictness, React patterns,
   Tailwind usage, testing) live in `.claude/context/CONVENTIONS.md` - read
   it before your first code change in a session, not on every task.
5. **"Is this in scope for right now?"** is answered by
   `.claude/context/ROADMAP.md` - check it before extending any current
   feature or building another one.

## What this project is

VVNA Hub - a small practice and local-utility hub. This codebase ships:

- A Home screen with three working tiles: **Arithmetic Practice**, **Tamil
  Homework**, and **Duplicate Media Cleaner**.
- Arithmetic Practice: choose one or more operations (addition, subtraction,
  multiplication, division) and number sizes (1-4 digits), generate 50
  questions, enter and submit answers, see correctness and elapsed time,
  regenerate, and print. In-memory only - nothing is saved.
- Tamil Homework: list, add, edit, print, and delete worksheets ("Worksheet
  for", "Title", "Text"), with live Tanglish-to-Tamil conversion. Worksheets
  are saved as real files via the browser's File System Access API
  (Chrome/Edge only) - see
  `src/features/tamil-homework/CLAUDE.md` before touching this.
- Duplicate Media Cleaner: recursively scan a selected folder for exact or
  strict visual photo/video duplicates, review grouped previews, and delete
  selected copies while preserving a keeper. It also uses the File System
  Access API; read `src/features/duplicate-media/CLAUDE.md` before touching it.

No backend, no accounts. Tamil worksheets are the one piece of persisted app
state; duplicate scanning is local and intentionally forgets its selected
folder/results when the page is left. See
`.claude/context/ROADMAP.md` for what's deliberately out of scope.

## Tech stack

Versions are current as of July 2026; see the README's "Tech stack" table for
the full list with links.

React 19, TypeScript, Vite 8, Tailwind CSS v4, react-router-dom v7, Vitest,
ESLint 9 (flat config), Prettier.

## Commands

| Command             | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Start the dev server                        |
| `npm run build`     | Type-check (`tsc -b`) then production build |
| `npm run preview`   | Preview the production build locally        |
| `npm run lint`      | ESLint                                      |
| `npm run format`    | Prettier - write                            |
| `npm run typecheck` | `tsc -b --noEmit` only                      |
| `npm run test`      | Run the Vitest suite once                   |

Run `npm run typecheck` and `npm run lint` before considering a change
done. If you touched `src/features/arithmetic/generateQuestions.ts`, also
run `npm run test` - see that folder's `CLAUDE.md` for why.

## Ground rules

- Don't add a dependency (routing, state management, UI kit, icon library,
  etc.) that isn't already in `package.json` without flagging it first -
  the current stack was deliberately kept minimal for a small app. In
  particular, don't introduce Redux/Zustand/Context for global state; see
  "Data flow" in `.claude/context/ARCHITECTURE.md` for why the app doesn't
  need one yet.
- Don't loosen `tsconfig.app.json` strictness or disable an ESLint rule
  project-wide to make an error go away - fix the code, or use a narrowly
  scoped, commented suppression for that one line.
- Don't weaken Duplicate Media's keeper, change-detection, confirmation, or
  partial-failure safeguards. Browser deletion may be permanent; see that
  feature's `CLAUDE.md` before changing its flow.
- When you change a rule documented in a `CLAUDE.md` or `.claude/context/`
  file (a folder's responsibilities, a generation rule, a convention),
  update that file in the same change.
