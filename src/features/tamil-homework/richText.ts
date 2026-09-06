import type { TamilTextRun } from './types';

export function normalizeTextRuns(runs: TamilTextRun[]): TamilTextRun[] {
  const normalized: TamilTextRun[] = [];
  for (const run of runs) {
    if (run.text === '') continue;
    const previous = normalized.at(-1);
    if (previous?.bold === run.bold) previous.text += run.text;
    else normalized.push({ ...run });
  }
  return normalized;
}

export function plainTextFromRuns(runs: TamilTextRun[]): string {
  return runs.map((run) => run.text).join('');
}

export function trimTextRuns(runs: TamilTextRun[]): TamilTextRun[] {
  const normalized = normalizeTextRuns(runs);
  const text = plainTextFromRuns(normalized);
  const trimmed = text.trim();
  if (trimmed === '') return [];

  const start = text.indexOf(trimmed);
  const end = start + trimmed.length;
  const result: TamilTextRun[] = [];
  let offset = 0;

  for (const run of normalized) {
    const runStart = offset;
    const runEnd = offset + run.text.length;
    const overlapStart = Math.max(start, runStart);
    const overlapEnd = Math.min(end, runEnd);
    if (overlapStart < overlapEnd) {
      result.push({
        text: run.text.slice(overlapStart - runStart, overlapEnd - runStart),
        bold: run.bold,
      });
    }
    offset = runEnd;
  }

  return normalizeTextRuns(result);
}
