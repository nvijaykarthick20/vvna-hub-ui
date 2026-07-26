import { transliterate } from '@piraisoodan/tanglish';

const BOUNDARY = /[\s.,!?;:()"'-]/;
const LATIN_WORD = /^[a-zA-Z]+$/;

interface LiveConversion {
  text: string;
  cursor: number;
}

/**
 * Converts the Latin word immediately before `cursor` when the character at
 * `cursor - 1` is a word boundary (space, punctuation) - i.e. the user just
 * finished typing a word. Returns null when there's nothing to convert, so
 * callers can fall back to the raw value untouched.
 */
export function convertWordBeforeCursor(value: string, cursor: number): LiveConversion | null {
  if (cursor <= 0 || !BOUNDARY.test(value[cursor - 1])) return null;

  let start = cursor - 1;
  while (start > 0 && !BOUNDARY.test(value[start - 1])) start--;
  const word = value.slice(start, cursor - 1);
  if (!LATIN_WORD.test(word)) return null;

  const tamil = transliterate(word);
  if (tamil === word) return null;

  return {
    text: value.slice(0, start) + tamil + value.slice(cursor - 1),
    cursor: start + tamil.length + 1,
  };
}

/** Converts a trailing Latin word with no following boundary char - used on blur. */
export function convertTrailingWord(value: string): string {
  const match = /[a-zA-Z]+$/.exec(value);
  if (!match) return value;

  const word = match[0];
  const tamil = transliterate(word);
  if (tamil === word) return value;

  return value.slice(0, value.length - word.length) + tamil;
}
