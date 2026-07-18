import { Link } from 'react-router-dom';
import { BookIcon } from '@/components/ui/icons';

/**
 * Placeholder for Tamil Homework. Phase 1 only needs this "in progress"
 * state - do not add real Tamil-homework logic here until that phase is
 * scoped (see /.claude/context/ROADMAP.md).
 */
export function TamilHomeworkPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-2xl border border-paper-line bg-white/70 px-8 py-14 text-center shadow-card">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-chalkboard text-turmeric">
        <BookIcon className="h-8 w-8" />
      </span>

      <span className="rounded-full border-2 border-kumkum px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-kumkum">
        Coming soon
      </span>

      <h1 className="font-display text-3xl font-semibold text-ink">
        தமிழ் வீட்டுப்பாடம் is on its way
      </h1>
      <p className="text-ink-soft">
        This feature is under development. Reading, writing, and grammar practice for Tamil
        homework will land in a future update.
      </p>

      <Link
        to="/"
        className="mt-2 rounded-full bg-chalkboard px-6 py-3 font-semibold text-chalk no-underline transition-colors hover:bg-chalkboard-deep"
      >
        Back to Home
      </Link>
    </div>
  );
}
