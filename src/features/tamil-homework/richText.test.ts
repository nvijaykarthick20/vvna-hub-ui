import { describe, expect, it } from 'vitest';
import { normalizeTextRuns, plainTextFromRuns, trimTextRuns } from './richText';

describe('Tamil rich-text helpers', () => {
  it('merges adjacent runs only when their bold formatting matches', () => {
    expect(
      normalizeTextRuns([
        { text: 'வண', bold: true },
        { text: 'க்கம்', bold: true },
        { text: ' நண்பா', bold: false },
      ]),
    ).toEqual([
      { text: 'வணக்கம்', bold: true },
      { text: ' நண்பா', bold: false },
    ]);
  });

  it('reconstructs the plain worksheet text from formatted runs', () => {
    expect(
      plainTextFromRuns([
        { text: 'வணக்கம்', bold: true },
        { text: ' நண்பா', bold: false },
      ]),
    ).toBe('வணக்கம் நண்பா');
  });

  it('trims only the outside whitespace while preserving selected bold ranges', () => {
    expect(
      trimTextRuns([
        { text: '  வணக்கம்', bold: true },
        { text: ' நண்பா  ', bold: false },
      ]),
    ).toEqual([
      { text: 'வணக்கம்', bold: true },
      { text: ' நண்பா', bold: false },
    ]);
  });
});
