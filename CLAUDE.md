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
   `src/features/tamil-homework/CLAUDE.md`) and read that too - those
   rules are specific and override generic guidance here if the two ever
   conflict.
4. **Coding style questions** (TypeScript strictness, React patterns,
   Tailwind usage, testing) live in `.claude/context/CONVENTIONS.md` - read
   it before your first code change in a session, not on every task.
5. **"Is this in scope for right now?"** is answered by
   `.claude/context/ROADMAP.md` - check it before extending Tamil Homework
   or building any feature beyond arithmetic practice and the existing
   Tamil worksheet list/add flow.

## What this project is

VVNA Hub - a small practice hub. This codebase ships:

- A Home screen with two tiles: **Arithmetic Practice** and **Tamil
  Homework** (both working).
- Arithmetic Practice: choose an operation (addition, subtraction,
  multiplication, division) and a number size (1-4 digits), generate 50
  questions, reveal/hide answers, regenerate, print. In-memory only -
  nothing is saved.
- Tamil Homework: list saved worksheets and add new ones ("Worksheet for",
  "Title", "Text"). Worksheets are saved as real files via the browser's
  File System Access API (Chrome/Edge only) - see
  `src/features/tamil-homework/CLAUDE.md` before touching this.

No backend, no accounts. Tamil worksheets are the one piece of persisted
state in the app; everything else is in-memory. See
`.claude/context/ROADMAP.md` for what's deliberately out of scope.

## Tech stack (versions as of July 2026 - see README.md "Tech stack" table
for the full list with links)

React 19, TypeScript, Vite 8, Tailwind CSS v4, react-router-dom v7, Vitest,
ESLint 9 (flat config), Prettier.

## Commands

| Command             | Purpose                                    |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start the dev server                        |
| `npm run build`      | Type-check (`tsc -b`) then production build |
| `npm run preview`    | Preview the production build locally        |
| `npm run lint`       | ESLint                                      |
| `npm run format`     | Prettier - write                            |
| `npm run typecheck`  | `tsc -b --noEmit` only                      |
| `npm run test`       | Run the Vitest suite once                   |

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
- Don't build out Tamil Homework features beyond what's scoped (currently:
  list + add) speculatively - e.g. no edit/delete/grading until the owner
  asks for it (see ROADMAP.md and `src/features/tamil-homework/CLAUDE.md`).
- When you change a rule documented in a `CLAUDE.md` or `.claude/context/`
  file (a folder's responsibilities, a generation rule, a convention),
  update that file in the same change.
