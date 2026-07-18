import { describe, expect, it } from 'vitest';
import { generateQuestions, QUESTION_COUNT } from './generateQuestions';
import type { DigitCount, Operation } from './types';

const operations: Operation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const digitCounts: DigitCount[] = [1, 2, 3, 4];

describe('generateQuestions', () => {
  for (const operation of operations) {
    for (const digits of digitCounts) {
      it(`generates ${QUESTION_COUNT} correct "${operation}" questions at ${digits} digit(s)`, () => {
        const questions = generateQuestions(operation, digits);

        expect(questions).toHaveLength(QUESTION_COUNT);

        for (const question of questions) {
          switch (question.operation) {
            case 'addition':
              expect(question.answer).toBe(question.operand1 + question.operand2);
              break;
            case 'subtraction':
              expect(question.answer).toBe(question.operand1 - question.operand2);
              expect(question.answer).toBeGreaterThanOrEqual(0);
              break;
            case 'multiplication':
              expect(question.answer).toBe(question.operand1 * question.operand2);
              break;
            case 'division':
              expect(question.answer).toBe(question.operand1 / question.operand2);
              expect(question.operand1 % question.operand2).toBe(0);
              break;
          }
        }
      });
    }
  }

  it('produces unique question ids', () => {
    const questions = generateQuestions('multiplication', 3);
    const ids = new Set(questions.map((question) => question.id));
    expect(ids.size).toBe(QUESTION_COUNT);
  });
});
