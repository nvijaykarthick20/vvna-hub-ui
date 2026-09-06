interface SelectableCardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** `radio` (default) for single-select groups (e.g. digit size); `checkbox`
   * for multi-select groups (e.g. combo operation picker). Controls the
   * exposed a11y role only - selection state is still fully owned by the
   * parent either way. */
  role?: 'radio' | 'checkbox';
}

/**
 * A single choice in a picker group (operation, digit count, etc). Purely
 * presentational and controlled - the parent owns selection state.
 */
export function SelectableCard({
  label,
  sublabel,
  selected,
  onSelect,
  disabled = false,
  role = 'radio',
}: SelectableCardProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={`flex min-w-[6.5rem] flex-1 flex-col items-center gap-1 rounded-xl border-2 px-4 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep ${
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
