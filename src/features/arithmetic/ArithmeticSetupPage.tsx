import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SelectableCard } from '@/components/ui/SelectableCard';
import { Button } from '@/components/ui/Button';
import { OPERATION_LABELS, OPERATION_SYMBOLS } from './generateQuestions';
import type { ArithmeticSelection, DigitCount, Operation } from './types';

const OPERATIONS: Operation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const DIGIT_OPTIONS: { value: DigitCount; sublabel: string }[] = [
  { value: 1, sublabel: '1-9' },
  { value: 2, sublabel: '10-99' },
  { value: 3, sublabel: '100-999' },
  { value: 4, sublabel: '1,000-9,999' },
];

/**
 * Lets the learner choose an operation and a number size, then hands both
 * off to ArithmeticQuestionsPage (via router state) to generate the
 * worksheet. This page never generates questions itself.
 */
export function ArithmeticSetupPage() {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<Operation[]>(['addition']);
  const [digits, setDigits] = useState<DigitCount[]>([2]);

  const isCombo = operations.length > 1;
  const isDigitCombo = digits.length > 1;

  function toggleOperation(op: Operation) {
    setOperations((current) =>
      current.includes(op)
        ? current.filter((selected) => selected !== op)
        : [...current, op],
    );
  }

  function toggleDigits(value: DigitCount) {
    setDigits((current) =>
      current.includes(value)
        ? current.filter((selected) => selected !== value)
        : [...current, value],
    );
  }

  function handleGenerate() {
    if (operations.length === 0 || digits.length === 0) return;
    const selection: ArithmeticSelection = { operations, digits };
    navigate('/arithmetic/questions', { state: selection });
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link to="/" className="font-semibold text-chalkboard">
          &larr; Back to Home
        </Link>
        <p className="mt-4 font-body text-sm font-semibold uppercase tracking-widest text-turmeric-deep">
          Arithmetic practice
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          Set up your worksheet
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Choose one or more operations and one or more number sizes. We&apos;ll generate 50
          questions to practice - pick 2 or more of either to mix them into one worksheet.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-xl font-semibold text-ink">
          Operation{isCombo ? ` (${operations.length} selected)` : ''}
        </legend>
        <div role="group" className="flex flex-wrap gap-3">
          {OPERATIONS.map((op) => (
            <SelectableCard
              key={op}
              role="checkbox"
              label={OPERATION_SYMBOLS[op]}
              sublabel={OPERATION_LABELS[op]}
              selected={operations.includes(op)}
              onSelect={() => toggleOperation(op)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-xl font-semibold text-ink">
          Number size{isDigitCombo ? ` (${digits.length} selected)` : ''}
        </legend>
        <div role="group" className="flex flex-wrap gap-3">
          {DIGIT_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              role="checkbox"
              label={`${option.value}-digit`}
              sublabel={option.sublabel}
              selected={digits.includes(option.value)}
              onSelect={() => toggleDigits(option.value)}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <Button onClick={handleGenerate} disabled={operations.length === 0 || digits.length === 0}>
          Generate 50 questions
        </Button>
      </div>
    </div>
  );
}
