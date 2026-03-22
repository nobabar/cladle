import { describe, expect, it } from "vitest";
import type { GuessEntry } from "~/stores/gameStore";
import { PERSISTED_GAME_STATE_SCHEMA_VERSION } from "~/types/gamePersistence";
import { gameStorePersistSerializer } from "~/utils/piniaGameStorePersistence";

function mockAnimal(id: string, name: string) {
  return {
    id,
    name,
    scientificName: "S. name",
    taxonomy: ["Animalia", "Chordata"],
  };
}

function mockGuess(): GuessEntry {
  return {
    animal: mockAnimal("2", "Lion"),
    lca: {
      clade: "Chordata",
      rank: "phylum",
      depth: 1,
      path: ["Animalia", "Chordata"],
    },
    timestamp: 1_700_000_000_000,
  };
}

describe("piniaGameStorePersistence", () => {
  it("serializes picked slice to versioned JSON", () => {
    const raw = gameStorePersistSerializer.serialize({
      gameMode: "daily",
      dailyState: {
        status: "playing",
        target: mockAnimal("1", "Tiger"),
        guesses: [mockGuess()],
        maxGuesses: 20,
        treeData: null,
        puzzleDate: "2026-03-22",
      },
      freePlayState: null,
    });
    const obj = JSON.parse(raw) as { version: number };
    expect(obj.version).toBe(PERSISTED_GAME_STATE_SCHEMA_VERSION);
  });

  it("round-trips picked slice with empty Maps on mode states", () => {
    const picked = {
      gameMode: "daily" as const,
      dailyState: {
        status: "playing" as const,
        target: mockAnimal("1", "Tiger"),
        guesses: [mockGuess()],
        maxGuesses: 20,
        treeData: null,
        puzzleDate: "2026-03-22",
      },
      freePlayState: null,
    };
    const raw = gameStorePersistSerializer.serialize(picked);
    const out = gameStorePersistSerializer.deserialize(raw) as typeof picked & {
      dailyState: { nodeMap: Map<unknown, unknown>; cladeMap: Map<unknown, unknown> };
    };
    expect(out.gameMode).toBe("daily");
    expect(out.dailyState?.puzzleDate).toBe("2026-03-22");
    expect(out.dailyState?.nodeMap instanceof Map).toBe(true);
    expect(out.dailyState?.nodeMap.size).toBe(0);
    expect(out.freePlayState).toBeNull();
  });

  it("deserialize invalid string yields empty slice", () => {
    const out = gameStorePersistSerializer.deserialize("not json {{{") as {
      gameMode: null;
      dailyState: null;
      freePlayState: null;
    };
    expect(out.gameMode).toBeNull();
    expect(out.dailyState).toBeNull();
    expect(out.freePlayState).toBeNull();
  });
});
