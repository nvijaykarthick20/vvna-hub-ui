interface SelectableCardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A single choice in a picker group (operation, digit count, etc). Purely
 * presentational and controlled - the parent owns selection state.
 */
export function SelectableCard({ label, sublabel, selected, onSelect }: SelectableCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-w-[6.5rem] flex-1 flex-col items-center gap-1 rounded-xl border-2 px-4 py-4 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep ${
        selected
          ? 'border-chalkboard bg-chalkboard text-chalk'
          : 'border-paper-line bg-white/70 text-ink hover:border-chalkboard/50'
      }`}
    >
      <span className="font-display text-2xl font-semibold">{label}</span>
      {sublabel && (
        <span className={`text-xs ${selected ? 'text-chalk/70' : 'text-ink-soft'}`}>
          {sublabel}
        </span>
      )}
    </button>
  );
}
