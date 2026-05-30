/**
 * Tests for useHintRequest composable
 */

import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useGameStore } from "~/stores/gameStore";
import { useHintRequest } from "~/composables/useHintRequest";
import { HINT_GUESS_COST } from "~/types/hint";
import type { Animal } from "~/types/animal";

const tiger: Animal = {
  id: "41967",
  name: "Tiger",
  scientificName: "Panthera tigris",
  taxonomy: [
    "Animalia",
    "Chordata",
    "Mammalia",
    "Carnivora",
    "Felidae",
    "Panthera",
    "Panthera tigris",
  ],
};

function mountHintRequestHarness() {
  let api: ReturnType<typeof useHintRequest>;
  const Harness = defineComponent({
    setup() {
      api = useHintRequest();
      return () => null;
    },
  });
  mount(Harness);
  return api!;
}

describe("useHintRequest", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("skips request when confirm is stale and hint is no longer allowed", () => {
    const store = useGameStore();
    store.initializeGame(tiger, HINT_GUESS_COST + 1, "", "free-play", true);
    store.requestHint();

    const { handleHintConfirm, hintAnnouncement } = mountHintRequestHarness();
    handleHintConfirm();
    expect(store.hints).toHaveLength(1);
    expect(hintAnnouncement.value).toBe("");
  });

  it("announces clade on successful hint", () => {
    const store = useGameStore();
    store.initializeGame(tiger, 20, "", "free-play", true);

    const { handleHintConfirm, hintAnnouncement } = mountHintRequestHarness();
    handleHintConfirm();
    expect(hintAnnouncement.value).toMatch(/revealed on the tree/i);
  });

  it("disables when insufficient guesses remain", () => {
    const store = useGameStore();
    store.initializeGame(tiger, HINT_GUESS_COST, "", "free-play", true);

    const { isHintControlDisabled, hintDisabledReasonKey } = mountHintRequestHarness();
    expect(isHintControlDisabled.value).toBe(true);
    expect(hintDisabledReasonKey.value).toBe("game.hint.disabled.insufficientGuesses");
  });
});
