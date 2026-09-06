import { FeatureCard } from '@/components/home/FeatureCard';
import { CalculatorIcon, BookIcon, PhotoStackIcon } from '@/components/ui/icons';

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
          Pick a practice activity, or use the local media cleaner to safely review duplicate photos
          and videos before removing extra copies.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        <FeatureCard
          to="/duplicate-media"
          title="Duplicate Media Cleaner"
          description="Scan a folder for duplicate photos and videos, compare the matches, and remove extra copies while keeping an original."
          icon={<PhotoStackIcon />}
          status="available"
          actionLabel="Find duplicates"
        />
      </div>
    </div>
  );
}
