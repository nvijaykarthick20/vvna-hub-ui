import { describe, expect, it } from 'vitest';
import { convertTrailingWord, convertWordBeforeCursor } from './tanglishInput';

describe('convertWordBeforeCursor', () => {
  it('converts the word right before a space just typed', () => {
    const result = convertWordBeforeCursor('vanakkam ', 9);
    expect(result).not.toBeNull();
    expect(result?.text).toBe('வணக்கம் ');
    expect(result?.cursor).toBe(8);
  });

  it('leaves earlier, already-converted Tamil text untouched', () => {
    const result = convertWordBeforeCursor('வணக்கம் nandri ', 15);
    expect(result?.text).toBe('வணக்கம் நன்றி ');
  });

  it('returns null when the cursor is not right after a boundary char', () => {
    expect(convertWordBeforeCursor('vanakkam', 8)).toBeNull();
  });

  it('returns null for a word with no Tamil conversion (numbers, symbols)', () => {
    expect(convertWordBeforeCursor('123 ', 4)).toBeNull();
  });

  it('returns null at the very start of the text', () => {
    expect(convertWordBeforeCursor(' ', 0)).toBeNull();
  });
});

describe('convertTrailingWord', () => {
  it('converts a trailing word with no following boundary char', () => {
    // Earlier words are already-converted Tamil by the time this runs (via
    // convertWordBeforeCursor on the space after them) - only the trailing
    // word, typed but not yet followed by a boundary char, is still Latin.
    expect(convertTrailingWord('வணக்கம் nandri')).toBe('வணக்கம் நன்றி');
  });

  it('returns the text unchanged when it already ends at a boundary', () => {
    expect(convertTrailingWord('வணக்கம் ')).toBe('வணக்கம் ');
  });

  it('returns the text unchanged when there is no trailing Latin word', () => {
    expect(convertTrailingWord('')).toBe('');
  });
});
