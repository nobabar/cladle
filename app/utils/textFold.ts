/**
 * Diacritic-folding and Unicode normalization helpers for animal search.
 */

interface FoldMap {
  folded: string;
  /** For each index in `folded`, the start index in the original string of that character. */
  toOriginal: number[];
}

/**
 * Build a folded form of `text` plus a map back to original indices.
 * Same rules as {@link foldDiacritics}: lowercase, NFKD, strip marks, collapse whitespace, trim.
 * @param text - The text to fold
 * @returns An object containing the folded text and a map back to original indices
 */
function foldWithMap(text: string): FoldMap {
  const lower = text.toLowerCase();
  const toOriginal: number[] = [];
  let folded = "";

  /**
   * Append to folded and push one map entry per UTF-16 code unit (surrogate-pair safe).
   * @param piece - The piece of text to append
   * @param originalIndex - The index of the original text
   */
  const appendFolded = (piece: string, originalIndex: number): void => {
    folded += piece;
    for (let j = 0; j < piece.length; j++) {
      toOriginal.push(originalIndex);
    }
  };

  let i = 0;
  while (i < lower.length) {
    const codePoint = lower.codePointAt(i)!;
    const codeUnitLength = codePoint > 0xFFFF ? 2 : 1;
    const originalIndex = i;
    const decomposed = String.fromCodePoint(codePoint).normalize("NFKD");

    for (const char of decomposed) {
      if (/\p{M}/u.test(char)) {
        continue;
      }
      if (/\s/u.test(char)) {
        if (folded.length === 0 || folded.endsWith(" ")) {
          continue;
        }
        appendFolded(" ", originalIndex);
        continue;
      }
      appendFolded(char, originalIndex);
    }

    i += codeUnitLength;
  }

  while (folded.endsWith(" ")) {
    folded = folded.slice(0, -1);
    toOriginal.pop();
  }

  return { folded, toOriginal };
}

/**
 * Lowercase, NFKD-normalize, strip combining marks, collapse whitespace.
 * @param input - The text to fold
 * @returns The folded text
 */
export function foldDiacritics(input: string): string {
  return foldWithMap(input).folded;
}

/**
 * Trim then NFC-normalize for outbound iNaturalist `q=` params.
 * Preserves user accents; only unifies Unicode form (NFD → NFC).
 * @param input - The text to normalize
 * @returns The normalized text
 */
export function normalizeQueryForINat(input: string): string {
  return input.trim().normalize("NFC");
}

/**
 * Find non-overlapping occurrences of `query` in `text` using diacritic folding,
 * returning `[start, end)` ranges in the original `text` string.
 * @param text - The text to search in
 * @param query - The query to search for
 * @returns The ranges of the matches
 */
export function findFoldedSubstringRanges(
  text: string,
  query: string,
): Array<[number, number]> {
  const foldedQuery = foldDiacritics(query);
  if (!foldedQuery || !text) {
    return [];
  }

  const { folded, toOriginal } = foldWithMap(text);
  if (!folded) {
    return [];
  }

  // Fail closed if the UTF-16 map length diverges from folded (should not happen).
  if (toOriginal.length !== folded.length) {
    return [];
  }

  const ranges: Array<[number, number]> = [];
  let searchFrom = 0;

  while (searchFrom <= folded.length - foldedQuery.length) {
    const matchStart = folded.indexOf(foldedQuery, searchFrom);
    if (matchStart === -1) {
      break;
    }

    const matchEnd = matchStart + foldedQuery.length;
    const originalStart = toOriginal[matchStart];
    const startOfLast = toOriginal[matchEnd - 1];
    if (
      originalStart === undefined
      || startOfLast === undefined
      || originalStart < 0
      || startOfLast < 0
      || originalStart >= text.length
      || startOfLast >= text.length
    ) {
      return ranges;
    }

    const lastCodePoint = text.codePointAt(startOfLast);
    if (lastCodePoint === undefined) {
      return ranges;
    }
    const originalEnd = startOfLast + (lastCodePoint > 0xFFFF ? 2 : 1);
    ranges.push([originalStart, originalEnd]);
    searchFrom = matchEnd;
  }

  return ranges;
}
