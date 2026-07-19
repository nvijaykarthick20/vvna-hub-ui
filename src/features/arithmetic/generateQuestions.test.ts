import { describe, expect, it } from 'vitest';
import { generateQuestions, QUESTION_COUNT } from './generateQuestions';
import type { DigitCount, Operation } from './types';

const operations: Operation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const digitCounts: DigitCount[] = [1, 2, 3, 4];

function expectCorrectAnswer(question: ReturnType<typeof generateQuestions>[number]) {
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

describe('generateQuestions', () => {
  for (const operation of operations) {
    for (const digits of digitCounts) {
      it(`generates ${QUESTION_COUNT} correct "${operation}" questions at ${digits} digit(s)`, () => {
        const questions = generateQuestions([operation], digits);

        expect(questions).toHaveLength(QUESTION_COUNT);

        for (const question of questions) {
          expect(question.operation).toBe(operation);
          expectCorrectAnswer(question);
        }
      });
    }
  }

  it('produces unique question ids', () => {
    const questions = generateQuestions(['multiplication'], 3);
    const ids = new Set(questions.map((question) => question.id));
    expect(ids.size).toBe(QUESTION_COUNT);
  });

  describe('combo mode', () => {
    it('splits questions as evenly as possible across 2 selected operations', () => {
      const questions = generateQuestions(['addition', 'subtraction'], 2);

      expect(questions).toHaveLength(QUESTION_COUNT);
      expect(questions.filter((q) => q.operation === 'addition')).toHaveLength(25);
      expect(questions.filter((q) => q.operation === 'subtraction')).toHaveLength(25);
    });

    it('splits an uneven count across 3 selected operations', () => {
      const questions = generateQuestions(['addition', 'subtraction', 'multiplication'], 2);
      const counts = ['addition', 'subtraction', 'multiplication'].map(
        (op) => questions.filter((q) => q.operation === op).length,
      );

      expect(questions).toHaveLength(QUESTION_COUNT);
      expect(counts.sort()).toEqual([16, 17, 17]);
    });

    it('mixes all 4 operations and every question stays correct per its own operation', () => {
      const questions = generateQuestions(operations, 2);

      expect(questions).toHaveLength(QUESTION_COUNT);
      for (const operation of operations) {
        expect(questions.some((q) => q.operation === operation)).toBe(true);
      }
      for (const question of questions) {
        expectCorrectAnswer(question);
      }
    });

    it('shuffles the combined worksheet instead of grouping by operation', () => {
      const questions = generateQuestions(['addition', 'subtraction'], 2);

      let switches = 0;
      for (let i = 1; i < questions.length; i += 1) {
        if (questions[i].operation !== questions[i - 1].operation) switches += 1;
      }

      // Unshuffled (25 of one operation followed by 25 of the other) would
      // produce exactly 1 switch. A real shuffle produces many more.
      expect(switches).toBeGreaterThan(5);
    });

    it('fills a small-digit-range combo (limited unique operand pairs) without breaking correctness', () => {
      // 1-digit addition and multiplication each only have 81 unique
      // ordered operand pairs to draw from - make sure sharing one `seen`
      // set across operations (keyed per-operation, see generateQuestions.ts)
      // still produces a full, correct worksheet.
      const questions = generateQuestions(['addition', 'multiplication'], 1);
      expect(questions).toHaveLength(QUESTION_COUNT);
      for (const question of questions) {
        expectCorrectAnswer(question);
      }
    });

    it('produces unique question ids for a combo worksheet', () => {
      const questions = generateQuestions(['addition', 'division'], 3);
      const ids = new Set(questions.map((question) => question.id));
      expect(ids.size).toBe(QUESTION_COUNT);
    });
  });
});
