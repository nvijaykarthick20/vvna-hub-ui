# VVNA Hub

A small home-practice and local-utility hub. It ships **Arithmetic Practice**,
**Tamil Homework**, and a privacy-first **Duplicate Media Cleaner** for finding
and removing duplicate photos and videos from a user-selected folder.

Built with React 19, TypeScript, Vite 8, and Tailwind CSS v4.

## Table of contents

- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Coding standards / for AI assistants](#coding-standards--for-ai-assistants)
- [Roadmap](#roadmap)

## Prerequisites

- **Node.js 20.19+ or 22.12+** (required by Vite 8). Check your version:

  ```bash
  node -v
  ```

  If you need to install or upgrade Node, get it from
  [nodejs.org](https://nodejs.org/) or via a version manager like `nvm`.

- **npm 10+** (ships with modern Node). Yarn or pnpm work too if you prefer
  - just swap the commands below for your package manager's equivalents.

## Getting started

```bash
# 1. Move into the project folder
cd vvna-hub-ui

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`) - open it
in your browser. The dev server supports hot module replacement, so edits
to files under `src/` appear immediately without a full reload.

### Building for production

```bash
npm run build      # type-checks, then builds to dist/
npm run preview    # serves the dist/ build locally, to sanity-check it
```

## Available scripts

| Script                 | What it does                                        |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with hot reload           |
| `npm run build`        | Type-check the whole project, then build to `dist/` |
| `npm run preview`      | Serve the `dist/` build locally                     |
| `npm run lint`         | Run ESLint over the project                         |
| `npm run lint:fix`     | Run ESLint and auto-fix what it can                 |
| `npm run format`       | Format the project with Prettier                    |
| `npm run format:check` | Check formatting without writing changes            |
| `npm run typecheck`    | Type-check only, no build output                    |
| `npm run test`         | Run the Vitest test suite once                      |
| `npm run test:watch`   | Run Vitest in watch mode                            |

## How it works

**Home screen** - three tiles: _Arithmetic Practice_, _Tamil Homework_, and
_Duplicate Media Cleaner_.

**Tamil Homework**:

1. Clicking the tile opens a list of saved worksheets. The first time, the
   app asks you to choose a folder on your computer to store them in - it
   remembers that folder for next time (via the File System Access API),
   though your browser may ask you to re-confirm access each session.
2. **Add new work** opens a form with _Worksheet for_, _Title_, and _Text_.
   Tanglish typed in the Text field is converted to Tamil script. Selected
   words can be bold, while the whole Text section can use Normal, Large, or
   Extra Large type; those choices also apply when printing. Saving writes one
   JSON file per worksheet into the chosen folder.
3. Existing worksheets can be edited, printed, or deleted from the list/form
   flow.
4. This only works in Chromium browsers (Chrome, Edge) because it depends on
   the File System Access API.

**Arithmetic Practice**:

1. Choose one or more operations - Addition, Subtraction, Multiplication,
   and/or Division. Picking 2 or more mixes them into one combo worksheet.
2. Choose a number size - 1 digit (1-9) through 4 digits (1,000-9,999).
   This size applies to both numbers in every question, regardless of
   operation.
3. Click **Generate 50 questions**. The app builds 50 questions split as
   evenly as possible across the operations you picked and shuffles them,
   entirely in your browser (nothing is sent to a server).
4. Enter every answer and submit to see correct/incorrect feedback and the
   elapsed time. You can generate a **New set** without changing the setup or
   **Print worksheet** with an ink-friendly layout.

A couple of deliberate rules worth knowing:

- Subtraction questions never produce a negative result - the larger
  number always comes first.
- Division questions are built to divide evenly (no remainders): the app
  picks the divisor and quotient first, then multiplies them to get the
  dividend. That means a division question's first number (the dividend)
  can have more digits than the size you picked - that's expected.

See `src/features/arithmetic/CLAUDE.md` for the full rationale if you're
extending this logic.

**Duplicate Media Cleaner**:

1. Choose exact matching (identical file bytes, safest) or strict visual
   matching (resized/recompressed copies), then choose a folder.
2. The app recursively scans supported photos and videos in that folder and
   its subfolders. Processing is local; media, fingerprints, and filenames are
   never uploaded.
3. Duplicate groups show photo previews or playable video previews, relative
   paths, sizes, dimensions, and video duration when available. Bulk selection
   keeps one suggested original in every group, and the keeper can be changed
   manually.
4. Deletion requires an explicit confirmation. Each file's metadata and full
   byte content are checked again before deletion, and it is left untouched if
   it changed. Browser deletion can bypass the operating-system recycle bin,
   so treat it as permanent.
5. Chrome or Edge is required. Photo formats are JPEG, PNG, WebP, GIF, BMP, and
   AVIF. Video extensions include MP4, M4V, MOV, WebM, OGV, AVI, MKV, WMV,
   MPEG/MPG, and 3GP; exact mode supports their bytes, while visual mode depends
   on whether the browser can decode the video's codec.

## Project structure

```
vvna-hub-ui/
├── CLAUDE.md                     # Start here if you're an AI assistant
├── README.md                     # This file
├── .claude/context/              # Deeper context for AI assistants
│   ├── ARCHITECTURE.md           #   task -> file map
│   ├── CONVENTIONS.md            #   coding conventions
│   └── ROADMAP.md                #   what's in/out of scope right now
├── index.html                    # Vite entry HTML (loads the fonts)
├── vite.config.ts                # Vite + React + Tailwind plugin config
├── tsconfig*.json                # TypeScript project references
├── eslint.config.js              # ESLint 9 flat config
├── .prettierrc.json              # Prettier config
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx                  # App bootstrap (StrictMode, router, CSS)
    ├── App.tsx                   # Route table (thin, on purpose)
    ├── index.css                 # Tailwind import + design tokens (@theme)
    ├── fileSystemAccess.d.ts     # Shared browser file-access declarations
    ├── components/
    │   ├── CLAUDE.md             # Rules for this folder
    │   ├── layout/AppShell.tsx   # Header/footer page frame
    │   ├── home/FeatureCard.tsx  # The Home screen's tappable tiles
    │   └── ui/                   # Button, SelectableCard, icons, KolamMotif
    └── features/
        ├── home/HomePage.tsx
        ├── tamil-homework/
        │   ├── CLAUDE.md              # Rules for the file-storage logic
        │   ├── types.ts
        │   ├── worksheetStorage.ts
        │   ├── useWorksheetsDirectory.ts
        │   ├── TamilHomeworkListPage.tsx
        │   └── TamilHomeworkFormPage.tsx
        ├── arithmetic/
        │   ├── CLAUDE.md              # Rules for question-generation logic
        │   ├── types.ts
        │   ├── generateQuestions.ts
        │   ├── generateQuestions.test.ts
        │   ├── ArithmeticSetupPage.tsx
        │   └── ArithmeticQuestionsPage.tsx
        └── duplicate-media/
            ├── CLAUDE.md              # Matching and deletion safety rules
            ├── types.ts
            ├── duplicateMedia.ts      # Scan, match, select, and delete logic
            ├── duplicateMedia.test.ts
            └── DuplicateMediaPage.tsx
```

## Tech stack

| Package                                      | Version (as configured) | Notes                                                   |
| -------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| [React](https://react.dev)                   | ^19.2.7                 | UI library                                              |
| [TypeScript](https://www.typescriptlang.org) | ^5.9.3                  | Type checking (`tsc -b`)                                |
| [Vite](https://vite.dev)                     | ^8.1.4                  | Dev server + build tool (Rolldown-based bundler)        |
| [Tailwind CSS](https://tailwindcss.com)      | ^4.3.2                  | Utility CSS, configured via `@theme` in `src/index.css` |
| [react-router-dom](https://reactrouter.com)  | ^7.18.1                 | Client-side routing                                     |
| [Vitest](https://vitest.dev)                 | ^3.0.4                  | Unit tests                                              |
| [ESLint](https://eslint.org)                 | ^9.19.0                 | Linting, flat config (`eslint.config.js`)               |
| [Prettier](https://prettier.io)              | ^3.4.2                  | Formatting                                              |

Exact installed versions are locked in `package-lock.json` after your first
`npm install` - the table above reflects what `package.json` requests.

## Coding standards / for AI assistants

This repo is set up so an AI coding assistant (or a new teammate) can work
in it efficiently:

- **`CLAUDE.md`** (repo root) is the main entry point - project summary,
  commands, and ground rules.
- **`.claude/context/`** holds deeper reference docs (architecture map,
  conventions, roadmap) that are only needed for certain tasks, so they're
  split out instead of bloating the root file.
- **Nested `CLAUDE.md` files** (`src/components/CLAUDE.md`,
  `src/features/arithmetic/CLAUDE.md`,
  `src/features/tamil-homework/CLAUDE.md`,
  `src/features/duplicate-media/CLAUDE.md`) hold rules specific to that
  folder, like why division is generated the way it is, or how the File
  System Access permission flow behaves.

If you're using Claude Code, it will pick these up automatically. If you're
using a different assistant, point it at `CLAUDE.md` first.

## Roadmap

This codebase ships Arithmetic Practice, Tamil Homework, and photo/video
duplicate cleaning. See `.claude/context/ROADMAP.md` for the current
in-scope/out-of-scope list.

## License

Not yet set - add one (e.g. MIT) before distributing this publicly.
