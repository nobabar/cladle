import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { getGameStore } from "#test/helpers/gameStore";
import { calculateLCA } from "~/utils/lcaCalculator";
import { getUserFriendlyError } from "~/utils/errorMessages";
import { buildShareableText } from "~/utils/sharingFormatter";
import { useSharing } from "~/composables/useSharing";
import type { Animal } from "~/types/animal";
import type { GuessEntry } from "~/stores/gameStore";
import type { TreeData, TreeNode } from "~/types/tree";

describe("useSharing", () => {
  // Test fixtures
  const tiger: Animal = {
    id: "1",
    name: "Tiger",
    scientificName: "Panthera tigris",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
  };

  const wolf: Animal = {
    id: "2",
    name: "Wolf",
    scientificName: "Canis lupus",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Canidae", "Canis", "Canis lupus"],
  };

  function guessEntry(animal: Animal, target: Animal, timestamp: number): GuessEntry {
    return {
      animal,
      lca: calculateLCA(animal, target),
      timestamp,
    };
  }

  function leafNode(id: string, depth: number): TreeNode {
    return {
      id,
      type: "animal",
      name: id,
      children: [],
      depth,
    };
  }

  function makeTreeData(guessDepths: number[]): TreeData {
    const guesses = guessDepths.map((d, i) => leafNode(`g${i}`, d));
    return {
      root: leafNode("root", 0),
      target: leafNode("t", 6),
      nodes: [],
      guesses,
    };
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setClipboardWrite(writeTextMock: ReturnType<typeof vi.fn>) {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });
  }

  it("copies full share text to clipboard on success", async () => {
    const store = getGameStore();

    store.status = "won";
    store.target = tiger;
    store.guesses = [guessEntry(tiger, tiger, 1)];
    store.treeData = makeTreeData([6]);
    store.gameMode = "daily";
    store.puzzleDate = "2026-03-25";
    store.maxGuesses = 20;
    store.isReplayMode = false;
    store.error = null;

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    setClipboardWrite(writeTextMock);

    const {
      copyShareText,
      shareableText,
      isShareReady,
      lastCopyStatus,
      copyError,
    } = useSharing();

    expect(isShareReady.value).toBe(true);

    const expected = buildShareableText({
      status: "won",
      target: tiger,
      guesses: store.guesses,
      treeData: store.treeData,
      gameMode: "daily",
      puzzleDate: "2026-03-25",
      maxGuesses: 20,
    });

    expect(shareableText.value).toBe(expected);

    await copyShareText();

    expect(writeTextMock).toHaveBeenCalledWith(expected);
    expect(store.error).toBeNull();
    expect(lastCopyStatus.value).toBe("success");
    expect(copyError.value).toBeNull();

    vi.advanceTimersByTime(2000);
    expect(lastCopyStatus.value).toBe("idle");
  });

  it("sets store error + error status on clipboard rejection", async () => {
    const store = getGameStore();

    store.status = "lost";
    store.target = tiger;
    store.guesses = [guessEntry(wolf, tiger, 1)];
    store.treeData = makeTreeData([2]);
    store.gameMode = "free-play";
    store.puzzleDate = "";
    store.maxGuesses = 20;
    store.isReplayMode = false;
    store.error = null;

    const writeTextMock = vi.fn().mockRejectedValue(new Error("clipboard failed"));
    setClipboardWrite(writeTextMock);

    const { copyShareText, lastCopyStatus, copyError } = useSharing();

    await copyShareText();

    expect(writeTextMock).toHaveBeenCalled();

    expect(store.error).not.toBeNull();
    expect(store.error?.code).toBe("SHARE_CLIPBOARD_FAILED");
    expect(store.error?.message).toBe(getUserFriendlyError("SHARE_CLIPBOARD_FAILED"));

    expect(lastCopyStatus.value).toBe("error");
    expect(copyError.value).toBe(getUserFriendlyError("SHARE_CLIPBOARD_FAILED"));

    vi.advanceTimersByTime(2000);
    expect(lastCopyStatus.value).toBe("idle");
  });

  it("sets store error when navigator.clipboard is missing", async () => {
    const store = getGameStore();

    store.status = "won";
    store.target = tiger;
    store.guesses = [guessEntry(tiger, tiger, 1)];
    store.treeData = makeTreeData([6]);
    store.gameMode = "daily";
    store.puzzleDate = "2026-03-25";
    store.maxGuesses = 20;
    store.isReplayMode = false;
    store.error = null;

    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    const { copyShareText, lastCopyStatus } = useSharing();

    await copyShareText();

    expect(store.error?.code).toBe("SHARE_CLIPBOARD_FAILED");
    expect(lastCopyStatus.value).toBe("error");
  });
});
