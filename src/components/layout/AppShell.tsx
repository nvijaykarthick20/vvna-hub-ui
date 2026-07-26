import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { KolamMotif } from '@/components/ui/KolamMotif';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Shared page frame: the chalkboard header (with the kolam signature motif)
 * plus a consistent content container and footer. Individual pages render
 * inside <main> and should not repeat this chrome.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-paper print:bg-white">
      <header className="no-print relative overflow-hidden bg-chalkboard">
        <KolamMotif className="pointer-events-none absolute -top-10 right-[-4rem] h-64 w-64 text-turmeric/15 sm:h-80 sm:w-80" />
        <div className="relative mx-auto flex max-w-5xl items-center gap-3 px-6 py-6">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-turmeric/70 bg-chalkboard-deep">
              <span className="h-2.5 w-2.5 rounded-full bg-turmeric" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight text-chalk">
              VVNA Hub
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6 sm:py-8">{children}</main>

      <footer className="no-print border-t border-paper-line/70 px-6 py-6 text-center text-sm text-ink-soft">
        Built for daily practice, one worksheet at a time.
      </footer>
    </div>
  );
}
