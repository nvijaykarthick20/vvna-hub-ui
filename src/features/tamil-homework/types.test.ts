import { describe, expect, it } from 'vitest';
import { isTamilWorksheet, isTamilTextSize } from './types';

const legacyWorksheet = {
  id: 'worksheet-1',
  worksheetFor: 'Anjali',
  title: 'Reading',
  text: 'வணக்கம்',
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
};

describe('Tamil worksheet formatting types', () => {
  it('continues to accept worksheets saved before formatting was added', () => {
    expect(isTamilWorksheet(legacyWorksheet)).toBe(true);
  });

  it('accepts valid selected-bold runs and text-size preferences', () => {
    expect(
      isTamilWorksheet({
        ...legacyWorksheet,
        textRuns: [
          { text: 'வண', bold: true },
          { text: 'க்கம்', bold: false },
        ],
        textSize: 'extra-large',
      }),
    ).toBe(true);
    expect(isTamilTextSize('normal')).toBe(true);
    expect(isTamilTextSize('large')).toBe(true);
    expect(isTamilTextSize('extra-large')).toBe(true);
  });

  it('rejects invalid formatting values in worksheet files', () => {
    expect(
      isTamilWorksheet({
        ...legacyWorksheet,
        textRuns: [{ text: 'வணக்கம்', bold: 'yes' }],
      }),
    ).toBe(false);
    expect(
      isTamilWorksheet({
        ...legacyWorksheet,
        textRuns: [{ text: 'different text', bold: true }],
      }),
    ).toBe(false);
    expect(isTamilWorksheet({ ...legacyWorksheet, textSize: 'huge' })).toBe(false);
  });
});
