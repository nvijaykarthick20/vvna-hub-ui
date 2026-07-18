interface KolamMotifProps {
  className?: string;
}

/**
 * Decorative motif inspired by pulli kolam - the dot-grid threshold patterns
 * drawn by hand outside Tamil homes each morning. Purely decorative
 * (aria-hidden): a woven loop traced around a diamond lattice of dots.
 * Uses `currentColor` so callers control color/opacity via Tailwind text
 * utilities (see AppShell and FeatureCard for usage).
 */
export function KolamMotif({ className }: KolamMotifProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* dot lattice */}
      <g fill="currentColor">
        {[20, 60, 100, 140, 180].flatMap((cy, row) =>
          [20, 60, 100, 140, 180]
            .filter((_, col) => (row + col) % 2 === 0)
            .map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} />),
        )}
      </g>
      {/* woven loop traced around the lattice */}
      <g stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        <path d="M100 20 C 130 20, 140 30, 140 60 C 140 90, 130 100, 100 100 C 70 100, 60 90, 60 60 C 60 30, 70 20, 100 20 Z" />
        <path d="M100 100 C 130 100, 140 110, 140 140 C 140 170, 130 180, 100 180 C 70 180, 60 170, 60 140 C 60 110, 70 100, 100 100 Z" />
        <path d="M20 100 C 20 70, 30 60, 60 60 C 90 60, 100 70, 100 100 C 100 130, 90 140, 60 140 C 30 140, 20 130, 20 100 Z" />
        <path d="M100 100 C 100 70, 110 60, 140 60 C 170 60, 180 70, 180 100 C 180 130, 170 140, 140 140 C 110 140, 100 130, 100 100 Z" />
      </g>
    </svg>
  );
}
