import { describe, expect, it } from 'vitest';
import { buildMultiplicationBreakdown } from './multiplicationLesson';

describe('buildMultiplicationBreakdown', () => {
  const cases: { operand1: number; operand2: number }[] = [
    { operand1: 234, operand2: 56 },
    { operand1: 7, operand2: 340 },
    { operand1: 1234, operand2: 5678 },
    { operand1: 999, operand2: 101 },
  ];

  for (const { operand1, operand2 } of cases) {
    it(`breaks ${operand1} x ${operand2} into steps that sum to the real product`, () => {
      const breakdown = buildMultiplicationBreakdown(operand1, operand2);

      expect(breakdown.answer).toBe(operand1 * operand2);
      expect(breakdown.steps).toHaveLength(String(operand2).length);

      const reconstructedOperand2 = breakdown.steps.reduce(
        (sum, step) => sum + step.placeValue,
        0,
      );
      expect(reconstructedOperand2).toBe(operand2);

      for (const step of breakdown.steps) {
        expect(step.product).toBe(operand1 * step.placeValue);
      }
    });
  }

  it('labels the first three places ones, tens, hundreds', () => {
    const breakdown = buildMultiplicationBreakdown(12, 345);
    expect(breakdown.steps[0].placeLabel).toBe('ones');
    expect(breakdown.steps[1].placeLabel).toBe('tens');
    expect(breakdown.steps[2].placeLabel).toBe('hundreds');
  });
});
