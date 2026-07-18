# Rules for `src/features/arithmetic/`

This is the one folder in the app where getting the logic wrong produces a
worksheet with a wrong answer key - read this before touching
`generateQuestions.ts`.

## Files in this folder

- `types.ts` - the `Operation` / `DigitCount` / `ArithmeticQuestion` /
  `ArithmeticSelection` types. Everything else in the folder (and
  `ArithmeticSetupPage` / `ArithmeticQuestionsPage`) imports from here.
- `generateQuestions.ts` - the only place that creates questions. No
  component should call `Math.random()` directly; call `generateQuestions`
  instead so every question is generated the same, tested way.
- `generateQuestions.test.ts` - a table test across all 4 operations x all 4
  digit counts. **If you change the generation rules below, update this
  file in the same change** - a passing test suite is what makes this logic
  safe to refactor later.
- `ArithmeticSetupPage.tsx` - collects the operation + digit choice only.
  It must not generate questions itself; it hands the selection to the next
  page via router `state` (`navigate(path, { state })`). For multiplication
  with `digits > 1` that next page is `ArithmeticLearnPage`; otherwise it's
  `ArithmeticQuestionsPage` directly.
- `multiplicationLesson.ts` - `buildMultiplicationBreakdown(operand1,
  operand2)` decomposes a multiplication into the digit-by-digit partial
  products (ones, tens, ...) taught on `ArithmeticLearnPage`. Has its own
  `multiplicationLesson.test.ts` - update it if you change how steps are
  built.
- `ArithmeticLearnPage.tsx` - the long-multiplication lesson shown before
  the worksheet for multiplication with `digits > 1` (1-digit multiplication
  skips straight to the worksheet, same as every other operation). Lets the
  learner regenerate the worked example via `generateSampleQuestion` as many
  times as they want before continuing; only navigates to
  `/arithmetic/questions` when they click "I'm ready". Same "redirect to
  `/arithmetic` instead of guessing" rule applies if `location.state`
  doesn't match `operation: 'multiplication'` and `digits > 1`.
- `ArithmeticQuestionsPage.tsx` - reads that router `state` and calls
  `generateQuestions`. If `state` is missing (e.g. someone opens the URL
  directly), it redirects to `/arithmetic` rather than guessing - do not
  replace that redirect with a default operation/digit count.

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
  same `(operand1, operand2)` pair, but small ranges (like 1-digit
  subtraction, which only has 45 unique ordered pairs) can't fill 50
  unique questions - the fallback loop allows repeats only once the unique
  pool is exhausted. This is intentional; don't "fix" it by shrinking
  `QUESTION_COUNT`.

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
