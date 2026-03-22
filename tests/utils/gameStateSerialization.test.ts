import { describe, expect, it } from "vitest";
import type { GuessEntry } from "~/stores/gameStore";
import { PERSISTED_GAME_STATE_SCHEMA_VERSION } from "~/types/gamePersistence";
import type { TreeData, TreeNode } from "~/types/tree";
import {
  parsePersistedGameState,
  serializePersistedGameState,
} from "~/utils/gameStateSerialization";

function mockAnimal(id: string, name: string) {
  return {
    id,
    name,
    scientificName: "S. name",
    taxonomy: ["Animalia", "Chordata", "Mammalia"],
  };
}

function mockGuess(): GuessEntry {
  return {
    animal: mockAnimal("2", "Lion"),
    lca: {
      clade: "Mammalia",
      rank: "class",
      depth: 2,
      path: ["Animalia", "Chordata", "Mammalia"],
    },
    timestamp: 1_700_000_000_000,
  };
}

function minimalTreeData(): TreeData {
  const root: TreeNode = {
    id: "root",
    type: "clade",
    name: "Life",
    children: [],
  };
  const target: TreeNode = {
    id: "t1",
    type: "animal",
    name: "Tiger",
    data: mockAnimal("1", "Tiger"),
    children: [],
  };
  return {
    root,
    target,
    nodes: [root, target],
    guesses: [],
  };
}

describe("gameStateSerialization", () => {
  it("round-trips a representative snapshot", () => {
    const daily = {
      status: "playing" as const,
      target: mockAnimal("1", "Tiger"),
      guesses: [mockGuess()],
      maxGuesses: 20,
      treeData: minimalTreeData(),
      puzzleDate: "2026-03-22",
    };
    const raw = serializePersistedGameState({
      gameMode: "daily",
      dailyState: daily,
      freePlayState: null,
    });
    const parsed = parsePersistedGameState(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(PERSISTED_GAME_STATE_SCHEMA_VERSION);
    expect(parsed!.gameMode).toBe("daily");
    expect(parsed!.dailyState).toMatchObject({
      status: "playing",
      maxGuesses: 20,
      puzzleDate: "2026-03-22",
    });
    expect(parsed!.dailyState!.guesses).toHaveLength(1);
    expect(parsed!.dailyState!.guesses[0]!.animal.id).toBe("2");
    expect(parsed!.dailyState!.treeData).not.toBeNull();
    expect(parsed!.dailyState!.treeData!.root.id).toBe("root");
    expect(parsed!.freePlayState).toBeNull();
  });

  it("returns null for null or empty raw string", () => {
    expect(parsePersistedGameState(null)).toBeNull();
    expect(parsePersistedGameState("")).toBeNull();
    expect(parsePersistedGameState("   ")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parsePersistedGameState("{")).toBeNull();
    expect(parsePersistedGameState("not-json")).toBeNull();
  });

  it("returns null for unknown version", () => {
    const raw = JSON.stringify({
      version: 99,
      gameMode: "daily",
      dailyState: null,
      freePlayState: null,
    });
    expect(parsePersistedGameState(raw)).toBeNull();
  });

  it("returns null when mode state is partial / invalid", () => {
    const raw = JSON.stringify({
      version: PERSISTED_GAME_STATE_SCHEMA_VERSION,
      gameMode: "daily",
      dailyState: { status: "playing" },
      freePlayState: null,
    });
    expect(parsePersistedGameState(raw)).toBeNull();
  });

  it("parses legacy Pinia-shaped JSON without top-level version", () => {
    const legacy = {
      gameMode: "daily",
      dailyState: {
        status: "won",
        target: mockAnimal("1", "Tiger"),
        guesses: [mockGuess()],
        maxGuesses: 20,
        treeData: null,
        puzzleDate: "2026-01-01",
        nodeMap: {},
        cladeMap: {},
      },
      freePlayState: null,
    };
    const parsed = parsePersistedGameState(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(PERSISTED_GAME_STATE_SCHEMA_VERSION);
    expect(parsed!.dailyState!.status).toBe("won");
  });

  it("rejects invalid gameMode in legacy payload", () => {
    const legacy = {
      gameMode: "arcade",
      dailyState: null,
      freePlayState: null,
    };
    expect(parsePersistedGameState(JSON.stringify(legacy))).toBeNull();
  });

  it("serialize never includes Map keys in tree JSON", () => {
    const tree = minimalTreeData();
    (tree.root as TreeNode & { meta?: Map<string, string> }).meta = new Map([
      ["k", "v"],
    ]);
    const raw = serializePersistedGameState({
      gameMode: "daily",
      dailyState: {
        status: "playing",
        target: null,
        guesses: [],
        maxGuesses: 20,
        treeData: tree,
        puzzleDate: "2026-03-22",
      },
      freePlayState: null,
    });
    expect(raw).not.toContain("Map");
    expect(parsePersistedGameState(raw)).not.toBeNull();
  });
});
