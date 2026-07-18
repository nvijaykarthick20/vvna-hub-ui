/** Human labels for each place value, indexed by position from the right
 * (0 = ones). Covers every `DigitCount` (1-4) the app supports. */
export const PLACE_LABELS = ['ones', 'tens', 'hundreds', 'thousands'] as const;

export interface MultiplicationStep {
  /** Position of this digit in operand2, counted from the right (0 = ones). */
  place: number;
  /** The raw digit (0-9) of operand2 at this place. */
  digit: number;
  /** What the digit is actually worth, e.g. the tens digit "5" in 56 is worth 50. */
  placeValue: number;
  placeLabel: (typeof PLACE_LABELS)[number];
  /** operand1 * placeValue - the partial product taught at this step. */
  product: number;
}

export interface MultiplicationBreakdown {
  operand1: number;
  operand2: number;
  steps: MultiplicationStep[];
  answer: number;
}

/**
 * Breaks a multiplication problem into the same digit-by-digit steps taught
 * on ArithmeticLearnPage: multiply operand1 by the value of each digit of
 * operand2 (ones first, then tens, ...), then add the partial products.
 * generateQuestions.ts doesn't need this - it only needs the final answer.
 */
export function buildMultiplicationBreakdown(
  operand1: number,
  operand2: number,
): MultiplicationBreakdown {
  const operand2Digits = String(operand2)
    .split('')
    .reverse()
    .map(Number);

  const steps: MultiplicationStep[] = operand2Digits.map((digit, place) => {
    const placeValue = digit * 10 ** place;
    return {
      place,
      digit,
      placeValue,
      placeLabel: PLACE_LABELS[place],
      product: operand1 * placeValue,
    };
  });

  return {
    operand1,
    operand2,
    steps,
    answer: steps.reduce((sum, step) => sum + step.product, 0),
  };
}
