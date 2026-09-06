export type TamilTextSize = 'normal' | 'large' | 'extra-large';

export interface TamilTextRun {
  text: string;
  bold: boolean;
}

export interface TamilWorksheet {
  id: string;
  worksheetFor: string;
  title: string;
  text: string;
  /** Optional so worksheets saved before selection formatting was added still load. */
  textRuns?: TamilTextRun[];
  /** Optional so worksheets saved before formatting was added still load. */
  textSize?: TamilTextSize;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

export interface TamilWorksheetInput {
  worksheetFor: string;
  title: string;
  text: string;
  textRuns: TamilTextRun[];
  textSize: TamilTextSize;
}

export function isTamilTextSize(value: unknown): value is TamilTextSize {
  return value === 'normal' || value === 'large' || value === 'extra-large';
}

/** Type guard for worksheet JSON read back from disk - a file could be
 * corrupt or foreign, so callers should skip rather than throw when this
 * returns false (see `listWorksheets` in `worksheetStorage.ts`). */
export function isTamilWorksheet(value: unknown): value is TamilWorksheet {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as {
    id?: unknown;
    worksheetFor?: unknown;
    title?: unknown;
    text?: unknown;
    textRuns?: unknown;
    textSize?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  const hasValidTextRuns =
    candidate.textRuns === undefined ||
    (Array.isArray(candidate.textRuns) &&
      candidate.textRuns.every(
        (run) =>
          typeof run === 'object' &&
          run !== null &&
          typeof (run as { text?: unknown }).text === 'string' &&
          typeof (run as { bold?: unknown }).bold === 'boolean',
      ) &&
      candidate.textRuns.map((run) => (run as TamilTextRun).text).join('') === candidate.text);

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.worksheetFor === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.text === 'string' &&
    hasValidTextRuns &&
    (candidate.textSize === undefined || isTamilTextSize(candidate.textSize)) &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}
