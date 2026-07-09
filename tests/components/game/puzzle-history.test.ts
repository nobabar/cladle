/**
 * Tests for GamePuzzleHistory component
 *
 * Validates history list display, open/close modal, and replay selection.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PuzzleHistory from "~/components/game/puzzle-history.vue";
import { loadPuzzleHistory } from "~/utils/puzzleHistory";
import type { PuzzleHistoryEntry } from "~/types/puzzleHistory";

const mockLoadReplayFromHistory = vi.fn();
const mockStore = {
  loadReplayFromHistory: mockLoadReplayFromHistory,
};

vi.mock("~/stores/gameStore", () => ({
  useGameStore: () => mockStore,
}));

vi.mock("~/utils/puzzleHistory", () => ({
  loadPuzzleHistory: vi.fn(() => []),
  savePuzzleToHistory: vi.fn(),
  getPuzzleByDate: vi.fn(),
  buildHistoryEntry: vi.fn(),
  clearOldHistory: vi.fn(),
}));

const UButtonStub = {
  name: "UButton",
  template: "<button v-bind=\"$attrs\" @click=\"$emit('click', $event)\"><slot /></button>",
  emits: ["click"],
};

const UModalStub = {
  name: "UModal",
  props: { open: Boolean },
  template: "<div v-if=\"open\" class=\"u-modal-stub\"><slot name=\"content\" /></div>",
};

function mountWithStubs() {
  return mount(PuzzleHistory, {
    global: {
      stubs: {
        UButton: UButtonStub,
        UModal: UModalStub,
      },
    },
  });
}

describe("puzzleHistory", () => {
  beforeEach(() => {
    vi.mocked(loadPuzzleHistory).mockReturnValue([]);
    mockLoadReplayFromHistory.mockClear();
  });

  it("renders history button with aria-label", () => {
    const wrapper = mountWithStubs();
    const btn = wrapper.find("button[aria-label='Open puzzle history']");
    expect(btn.exists()).toBe(true);
  });

  it("hideTrigger omits toolbar button but exposed open() still opens modal", async () => {
    const wrapper = mount(PuzzleHistory, {
      props: { hideTrigger: true },
      global: {
        stubs: {
          UButton: UButtonStub,
          UModal: UModalStub,
        },
      },
    });
    expect(wrapper.find("button[aria-label='Open puzzle history']").exists()).toBe(false);
    (wrapper.vm as unknown as { open: () => void }).open();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No past puzzles yet");
  });

  it("shows empty message when no history", async () => {
    const wrapper = mountWithStubs();
    await wrapper.find("button[aria-label='Open puzzle history']").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No past puzzles yet");
  });

  it("shows history list and calls loadReplayFromHistory when View clicked", async () => {
    const entry: PuzzleHistoryEntry = {
      puzzleDate: "2026-02-14",
      targetAnimal: {
        id: "41967",
        name: "Tiger",
        scientificName: "Panthera tigris",
        lineage: [
          { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
          { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
          { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
        ],
      },
      completionStatus: "won",
      guesses: [],
      treeData: null,
      completedAt: Date.now(),
    };
    vi.mocked(loadPuzzleHistory).mockReturnValue([entry]);

    const wrapper = mountWithStubs();
    await wrapper.find("button[aria-label='Open puzzle history']").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toMatch(/Feb 14|February 14/);
    expect(wrapper.text()).toContain("Solved");

    const viewBtn = wrapper.findAll("button").find(b => b.text() === "View");
    expect(viewBtn).toBeDefined();
    await viewBtn!.trigger("click");

    expect(mockLoadReplayFromHistory).toHaveBeenCalledWith(entry);
  });
});
