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
  getCurrentDateUTC,
  getMidnightUTC,
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
});
