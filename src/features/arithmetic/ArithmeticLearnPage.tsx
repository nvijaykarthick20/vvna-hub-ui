import { Fragment, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { generateSampleQuestion } from './generateQuestions';
import { buildMultiplicationBreakdown } from './multiplicationLesson';
import { isArithmeticSelection } from './types';
import type { ArithmeticSelection } from './types';

/**
 * Teaches the long-multiplication algorithm for 2/3/4-digit numbers before
 * handing the learner off to the questions worksheet. Only reachable for
 * selections where `operations` includes `'multiplication'` and
 * `digits > 1` - ArithmeticSetupPage only routes here for that case
 * (whether multiplication is the only operation chosen or part of a combo;
 * 1-digit multiplication and combos without multiplication go straight to
 * the worksheet). If opened directly with a selection that doesn't match,
 * redirect to `/arithmetic` rather than guessing, same as
 * ArithmeticQuestionsPage.
 */
export function ArithmeticLearnPage() {
  const location = useLocation();
  const selection = isArithmeticSelection(location.state) ? location.state : null;

  if (!selection || !selection.operations.includes('multiplication') || selection.digits === 1) {
    return <Navigate to="/arithmetic" replace />;
  }

  return <Lesson selection={selection} />;
}

function Lesson({ selection }: { selection: ArithmeticSelection }) {
  const { digits } = selection;
  const navigate = useNavigate();
  const [example, setExample] = useState(() => generateSampleQuestion('multiplication', digits));
  const breakdown = buildMultiplicationBreakdown(example.operand1, example.operand2);

  function handleNewExample() {
    setExample(generateSampleQuestion('multiplication', digits));
  }

  function handleReady() {
    navigate('/arithmetic/questions', { state: selection });
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link to="/arithmetic" className="font-semibold text-chalkboard">
          &larr; Back to setup
        </Link>
        <p className="mt-4 font-body text-sm font-semibold uppercase tracking-widest text-turmeric-deep">
          Multiplication &middot; {digits}-digit lesson
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          Let&apos;s learn {digits}-digit multiplication
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Big multiplication is just several small multiplications, added together. Multiply the
          top number by each digit of the bottom number - starting with the ones place - then add
          up all the results.
        </p>
      </div>

      <div className="flex flex-col gap-8 rounded-2xl border border-paper-line bg-white/70 p-6 shadow-card sm:p-8 lg:flex-row lg:items-start">
        <div className="grid grid-cols-[auto_1fr] items-end justify-items-end gap-x-3 gap-y-1 self-center font-mono text-2xl text-ink">
          <span />
          <span>{breakdown.operand1.toLocaleString()}</span>
          <span>&times;</span>
          <span>{breakdown.operand2.toLocaleString()}</span>
          <span className="col-span-2 w-full border-t-2 border-ink" />
          {breakdown.steps.map((step) => (
            <Fragment key={step.place}>
              <span />
              <span>{step.product.toLocaleString()}</span>
            </Fragment>
          ))}
          <span className="col-span-2 w-full border-t-2 border-ink" />
          <span />
          <span className="font-semibold text-chalkboard">{breakdown.answer.toLocaleString()}</span>
        </div>

        <ol className="flex flex-1 flex-col gap-3 text-lg text-ink">
          {breakdown.steps.map((step, index) => (
            <li key={step.place}>
              <span className="font-semibold text-chalkboard">Step {index + 1}: </span>
              {step.digit === 0 ? (
                <>
                  The {step.placeLabel} digit is 0, so this step contributes nothing.
                </>
              ) : step.place === 0 ? (
                <>
                  Multiply {breakdown.operand1.toLocaleString()} by the ones digit:{' '}
                  {breakdown.operand1.toLocaleString()} &times; {step.digit} ={' '}
                  {step.product.toLocaleString()}.
                </>
              ) : (
                <>
                  Multiply {breakdown.operand1.toLocaleString()} by the {step.placeLabel} digit,
                  which is worth {step.placeValue.toLocaleString()}:{' '}
                  {breakdown.operand1.toLocaleString()} &times; {step.placeValue.toLocaleString()}{' '}
                  = {step.product.toLocaleString()}.
                </>
              )}
            </li>
          ))}
          <li>
            <span className="font-semibold text-chalkboard">Final step: </span>
            Add up all the partial answers:{' '}
            {breakdown.steps.map((step) => step.product.toLocaleString()).join(' + ')} ={' '}
            {breakdown.answer.toLocaleString()}.
          </li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleNewExample}>
          Try another example
        </Button>
        <Button onClick={handleReady}>I&apos;m ready - start practicing</Button>
      </div>

      <div className="flex gap-6">
        <Link to="/arithmetic" className="font-semibold text-chalkboard">
          &larr; Change setup
        </Link>
        <Link to="/" className="font-semibold text-chalkboard">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
