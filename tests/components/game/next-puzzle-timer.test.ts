/**
 * Tests for GameNextPuzzleTimer (presentational component).
 *
 * Validates rendering based on props: nextPuzzleIn and showTimer.
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import NextPuzzleTimer from "~/components/game/next-puzzle-timer.vue";

describe("nextPuzzleTimer", () => {
  it("renders nothing when showTimer is false", () => {
    const wrapper = mount(NextPuzzleTimer, {
      props: { nextPuzzleIn: "5h 23m", showTimer: false },
    });
    expect(wrapper.find("p[role='timer']").exists()).toBe(false);
  });

  it("renders nothing when nextPuzzleIn is empty", () => {
    const wrapper = mount(NextPuzzleTimer, {
      props: { nextPuzzleIn: "", showTimer: true },
    });
    expect(wrapper.find("p[role='timer']").exists()).toBe(false);
  });

  it("renders countdown when showTimer is true and nextPuzzleIn is set", () => {
    const wrapper = mount(NextPuzzleTimer, {
      props: { nextPuzzleIn: "59m 30s", showTimer: true },
    });
    const p = wrapper.find("p[role='timer']");
    expect(p.exists()).toBe(true);
    expect(p.text()).toBe("Next puzzle in 59m 30s");
  });
});
