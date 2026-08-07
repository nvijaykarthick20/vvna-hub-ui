# Rules for `src/features/arithmetic/`

This is the one folder in the app where getting the logic wrong produces a
worksheet with a wrong answer key - read this before touching
`generateQuestions.ts`.

## Files in this folder

- `types.ts` - the `Operation` / `DigitCount` / `ArithmeticQuestion` /
  `ArithmeticSelection` types. Everything else in the folder (and
  `ArithmeticSetupPage` / `ArithmeticQuestionsPage`) imports from here.
  Both `ArithmeticSelection.operations` and `ArithmeticSelection.digits` are
  non-empty arrays (`Operation[]` / `DigitCount[]`) - a single element in
  either is today's single-choice worksheet, 2+ in either is combo mode.
  There is no separate "combo" type; `isArithmeticSelection` just requires
  both arrays to be non-empty.
- `generateQuestions.ts` - the only place that creates questions. No
  component should call `Math.random()` directly; call `generateQuestions`
  instead so every question is generated the same, tested way.
  `generateQuestions(operations, digits)` always takes two arrays: it builds
  the cross product of every (operation, digit count) pairing, splits
  `QUESTION_COUNT` as evenly as possible across all of those pairings (see
  `distributeCount`), builds each pairing's share with `fillQuestions`, then
  shuffles the combined result so a combo worksheet isn't grouped by
  operation or number size. Uniqueness (`seen`) is a single set shared
  across every pairing in the call, keyed as
  `` `${operation}_${operand1}_${operand2}` `` - keying by operation (not
  digit count) is safe because `digitRange()` gives each digit count a
  disjoint operand range, so e.g. 1-digit and 2-digit addition can never
  produce colliding keys just by mixing digit sizes.
- `generateQuestions.test.ts` - a table test across all 4 operations x all 4
  digit counts, plus a `combo mode` describe block covering even/uneven
  splits, shuffling, and correctness when 2+ operations are mixed. **If you
  change the generation rules below, update this file in the same change**
  - a passing test suite is what makes this logic safe to refactor later.
- `ArithmeticSetupPage.tsx` - collects the operation(s) + digit size(s)
  only. Both the operation picker and the number-size picker are
  multi-select (checkbox semantics via `SelectableCard`'s
  `role="checkbox"`); the learner can pick just one of each (today's
  original single-choice behavior, unchanged) or several of either (combo
  mode). It must not generate questions itself; it hands the selection to
  `ArithmeticQuestionsPage` via router `state`
  (`navigate('/arithmetic/questions', { state })`). Every operation
  (including multiplication at any digit count) goes straight to the
  worksheet - there is no intermediate lesson step.
- `ArithmeticQuestionsPage.tsx` - reads that router `state` and calls
  `generateQuestions`. If `state` is missing (e.g. someone opens the URL
  directly), it redirects to `/arithmetic` rather than guessing - do not
  replace that redirect with a default operation/digit selection. The
  header joins every selected operation's label (e.g. "Addition +
  Multiplication") and every selected digit size (e.g. "1-digit + 2-digit")
  for combo worksheets.

## Rules that are deliberate, not bugs

- **Subtraction never goes negative.** The two random operands are sorted
  so the larger is always `operand1`. If a future request needs negative
  results, add it as an explicit toggle on the setup page - don't just flip
  the sort, or every existing worksheet silently changes behavior.
- **Division always divides evenly.** The generator picks the divisor and
  quotient first, then multiplies them to get the dividend - it does not
  pick a random dividend and divide. This means the dividend can have more
  digits than the digit-count the learner picked (e.g. a 3-digit ÷
  3-digit question can have a 6-digit dividend). That's expected, not a
  bug - do not "fix" it by capping the dividend's size, since that would
  make division questions no longer cleanly divisible for some inputs.
- **1-digit numbers start at 1, not 0.** `digitRange()` treats "1 digit" as
  1-9 so no question has a zero operand. Don't change the lower bound to 0
  without checking `generateQuestions.test.ts` and the digit-size labels
  shown on `ArithmeticSetupPage` (`"1-9"`, `"10-99"`, ...).
- **Uniqueness is best-effort.** The generator tries to avoid repeating the
  same `(operation, operand1, operand2)` triple, but small ranges (like
  1-digit subtraction, which only has 45 unique ordered pairs) can't fill
  their share of the worksheet with unique questions - the fallback loop
  allows repeats only once that operation's unique pool is exhausted. This
  is intentional; don't "fix" it by shrinking `QUESTION_COUNT`.
- **Combo distribution is even, not weighted.** `distributeCount` splits
  `QUESTION_COUNT` as evenly as possible across every (operation, digit
  count) pairing in the combo (remainder going to the first pairings in the
  cross product) - it's not proportional to each pairing's available
  unique-pair pool. Don't change this to a random/weighted split without
  updating `generateQuestions.test.ts`'s combo assertions, which check
  exact counts.
- **Digit-size combo is a cross product, not a parallel selection.**
  Picking 2 operations and 2 digit sizes produces 4 groups (every operation
  x every digit size), not 2. This matches how a learner reads "Addition +
  Multiplication, 1-digit + 2-digit" - they expect all four combinations
  practiced, not addition-only-1-digit paired with
  multiplication-only-2-digit.

## If you add a new operation or a new setting (e.g. negative numbers)

1. Extend the `Operation` (or add a new field to `ArithmeticSelection`) in
   `types.ts` first - this changes every switch statement into a compile
   error until you handle the new case in `generateQuestions.ts`, which is
   the point.
2. Add the new case to `buildQuestion()`, `OPERATION_LABELS`, and
   `OPERATION_SYMBOLS`.
3. Add its row(s) to `generateQuestions.test.ts`.
4. Add the option to the picker in `ArithmeticSetupPage.tsx`.
5. Update `/.claude/context/ROADMAP.md` and the README's "How it works"
   section so they don't go stale.
