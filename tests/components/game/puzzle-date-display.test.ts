/**
 * Tests for GamePuzzleDateDisplay component
 *
 * Validates puzzle date display, formatting, accessibility (ARIA, time element),
 * and missing or invalid dates.
 */

import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PuzzleDateDisplay from "~/components/game/puzzle-date-display.vue";

describe("puzzleDateDisplay", () => {
  it("renders nothing when puzzleDate is empty", () => {
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "" },
    });
    expect(wrapper.find("time").exists()).toBe(false);
  });

  it("renders relative label when date is today (UTC)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 12, 0, 0)));
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "2026-02-11", format: "relative" },
    });
    expect(wrapper.find("time").exists()).toBe(true);
    expect(wrapper.text()).toBe("Today's Puzzle");
    vi.useRealTimers();
  });

  it("renders full date when date is not today and format is relative", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 12, 0, 0)));
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "2026-02-10", format: "relative" },
    });
    expect(wrapper.find("time").exists()).toBe(true);
    expect(wrapper.text()).toMatch(/February 10, 2026/);
    vi.useRealTimers();
  });

  it("uses full format when format prop is full", () => {
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "2026-01-15", format: "full" },
    });
    expect(wrapper.find("time").exists()).toBe(true);
    expect(wrapper.text()).toMatch(/January 15, 2026/);
  });

  it("uses short format when format prop is short", () => {
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "2026-01-15", format: "short" },
    });
    expect(wrapper.find("time").exists()).toBe(true);
    expect(wrapper.text()).toMatch(/Jan 15, 2026/);
  });

  it("renders nothing when date is invalid (formatPuzzleDate returns fallback)", () => {
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "invalid", format: "full" },
    });
    expect(wrapper.find("time").exists()).toBe(false);
  });

  it("exposes datetime attribute for machine-readable date", () => {
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "2026-02-11", format: "full" },
    });
    const time = wrapper.find("time");
    expect(time.attributes("datetime")).toBe("2026-02-11T00:00:00Z");
  });

  it("has aria-label with full date for screen readers", () => {
    const wrapper = mount(PuzzleDateDisplay, {
      props: { puzzleDate: "2026-02-11", format: "relative" },
    });
    const time = wrapper.find("time");
    expect(time.attributes("aria-label")).toMatch(/Current puzzle date:/);
    expect(time.attributes("aria-label")).toMatch(/2026/);
  });
});
