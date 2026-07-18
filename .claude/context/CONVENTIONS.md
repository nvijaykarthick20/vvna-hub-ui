# Coding conventions

Applies repo-wide, on top of anything folder-specific in a nested
`CLAUDE.md` (`src/components/CLAUDE.md`,
`src/features/arithmetic/CLAUDE.md`). Folder-specific rules win if they
ever conflict with something here.

## TypeScript

- `strict` is on, plus `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  `noPropertyAccessFromIndexSignature`, and `verbatimModuleSyntax`. Don't
  loosen any of these in `tsconfig.app.json` to silence an error - fix the
  code instead. If a rule is genuinely wrong for a specific line, use a
  narrowly-scoped `// eslint-disable-next-line` / `@ts-expect-error` with a
  comment explaining why, not a project-wide config change.
- `verbatimModuleSyntax` means: if an import is only used as a type, import
  it with `import type { Foo } from '...'`, not `import { Foo }`. Mixed
  imports use `import { value, type Foo } from '...'`.
- No `any`. Prefer a precise union (see `Operation`, `DigitCount` in
  `src/features/arithmetic/types.ts`) over widening to `string`/`number`
  when the valid values are a small known set - it turns a typo into a
  compile error instead of a runtime bug.
- Path alias `@/*` maps to `src/*` (see `tsconfig.app.json` and
  `vite.config.ts`). Use it for cross-folder imports
  (`@/components/ui/Button`); same-folder imports stay relative (`./types`).

## React

- Function components only, named exports (see
  `src/components/CLAUDE.md` for the components-folder-specific version of
  this rule).
- Co-locate a component's prop `interface` in the same file, directly above
  the component.
- Keep pages (`src/features/*/**Page.tsx`) thin: they compose components
  and own the state that's specific to that screen. Business logic (like
  question generation) lives in a plain `.ts` file the page imports, so it
  can be unit-tested without rendering anything.
- No global state library (Redux/Zustand/Context/etc.) exists in this
  project yet. The app currently has exactly one piece of cross-page state
  (the arithmetic operation/digit selection), passed via router `state` -
  see ARCHITECTURE.md. Don't add a state library to solve a problem this
  small; if a real cross-cutting state need shows up later, raise it rather
  than defaulting to one.

## Styling

- Tailwind CSS v4, configured via the `@theme` block in `src/index.css` -
  there is no `tailwind.config.js` in this project (v4 doesn't require one
  unless you need JS-driven config, which this app doesn't). All brand
  colors, fonts, and the card shadow are theme tokens there
  (`--color-chalkboard`, `--font-display`, `--shadow-card`, etc.) - use the
  matching utility class (`bg-chalkboard`, `font-display`, `shadow-card`)
  rather than a raw Tailwind color or a hardcoded hex value.
- No inline `style={{ }}`, no new `.css`/`.module.css` files. If you need a
  new token, add it to the `@theme` block first.
- Keyboard and screen-reader support are not optional: every clickable
  control needs a visible `focus-visible` state (copy the existing
  `focus-visible:outline-*` pattern) and correct semantics (`role="radio"` +
  `aria-checked` for the existing pickers, `aria-hidden="true"` on purely
  decorative SVGs).

## Testing

- `vitest` is configured (`npm run test`). Business logic that isn't
  "render some JSX" - i.e. anything like `generateQuestions.ts` - should
  have a table-style unit test next to it (see
  `generateQuestions.test.ts`). UI-only components don't need tests unless
  they gain non-trivial logic.

## Formatting & linting

- Prettier (`npm run format`) and ESLint flat config (`npm run lint`) are
  both configured. Run both before considering a change done; CI (if you
  add one) should do the same.

## Commit-worthy hygiene

- Update the relevant `CLAUDE.md` / context file in the same change if you
  add a new top-level folder, a new route, or change a rule described here
  - stale docs cost more tokens later than updating them now.
