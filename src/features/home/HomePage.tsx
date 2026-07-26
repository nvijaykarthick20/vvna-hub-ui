import { FeatureCard } from '@/components/home/FeatureCard';
import { CalculatorIcon, BookIcon } from '@/components/ui/icons';

/**
 * Landing screen: pick a subject to practice. Add new subjects here as they
 * ship - see /.claude/context/ROADMAP.md for what's planned next.
 */
export function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-2xl">
        <p className="font-body text-sm font-semibold uppercase tracking-widest text-turmeric-deep">
          Today&apos;s practice
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          What are we studying today?
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Pick a subject below. Arithmetic Practice builds a fresh 50-question worksheet every
          time - choose the operation and the number size, and go.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FeatureCard
          to="/arithmetic"
          title="Arithmetic Practice"
          description="Addition, subtraction, multiplication, or division - choose your operation and number size, then get 50 fresh questions."
          icon={<CalculatorIcon />}
          status="available"
        />
        <FeatureCard
          to="/tamil-homework"
          title="Tamil Homework"
          tamilTitle="தமிழ் வீட்டுப்பாடம்"
          description="Reading, writing, and grammar practice for Tamil homework."
          icon={<BookIcon />}
          status="available"
        />
      </div>
    </div>
  );
}
