import { describe, expect, it } from "vitest";
import {
  findFoldedSubstringRanges,
  foldDiacritics,
  normalizeQueryForINat,
} from "~/utils/textFold";

/** NFD form of "héron" (`e` + combining acute). */
const HERON_NFD = "he\u0301ron";
/** NFC form of "héron". */
const HERON_NFC = "héron";

describe("foldDiacritics", () => {
  it("treats ASCII, NFC, and NFD heron as equivalent", () => {
    expect(foldDiacritics("heron")).toBe("heron");
    expect(foldDiacritics(HERON_NFC)).toBe("heron");
    expect(foldDiacritics(HERON_NFD)).toBe("heron");
  });

  it("folds Héron cendré so it contains heron", () => {
    expect(foldDiacritics("Héron cendré")).toContain("heron");
    expect(foldDiacritics("Héron cendré")).toBe("heron cendre");
  });

  it("handles empty and whitespace-only input", () => {
    expect(foldDiacritics("")).toBe("");
    expect(foldDiacritics("   ")).toBe("");
    expect(foldDiacritics("  Héron  ")).toBe("heron");
  });

  it("collapses internal whitespace", () => {
    expect(foldDiacritics("Héron   cendré")).toBe("heron cendre");
  });
});

describe("normalizeQueryForINat", () => {
  it("converts NFD to NFC", () => {
    expect(normalizeQueryForINat(HERON_NFD)).toBe(HERON_NFC);
    expect(normalizeQueryForINat(HERON_NFD)).toBe(normalizeQueryForINat(HERON_NFD).normalize("NFC"));
  });

  it("leaves ASCII unchanged (aside from trim)", () => {
    expect(normalizeQueryForINat("heron")).toBe("heron");
    expect(normalizeQueryForINat("  heron  ")).toBe("heron");
  });

  it("preserves NFC accents", () => {
    expect(normalizeQueryForINat(HERON_NFC)).toBe(HERON_NFC);
  });
});

describe("findFoldedSubstringRanges", () => {
  it("maps ASCII heron onto accented Héron in the original string", () => {
    const text = "Héron cendré";
    const ranges = findFoldedSubstringRanges(text, "heron");
    expect(ranges).toEqual([[0, 5]]);
    expect(text.slice(ranges[0]![0], ranges[0]![1])).toBe("Héron");
  });

  it("finds matches for NFC and NFD queries", () => {
    const text = "Héron cendré";
    expect(findFoldedSubstringRanges(text, HERON_NFC)).toEqual([[0, 5]]);
    expect(findFoldedSubstringRanges(text, HERON_NFD)).toEqual([[0, 5]]);
  });

  it("returns empty for empty query or no match", () => {
    expect(findFoldedSubstringRanges("Héron", "")).toEqual([]);
    expect(findFoldedSubstringRanges("Héron", "   ")).toEqual([]);
    expect(findFoldedSubstringRanges("Héron", "lion")).toEqual([]);
  });

  it("returns multiple non-overlapping ranges for repeated matches", () => {
    const text = "Tiger Tiger";
    const ranges = findFoldedSubstringRanges(text, "tiger");
    expect(ranges).toEqual([[0, 5], [6, 11]]);
    expect(ranges.map(([start, end]) => text.slice(start, end))).toEqual(["Tiger", "Tiger"]);
  });

  it("returns empty when the query folds to empty (marks-only)", () => {
    const marksOnly = "\u0301\u0301";
    expect(foldDiacritics(marksOnly)).toBe("");
    expect(findFoldedSubstringRanges("Héron cendré", marksOnly)).toEqual([]);
  });

  it("handles emoji / surrogate-pair characters without throwing", () => {
    const text = "🦀 Héron 🦀";
    const ranges = findFoldedSubstringRanges(text, "heron");
    expect(ranges).toHaveLength(1);
    const [start, end] = ranges[0]!;
    expect(text.slice(start, end)).toBe("Héron");
    expect(foldDiacritics("🦀")).toBe("🦀");
  });

  it("keeps the invariant that each range folds to a slice containing the folded query", () => {
    const fixtures: Array<{ text: string; query: string }> = [
      { text: "Héron cendré", query: "heron" },
      { text: "Héron cendré", query: HERON_NFC },
      { text: "Héron cendré", query: HERON_NFD },
      { text: "Grand Héron", query: "heron" },
      { text: "Ardea cinerea", query: "cinerea" },
      { text: "écureuil roux", query: "ecureuil" },
      { text: "Tiger Tiger", query: "tiger" },
    ];

    for (const { text, query } of fixtures) {
      const foldedQuery = foldDiacritics(query);
      const ranges = findFoldedSubstringRanges(text, query);
      expect(ranges.length).toBeGreaterThan(0);
      for (const [start, end] of ranges) {
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        expect(end).toBeLessThanOrEqual(text.length);
        const sliced = text.slice(start, end);
        expect(foldDiacritics(sliced)).toContain(foldedQuery);
      }
    }
  });
});
