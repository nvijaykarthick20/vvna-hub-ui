export interface TamilWorksheet {
  id: string;
  worksheetFor: string;
  title: string;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

export interface TamilWorksheetInput {
  worksheetFor: string;
  title: string;
  text: string;
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
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.worksheetFor === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.text === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}
