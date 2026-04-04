import { afterEach, describe, expect, it, vi } from "vitest";
import { canAccessPuzzle, isFuturePuzzleDate } from "~/utils/puzzleAccessControl";

describe("puzzleAccessControl", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("canAccessPuzzle", () => {
    it("allows current date (today UTC)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 15, 12, 0, 0)));
      expect(canAccessPuzzle("2026-02-15")).toBe(true);
      vi.useRealTimers();
    });

    it("allows past dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 15, 12, 0, 0)));
      expect(canAccessPuzzle("2026-02-14")).toBe(true);
      expect(canAccessPuzzle("2026-02-01")).toBe(true);
      expect(canAccessPuzzle("2025-01-01")).toBe(true);
      vi.useRealTimers();
    });

    it("denies future dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 15, 12, 0, 0)));
      expect(canAccessPuzzle("2026-02-16")).toBe(false);
      expect(canAccessPuzzle("2026-03-01")).toBe(false);
      vi.useRealTimers();
    });

    it("denies invalid date format", () => {
      expect(canAccessPuzzle("")).toBe(false);
      expect(canAccessPuzzle("2026/02/15")).toBe(false);
      expect(canAccessPuzzle("15-02-2026")).toBe(false);
      expect(canAccessPuzzle("not-a-date")).toBe(false);
    });

    it("treats regex-matching dates by string comparison (no calendar validation)", () => {
      // We only check YYYY-MM-DD format; "2026-13-01" is after today in string order, so denied as future
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 15, 12, 0, 0)));
      expect(canAccessPuzzle("2026-13-01")).toBe(false);
      vi.useRealTimers();
    });
  });

  describe("isFuturePuzzleDate", () => {
    it("returns true for future dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 15, 12, 0, 0)));
      expect(isFuturePuzzleDate("2026-02-16")).toBe(true);
      expect(isFuturePuzzleDate("2026-03-01")).toBe(true);
      vi.useRealTimers();
    });

    it("returns false for today and past", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 15, 12, 0, 0)));
      expect(isFuturePuzzleDate("2026-02-15")).toBe(false);
      expect(isFuturePuzzleDate("2026-02-14")).toBe(false);
      vi.useRealTimers();
    });

    it("returns false for invalid format", () => {
      expect(isFuturePuzzleDate("")).toBe(false);
      expect(isFuturePuzzleDate("invalid")).toBe(false);
    });
  });
});
