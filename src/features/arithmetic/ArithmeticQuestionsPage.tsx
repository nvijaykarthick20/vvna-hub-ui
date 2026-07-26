import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { CheckIcon, CrossIcon } from '@/components/ui/icons';
import { generateQuestions, OPERATION_LABELS, OPERATION_SYMBOLS } from './generateQuestions';
import { isArithmeticSelection } from './types';
import type { ArithmeticQuestion, ArithmeticSelection } from './types';

/**
 * Renders the 50-question worksheet for the operation/digits chosen on
 * ArithmeticSetupPage (passed via router state). If this page is opened
 * directly - e.g. a hard refresh - there is no selection to work from, so
 * we send the learner back to set one up rather than guessing.
 */
export function ArithmeticQuestionsPage() {
  const location = useLocation();
  const selection = isArithmeticSelection(location.state) ? location.state : null;

  if (!selection) {
    return <Navigate to="/arithmetic" replace />;
  }

  return <Worksheet selection={selection} />;
}

function Worksheet({ selection }: { selection: ArithmeticSelection }) {
  const { operations, digits } = selection;
  const [questions, setQuestions] = useState<ArithmeticQuestion[]>(() =>
    generateQuestions(operations, digits),
  );
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  const allAnswered = questions.every(
    (question) => (userAnswers[question.id] ?? '').trim() !== '',
  );

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isTimerRunning, startedAt]);

  function handleAnswerChange(id: string, value: string) {
    const digitsOnly = value.replace(/\D/g, '');
    setUserAnswers((previous) => ({ ...previous, [id]: digitsOnly }));
    setSubmitted(false);
    setIsTimerRunning(true);
  }

  function handleSubmit() {
    setSubmitted(true);
    setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    setIsTimerRunning(false);
  }

  function handleNewSet() {
    setQuestions(generateQuestions(operations, digits));
    setUserAnswers({});
    setSubmitted(false);
    setStartedAt(Date.now());
    setElapsedSeconds(0);
    setIsTimerRunning(true);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-body text-sm font-semibold uppercase tracking-widest text-turmeric-deep">
            {operations.map((operation) => OPERATION_LABELS[operation]).join(' + ')} &middot;{' '}
            {digits}-digit
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            50 questions to practice
          </h1>
          <p className="mt-2 font-mono text-sm text-ink-soft">
            {submitted ? 'Completed in ' : 'Time: '}
            {formatDuration(elapsedSeconds)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleNewSet}>
            New set
          </Button>
          <Button onClick={handleSubmit} disabled={!allAnswered}>
            Submit answers
          </Button>
          <Button onClick={() => window.print()}>Print worksheet</Button>
        </div>
      </div>

      <ol className="grid list-none grid-cols-1 gap-x-8 gap-y-4 rounded-2xl border border-paper-line bg-white/70 p-6 shadow-card sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
        {questions.map((question, index) => {
          const userAnswer = userAnswers[question.id] ?? '';
          const isCorrect = submitted && Number(userAnswer) === question.answer;

          return (
            <li
              key={question.id}
              className="flex items-baseline gap-2 border-b border-paper-line/70 pb-3 font-mono text-lg text-ink"
            >
              <span className="w-7 shrink-0 text-sm text-ink-soft">{index + 1}.</span>
              <span className="flex flex-1 flex-wrap items-baseline gap-2">
                <span>
                  {question.operand1} {OPERATION_SYMBOLS[question.operation]} {question.operand2} =
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={userAnswer}
                  onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                  aria-label={`Answer for question ${index + 1}`}
                  className="w-20 rounded-md border border-paper-line bg-white px-2 py-1 font-mono text-lg text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep"
                />
                {submitted && (
                  <span
                    className={`inline-flex items-center ${isCorrect ? 'text-chalkboard' : 'text-kumkum'}`}
                  >
                    {isCorrect ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <CrossIcon className="h-5 w-5" />
                    )}
                    <span className="sr-only">{isCorrect ? 'Correct' : 'Incorrect'}</span>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="no-print flex gap-6">
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

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
