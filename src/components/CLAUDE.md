# Rules for `src/components/`

This folder is the presentational layer. Read this before adding or editing
anything here - it's a small file on purpose, so you don't need to load the
rest of the repo's context to follow it.

## What belongs here vs. what doesn't

- **Belongs:** components that render UI and take their data via props.
  `Button`, `SelectableCard`, `FeatureCard`, `KolamMotif`, `AppShell`.
- **Does not belong:** arithmetic question generation, routing decisions
  ("what page comes next"), or any business rule. That lives in
  `src/features/<feature>/`. If you find yourself importing
  `generateQuestions` into something in this folder, stop - the logic is in
  the wrong place.
- `components/ui/` = generic, reusable across any future feature (buttons,
  cards, icons). `components/home/` and `components/layout/` = tied to a
  specific part of the shell/home screen. A component only used by one
  feature belongs inside that feature's own folder instead, not here.

## Conventions to follow

- Named exports only (`export function Button(...)`), no default exports.
  This keeps grep/import auto-complete predictable across the codebase.
- Props typed with a local `interface <ComponentName>Props`, declared right
  above the component in the same file - don't centralize prop types in a
  separate file.
- Components are controlled: local `useState` is fine for things like a
  hover/open flag, but selection state that another page needs (like the
  chosen arithmetic operation) is owned by the page/feature, passed down as
  props.
- Every interactive element must be reachable and operable by keyboard:
  real `<button>`/`<a>` elements, visible `focus-visible` styles (see the
  existing `focus-visible:outline-*` classes for the pattern), and `aria-*`
  attributes when the visual state (e.g. "selected") isn't otherwise exposed
  to assistive tech.
- Tailwind only - no inline `style={{ ... }}` and no new CSS files. If a
  design token you need doesn't exist yet, add it to the `@theme` block in
  `src/index.css` rather than hardcoding a raw hex value in a className.
- Decorative-only elements (icons, the kolam motif) get `aria-hidden="true"`.

## Before you add a new component here

Check `src/components/ui/` first - a generic `Button`/`SelectableCard`
variant is usually a smaller diff than a new component.
