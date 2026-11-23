/**
 * Handler-level tests for POST /api/game/hint: real token sealing and hint selection,
 * with only animal loading, request parsing and Nitro globals stubbed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "~/types/animal";
import type { GameHintRequest, GameHintResponse } from "~/types/gameApi";
import { HINT_GUESS_COST } from "~/types/hint";
import { lion as lionFixture, tiger as tigerFixture, wolf as wolfFixture } from "#test/helpers/animalFixtures";
import {
  createGameTokenPayload,
  openGameToken,
  sealGameToken,
} from "../../server/utils/gameToken";
import type { GameTokenPayload } from "../../server/utils/gameToken";
import { resetGameApiRateLimitMemory } from "../../server/utils/gameRateLimit";
import { getCurrentDateUTC } from "../../shared/puzzleDateCore";

const { animals, requestBody } = vi.hoisted(() => {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("createError", (input: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input));
  return {
    animals: new Map<string, Animal>(),
    requestBody: { current: undefined as unknown },
  };
});

vi.mock("h3", () => ({
  getRequestIP: () => "127.0.0.1",
  readBody: async () => requestBody.current,
}));

vi.mock("../../server/utils/loadAnimal", () => ({
  loadAnimalById: async (id: string) => animals.get(id) ?? null,
  loadMysteryTarget: async (_mode: string, id: string) => animals.get(id) ?? null,
}));

const SECRET = "unit-test-puzzle-secret-key";

async function callHint(body: GameHintRequest): Promise<GameHintResponse> {
  const { default: handler } = await import("../../server/api/game/hint.post");
  requestBody.current = body;
  return (handler as unknown as (event: unknown) => Promise<GameHintResponse>)({});
}

function seal(
  overrides: Partial<GameTokenPayload> & { targetId: string; maxGuesses: number },
): string {
  return sealGameToken(createGameTokenPayload({
    mode: "daily",
    puzzleDate: getCurrentDateUTC(),
    issuedAt: Date.now(),
    ...overrides,
  }), SECRET);
}

describe("pOST /api/game/hint", () => {
  const tiger = tigerFixture();
  const wolf = wolfFixture();
  const lion = lionFixture();

  beforeEach(() => {
    vi.stubEnv("NUXT_PUZZLE_SECRET", SECRET);
    resetGameApiRateLimitMemory();
    animals.clear();
    for (const animal of [tiger, wolf, lion]) {
      animals.set(animal.id, animal);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips the visible root clade on the first hint", async () => {
    const response = await callHint({ gameToken: seal({ targetId: tiger.id, maxGuesses: 20 }) });

    expect(response.hint.revealedClade).toBe("Chordata");
    expect(response.hint.depth).toBe(1);
    expect(response.hint.cost).toBe(HINT_GUESS_COST);
    expect(response.guessesUsed).toBe(HINT_GUESS_COST);
    expect(response.status).toBe("playing");
    expect(openGameToken(response.gameToken, SECRET).hintClades).toEqual(["Chordata"]);
  });

  it("reveals the next clade below the deepest guess", async () => {
    const gameToken = seal({ targetId: tiger.id, maxGuesses: 20, guessAnimalIds: [wolf.id] });
    const response = await callHint({ gameToken });

    expect(response.hint.revealedClade).toBe("Felidae");
  });

  it("loses and reveals the target when the hint spends the last guesses", async () => {
    const gameToken = seal({ targetId: tiger.id, maxGuesses: HINT_GUESS_COST });
    const response = await callHint({ gameToken });

    expect(response.status).toBe("lost");
    expect(response.guessesUsed).toBe(HINT_GUESS_COST);
    expect(response.reveal?.id).toBe(tiger.id);
    expect(response.hasHintAvailable).toBe(false);
  });

  it("rejects when the budget cannot cover a hint", async () => {
    const gameToken = seal({ targetId: tiger.id, maxGuesses: HINT_GUESS_COST - 1 });
    await expect(callHint({ gameToken }))
      .rejects
      .toMatchObject({ statusCode: 400, statusMessage: "Not enough guesses for a hint" });
  });

  it("rejects when no clade is left to reveal", async () => {
    // Lion shares the genus with Tiger, so the only deeper rank is the species.
    const gameToken = seal({ targetId: tiger.id, maxGuesses: 20, guessAnimalIds: [lion.id] });
    await expect(callHint({ gameToken }))
      .rejects
      .toMatchObject({ statusCode: 400, statusMessage: "No hint available" });
  });
});
