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
  const [operation, setOperation] = useState<Operation>('addition');
  const [digits, setDigits] = useState<DigitCount>(2);

  // Multiplication beyond 1 digit gets a worked-example lesson first - see
  // ArithmeticLearnPage. Every other combination goes straight to the
  // worksheet, as before.
  const needsLesson = operation === 'multiplication' && digits > 1;

  function handleGenerate() {
    const selection: ArithmeticSelection = { operation, digits };
    navigate(needsLesson ? '/arithmetic/learn' : '/arithmetic/questions', { state: selection });
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
          Choose an operation and a number size. We&apos;ll generate 50 questions to practice.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-xl font-semibold text-ink">Operation</legend>
        <div role="radiogroup" className="flex flex-wrap gap-3">
          {OPERATIONS.map((op) => (
            <SelectableCard
              key={op}
              label={OPERATION_SYMBOLS[op]}
              sublabel={OPERATION_LABELS[op]}
              selected={operation === op}
              onSelect={() => setOperation(op)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-xl font-semibold text-ink">Number size</legend>
        <div role="radiogroup" className="flex flex-wrap gap-3">
          {DIGIT_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              label={`${option.value}-digit`}
              sublabel={option.sublabel}
              selected={digits === option.value}
              onSelect={() => setDigits(option.value)}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <Button onClick={handleGenerate}>
          {needsLesson ? `Learn ${digits}-digit multiplication` : 'Generate 50 questions'}
        </Button>
      </div>
    </div>
  );
}
