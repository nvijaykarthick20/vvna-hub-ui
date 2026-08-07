import type { ArithmeticQuestion, DigitCount, Operation } from './types';

export const QUESTION_COUNT = 50;

export const OPERATION_LABELS: Record<Operation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
};

export const OPERATION_SYMBOLS: Record<Operation, string> = {
  addition: '+',
  subtraction: '\u2212', // minus sign (not a hyphen, renders better in the mono font)
  multiplication: '\u00d7',
  division: '\u00f7',
};

/** Smallest and largest whole number that has exactly `digits` digits.
 * 1-digit numbers start at 1 (not 0) so a question never has a zero operand. */
function digitRange(digits: DigitCount): { min: number; max: number } {
  const min = digits === 1 ? 1 : 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return { min, max };
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomOperand(digits: DigitCount): number {
  const { min, max } = digitRange(digits);
  return randomInRange(min, max);
}

type DraftQuestion = Omit<ArithmeticQuestion, 'id'>;

/**
 * Builds one question. Division is generated "backwards" (pick the divisor
 * and quotient, then multiply to get the dividend) so every division
 * question divides evenly - see CLAUDE.md in this folder for why that's a
 * deliberate choice, not a shortcut to "fix" later.
 */
function buildQuestion(operation: Operation, digits: DigitCount): DraftQuestion {
  switch (operation) {
    case 'addition': {
      const operand1 = randomOperand(digits);
      const operand2 = randomOperand(digits);
      return { operand1, operand2, operation, answer: operand1 + operand2 };
    }
    case 'subtraction': {
      const a = randomOperand(digits);
      const b = randomOperand(digits);
      const operand1 = Math.max(a, b);
      const operand2 = Math.min(a, b);
      return { operand1, operand2, operation, answer: operand1 - operand2 };
    }
    case 'multiplication': {
      const operand1 = randomOperand(digits);
      const operand2 = randomOperand(digits);
      return { operand1, operand2, operation, answer: operand1 * operand2 };
    }
    case 'division': {
      const divisor = randomOperand(digits);
      const quotient = randomOperand(digits);
      const dividend = divisor * quotient;
      return { operand1: dividend, operand2: divisor, operation, answer: quotient };
    }
  }
}

/**
 * Builds `count` questions for one operation, preferring (operation,
 * operand1, operand2) triples not already in `seen` across the whole
 * worksheet - keyed by operation too, so e.g. `3 + 4` and `3 x 4` aren't
 * treated as colliding. Falls back to allowing repeats once the possible
 * combinations for a small digit range (e.g. 1-digit subtraction) run out -
 * see this folder's CLAUDE.md.
 */
function fillQuestions(
  operation: Operation,
  digits: DigitCount,
  count: number,
  seen: Set<string>,
): DraftQuestion[] {
  const questions: DraftQuestion[] = [];
  const maxAttempts = count * 40;

  let attempts = 0;
  while (questions.length < count && attempts < maxAttempts) {
    attempts += 1;
    const candidate = buildQuestion(operation, digits);
    const key = `${operation}_${candidate.operand1}_${candidate.operand2}`;
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(candidate);
  }

  while (questions.length < count) {
    questions.push(buildQuestion(operation, digits));
  }

  return questions;
}

/** Splits `total` into `groupCount` parts as evenly as possible, e.g. 50
 * across 3 groups -> [17, 17, 16]. Used both for splitting across operations
 * and, in combo mode, across every (operation, digits) pairing. */
function distributeCount(groupCount: number, total: number): number[] {
  const base = Math.floor(total / groupCount);
  const remainder = total % groupCount;
  return Array.from({ length: groupCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates QUESTION_COUNT questions total, mixed across every combination
 * of `operations` x `digits`. A single operation and a single digit count
 * reproduces today's single-size worksheet unchanged; selecting more of
 * either splits the count as evenly as possible across every (operation,
 * digits) pairing (see `distributeCount`) and shuffles the combined result
 * so questions aren't grouped by operation or number size.
 */
export function generateQuestions(
  operations: Operation[],
  digits: DigitCount[],
): ArithmeticQuestion[] {
  const seen = new Set<string>();
  const combos = operations.flatMap((operation) =>
    digits.map((digitCount) => ({ operation, digitCount })),
  );
  const counts = distributeCount(combos.length, QUESTION_COUNT);
  const questions = combos.flatMap((combo, index) =>
    fillQuestions(combo.operation, combo.digitCount, counts[index], seen),
  );

  return shuffle(questions).map((question, index) => ({
    ...question,
    id: `q${index + 1}-${question.operation}-${question.operand1}-${question.operand2}`,
  }));
}
