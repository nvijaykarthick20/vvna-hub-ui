import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface FeatureCardProps {
  to: string;
  title: string;
  tamilTitle?: string;
  description: string;
  icon: ReactNode;
  status: 'available' | 'coming-soon';
}

/**
 * One tappable tile on the Home screen. Presentational only - it does not
 * know anything about arithmetic or Tamil homework, just renders whatever
 * it's given. See src/components/CLAUDE.md before adding logic here.
 */
export function FeatureCard({
  to,
  title,
  tamilTitle,
  description,
  icon,
  status,
}: FeatureCardProps) {
  const isComingSoon = status === 'coming-soon';

  return (
    <Link
      to={to}
      className="group relative flex flex-col gap-4 rounded-2xl border border-paper-line bg-white/70 p-6 no-underline shadow-card transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep sm:p-8"
    >
      {isComingSoon && (
        <span className="absolute right-5 top-5 rotate-3 rounded-full border-2 border-kumkum px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-kumkum">
          Coming soon
        </span>
      )}

      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-chalkboard text-turmeric">
        {icon}
      </span>

      <div>
        {tamilTitle && (
          <p className="font-body text-sm font-semibold uppercase tracking-wide text-ink-soft">
            {tamilTitle}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      </div>

      <p className="text-ink-soft">{description}</p>

      <span className="mt-auto inline-flex items-center gap-1 font-semibold text-chalkboard">
        {isComingSoon ? 'See status' : 'Start practicing'}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </span>
    </Link>
  );
}
