import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildHistoryEntry,
  clearOldHistory,
  getPuzzleByDate,
  loadPuzzleHistory,
  savePuzzleToHistory,
} from "~/utils/puzzleHistory";
import type { GuessEntry } from "~/stores/gameStore";

function createMockGuessEntry(animalId: string, animalName: string): GuessEntry {
  return {
    animal: {
      id: animalId,
      name: animalName,
      scientificName: "Species name",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    },
    lca: { clade: "Mammalia", rank: "class", depth: 2, path: ["Animalia", "Chordata", "Mammalia"] },
    timestamp: Date.now(),
  };
}

function createMockTargetAnimal() {
  return {
    id: "41967",
    name: "Tiger",
    scientificName: "Panthera tigris",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
  };
}

describe("puzzleHistory", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem(key: string) {
          return storage[key] ?? null;
        },
        setItem(key: string, value: string) {
          storage[key] = value;
        },
        removeItem(key: string) {
          delete storage[key];
        },
        clear() {
          storage = {};
        },
        length: 0,
        key() {
          return null;
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("buildHistoryEntry", () => {
    it("builds entry with puzzle date, target, status, guesses, treeData", () => {
      const target = createMockTargetAnimal();
      const guesses: GuessEntry[] = [createMockGuessEntry("41964", "Lion")];
      const entry = buildHistoryEntry(
        "2026-02-15",
        target,
        "won",
        guesses,
        null,
      );
      expect(entry.puzzleDate).toBe("2026-02-15");
      expect(entry.targetAnimal.id).toBe("41967");
      expect(entry.completionStatus).toBe("won");
      expect(entry.guesses).toHaveLength(1);
      expect(entry.treeData).toBeNull();
      expect(entry.completedAt).toBeGreaterThan(0);
    });
  });

  describe("savePuzzleToHistory and loadPuzzleHistory", () => {
    it("saves and loads history", () => {
      const target = createMockTargetAnimal();
      const entry = buildHistoryEntry("2026-02-15", target, "won", [], null);
      savePuzzleToHistory(entry);
      const loaded = loadPuzzleHistory();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]!.puzzleDate).toBe("2026-02-15");
      expect(loaded[0]!.targetAnimal.name).toBe("Tiger");
    });

    it("replaces existing entry for same date", () => {
      const target = createMockTargetAnimal();
      savePuzzleToHistory(buildHistoryEntry("2026-02-15", target, "lost", [], null));
      savePuzzleToHistory(buildHistoryEntry("2026-02-15", target, "won", [], null));
      const loaded = loadPuzzleHistory();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]!.completionStatus).toBe("won");
    });

    it("returns empty array when storage empty or missing", () => {
      expect(loadPuzzleHistory()).toEqual([]);
    });
  });

  describe("getPuzzleByDate", () => {
    it("returns entry when date exists in history", () => {
      const target = createMockTargetAnimal();
      savePuzzleToHistory(buildHistoryEntry("2026-02-15", target, "won", [], null));
      const found = getPuzzleByDate("2026-02-15");
      expect(found).not.toBeNull();
      expect(found!.puzzleDate).toBe("2026-02-15");
    });

    it("returns null when date not in history", () => {
      const target = createMockTargetAnimal();
      savePuzzleToHistory(buildHistoryEntry("2026-02-15", target, "won", [], null));
      expect(getPuzzleByDate("2026-02-16")).toBeNull();
      expect(getPuzzleByDate("2026-02-14")).toBeNull();
    });
  });

  describe("clearOldHistory", () => {
    it("keeps entries within daysToKeep", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 20, 12, 0, 0))); // 2026-02-20
      const target = createMockTargetAnimal();
      savePuzzleToHistory(buildHistoryEntry("2026-02-18", target, "won", [], null));
      savePuzzleToHistory(buildHistoryEntry("2026-02-19", target, "won", [], null));
      savePuzzleToHistory(buildHistoryEntry("2026-02-20", target, "won", [], null));
      clearOldHistory(30);
      const loaded = loadPuzzleHistory();
      expect(loaded).toHaveLength(3);
      vi.useRealTimers();
    });

    it("removes entries older than daysToKeep", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 2, 15, 12, 0, 0))); // 2026-03-15
      const target = createMockTargetAnimal();
      savePuzzleToHistory(buildHistoryEntry("2026-01-01", target, "won", [], null));
      savePuzzleToHistory(buildHistoryEntry("2026-03-10", target, "won", [], null));
      savePuzzleToHistory(buildHistoryEntry("2026-03-14", target, "won", [], null));
      clearOldHistory(14);
      const loaded = loadPuzzleHistory();
      expect(loaded.map(e => e.puzzleDate)).not.toContain("2026-01-01");
      expect(loaded).toHaveLength(2);
      vi.useRealTimers();
    });
  });
});
