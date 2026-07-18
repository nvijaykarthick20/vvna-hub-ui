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
 * Generates a single question, for contexts that need one example rather
 * than a full worksheet (e.g. the multiplication lesson page picking a new
 * worked example).
 */
export function generateSampleQuestion(operation: Operation, digits: DigitCount): ArithmeticQuestion {
  const draft = buildQuestion(operation, digits);
  return { ...draft, id: `sample-${draft.operand1}-${draft.operand2}` };
}

/**
 * Generates QUESTION_COUNT questions for the given operation and digit
 * size. Prefers unique (operand1, operand2) pairs, but falls back to
 * allowing repeats once the possible combinations for a small digit range
 * (e.g. 1-digit subtraction) run out - see this folder's CLAUDE.md.
 */
export function generateQuestions(operation: Operation, digits: DigitCount): ArithmeticQuestion[] {
  const questions: DraftQuestion[] = [];
  const seen = new Set<string>();
  const maxAttempts = QUESTION_COUNT * 40;

  let attempts = 0;
  while (questions.length < QUESTION_COUNT && attempts < maxAttempts) {
    attempts += 1;
    const candidate = buildQuestion(operation, digits);
    const key = `${candidate.operand1}_${candidate.operand2}`;
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(candidate);
  }

  // Fallback for small digit ranges that can't produce QUESTION_COUNT unique
  // pairs (e.g. 1-digit subtraction has only 45 unique ordered pairs).
  while (questions.length < QUESTION_COUNT) {
    questions.push(buildQuestion(operation, digits));
  }

  return questions.map((question, index) => ({
    ...question,
    id: `q${index + 1}-${question.operand1}-${question.operand2}`,
  }));
}
