/**
 * Unit tests for dateUtils
 *
 * Tests cover:
 * - getCurrentDateUTC returns YYYY-MM-DD in UTC
 * - hasDateChanged for various pairs
 * - isMidnightPassed for stored puzzle date vs current
 * - getMidnightUTC and edge cases
 * - Timezone / DST considerations via UTC consistency
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatNextUtcMidnightInLocal,
  formatPuzzleDate,
  formatTimeUntilNextPuzzle,
  getCurrentDateUTC,
  getMidnightUTC,
  getNextMidnightUTC,
  getSecondsUntilNextPuzzle,
  hasDateChanged,
  isMidnightPassed,
} from "~/utils/dateUtils";

describe("dateUtils", () => {
  describe("getCurrentDateUTC", () => {
    it("returns string in YYYY-MM-DD format", () => {
      const result = getCurrentDateUTC();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns UTC date (mock 2026-02-11 23:30 UTC)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 23, 30, 0)));
      expect(getCurrentDateUTC()).toBe("2026-02-11");
      vi.useRealTimers();
    });

    it("rolls to next day at midnight UTC", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 12, 0, 0, 0)));
      expect(getCurrentDateUTC()).toBe("2026-02-12");
      vi.useRealTimers();
    });
  });

  describe("hasDateChanged", () => {
    it("returns false when dates are the same", () => {
      expect(hasDateChanged("2026-02-11", "2026-02-11")).toBe(false);
    });

    it("returns true when dates are different", () => {
      expect(hasDateChanged("2026-02-11", "2026-02-12")).toBe(true);
      expect(hasDateChanged("2026-02-10", "2026-02-11")).toBe(true);
    });

    it("handles empty old date", () => {
      expect(hasDateChanged("", "2026-02-11")).toBe(true);
    });

    it("handles empty new date", () => {
      expect(hasDateChanged("2026-02-11", "")).toBe(true);
    });

    it("handles both empty", () => {
      expect(hasDateChanged("", "")).toBe(false);
    });
  });

  describe("isMidnightPassed", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 12, 0, 0)));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns false when puzzle date is today UTC", () => {
      expect(isMidnightPassed("2026-02-11")).toBe(false);
    });

    it("returns true when puzzle date is yesterday UTC", () => {
      expect(isMidnightPassed("2026-02-10")).toBe(true);
    });

    it("returns true when puzzle date is empty", () => {
      expect(isMidnightPassed("")).toBe(true);
    });

    it("returns true when current date is after puzzle date", () => {
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 12, 0, 1, 0)));
      expect(isMidnightPassed("2026-02-11")).toBe(true);
    });
  });

  describe("getMidnightUTC", () => {
    it("returns Date at 00:00:00 UTC for valid YYYY-MM-DD", () => {
      const d = getMidnightUTC("2026-02-11");
      expect(d.getUTCFullYear()).toBe(2026);
      expect(d.getUTCMonth()).toBe(1);
      expect(d.getUTCDate()).toBe(11);
      expect(d.getUTCHours()).toBe(0);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    });

    it("throws for invalid format", () => {
      expect(() => getMidnightUTC("2026/02/11")).toThrow("Invalid date format");
      expect(() => getMidnightUTC("02-11-2026")).toThrow("Invalid date format");
    });

    it("throws for invalid month", () => {
      expect(() => getMidnightUTC("2026-13-01")).toThrow("Invalid date");
    });

    it("throws for invalid day", () => {
      expect(() => getMidnightUTC("2026-02-32")).toThrow("Invalid date");
    });
  });

  describe("formatPuzzleDate", () => {
    it("returns 'Today's Puzzle' for relative format when date is current UTC day", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 12, 0, 0)));
      expect(formatPuzzleDate("2026-02-11", "relative")).toBe("Today's Puzzle");
      vi.useRealTimers();
    });

    it("returns full formatted date for relative format when date is not today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 12, 0, 0)));
      expect(formatPuzzleDate("2026-02-10", "relative")).toMatch(/February 10, 2026/);
      vi.useRealTimers();
    });

    it("returns full format (e.g. January 11, 2026) by default", () => {
      expect(formatPuzzleDate("2026-01-11")).toMatch(/January 11, 2026/);
    });

    it("returns short format (e.g. Jan 11, 2026) when format is short", () => {
      expect(formatPuzzleDate("2026-01-11", "short")).toMatch(/Jan 11, 2026/);
    });

    it("returns fallback for empty string", () => {
      expect(formatPuzzleDate("")).toBe("—");
    });

    it("returns fallback for invalid format", () => {
      expect(formatPuzzleDate("2026/01/11")).toBe("—");
      expect(formatPuzzleDate("not-a-date")).toBe("—");
    });

    it("returns fallback for invalid calendar date", () => {
      expect(formatPuzzleDate("2026-02-32")).toBe("—");
      expect(formatPuzzleDate("2026-13-01")).toBe("—");
    });
  });

  describe("getNextMidnightUTC", () => {
    it("returns next day 00:00:00 UTC when current time is during the day", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 14, 30, 0)));
      const next = getNextMidnightUTC();
      expect(next.getUTCFullYear()).toBe(2026);
      expect(next.getUTCMonth()).toBe(1);
      expect(next.getUTCDate()).toBe(12);
      expect(next.getUTCHours()).toBe(0);
      expect(next.getUTCMinutes()).toBe(0);
      vi.useRealTimers();
    });

    it("returns next day at 23:59:59 UTC", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 23, 59, 59)));
      const next = getNextMidnightUTC();
      expect(next.getUTCDate()).toBe(12);
      expect(next.getUTCHours()).toBe(0);
      vi.useRealTimers();
    });
  });

  describe("getSecondsUntilNextPuzzle", () => {
    it("returns seconds until next midnight UTC", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 23, 30, 0)));
      expect(getSecondsUntilNextPuzzle()).toBe(30 * 60); // 30 minutes
      vi.useRealTimers();
    });

    it("returns 1 when one second before midnight", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 23, 59, 59)));
      expect(getSecondsUntilNextPuzzle()).toBe(1);
      vi.useRealTimers();
    });
  });

  describe("formatTimeUntilNextPuzzle", () => {
    it("formats hours and minutes when more than 1 hour left", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 18, 30, 0)));
      expect(formatTimeUntilNextPuzzle()).toBe("5h 30m");
      vi.useRealTimers();
    });

    it("formats minutes and seconds when less than 1 hour left", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 23, 30, 15)));
      expect(formatTimeUntilNextPuzzle()).toBe("29m 45s");
      vi.useRealTimers();
    });

    it("formats seconds when less than 1 minute left", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 23, 59, 50)));
      expect(formatTimeUntilNextPuzzle()).toBe("10s");
      vi.useRealTimers();
    });

    it("returns 'Next puzzle soon' when under 1 second or past midnight", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 23, 59, 59, 999)));
      expect(formatTimeUntilNextPuzzle()).toBe("Next puzzle soon");
      vi.useRealTimers();
    });
  });

  describe("formatNextUtcMidnightInLocal", () => {
    it("formats local clock time for 00:00 UTC (no calendar date)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 15, 0, 0)));
      const s = formatNextUtcMidnightInLocal("en");
      expect(s).not.toMatch(/20\d{2}/);
      expect(s).toMatch(/\d{1,2}:\d{2}/);
      expect(s.length).toBeGreaterThan(4);
      expect(s.length).toBeLessThan(48);
      vi.useRealTimers();
    });
  });
});
