export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';

/** Number of digits allowed for each operand. Kept as a union, not `number`,
 * so an out-of-range value is a compile error rather than a runtime bug. */
export type DigitCount = 1 | 2 | 3 | 4;

export interface ArithmeticQuestion {
  id: string;
  operand1: number;
  operand2: number;
  operation: Operation;
  answer: number;
}

export interface ArithmeticSelection {
  /** Non-empty. A single element is today's single-operation worksheet; 2+
   * elements is combo mode (questions are mixed across all of them). */
  operations: Operation[];
  digits: DigitCount;
}

/** Type guard for router `state` handed between arithmetic pages - see
 * ArithmeticQuestionsPage and ArithmeticLearnPage, both of which redirect to
 * `/arithmetic` rather than guessing a default when this fails. */
export function isArithmeticSelection(value: unknown): value is ArithmeticSelection {
  if (typeof value !== 'object' || value === null) return false;
  if (!('operations' in value) || !('digits' in value)) return false;
  const operations = (value as { operations: unknown }).operations;
  return Array.isArray(operations) && operations.length > 0;
}
