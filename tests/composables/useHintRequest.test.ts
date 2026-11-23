/**
 * Tests for useHintRequest composable
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useGameStore } from "~/stores/gameStore";
import { useHintRequest } from "~/composables/useHintRequest";
import { HINT_GUESS_COST } from "~/types/hint";
import { tiger } from "#test/helpers/animalFixtures";
import {
  beginSealedTestGame,
  resetMockGameApi,
} from "#test/helpers/mockGameApiClient";

vi.mock("~/services/gameApiClient", async () => {
  const { createMockGameApiClientExports } = await import("#test/helpers/mockGameApiClient");
  return createMockGameApiClientExports();
});

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
    resetMockGameApi();
  });

  it("skips request when confirm is stale and hint is no longer allowed", async () => {
    const store = useGameStore();
    beginSealedTestGame(store, tiger(), HINT_GUESS_COST + 1, "free-play");
    await store.requestHint();

    const { handleHintConfirm, hintAnnouncement } = mountHintRequestHarness();
    handleHintConfirm();
    expect(store.hints).toHaveLength(1);
    expect(hintAnnouncement.value).toBe("");
  });

  it("announces clade on successful hint", async () => {
    const store = useGameStore();
    beginSealedTestGame(store, tiger(), 20, "free-play");

    const { handleHintConfirm, hintAnnouncement } = mountHintRequestHarness();
    handleHintConfirm();
    await vi.waitFor(() => {
      expect(hintAnnouncement.value).toMatch(/revealed on the tree/i);
    });
  });

  it("disables when insufficient guesses remain", () => {
    const store = useGameStore();
    beginSealedTestGame(store, tiger(), HINT_GUESS_COST, "free-play");

    const { isHintControlDisabled, hintDisabledReasonKey } = mountHintRequestHarness();
    expect(isHintControlDisabled.value).toBe(true);
    expect(hintDisabledReasonKey.value).toBe("game.hint.disabled.insufficientGuesses");
  });
});
