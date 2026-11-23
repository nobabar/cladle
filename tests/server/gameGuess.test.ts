/**
 * Handler-level tests for POST /api/game/guess: real token sealing and scoring,
 * with only animal loading, request parsing and Nitro globals stubbed.
 */

import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Animal } from "~/types/animal";
import type { GameGuessRequest, GameGuessResponse } from "~/types/gameApi";
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

async function callGuess(body: GameGuessRequest): Promise<GameGuessResponse> {
  const { default: handler } = await import("../../server/api/game/guess.post");
  requestBody.current = body;
  return (handler as unknown as (event: unknown) => Promise<GameGuessResponse>)({});
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

describe("pOST /api/game/guess", () => {
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

  it("scores a wrong guess, keeps playing and rotates the token", async () => {
    const gameToken = seal({ targetId: tiger.id, maxGuesses: 6 });
    const response = await callGuess({ gameToken, animalId: wolf.id });

    expect(response.lca.clade).toBe("Carnivora");
    expect(response.correct).toBe(false);
    expect(response.status).toBe("playing");
    expect(response.guessesUsed).toBe(1);
    expect(response.reveal).toBeUndefined();
    expect(response.gameToken).not.toBe(gameToken);
    expect(openGameToken(response.gameToken, SECRET).guessAnimalIds).toEqual([wolf.id]);
  });

  it("wins on the target and reveals it", async () => {
    const gameToken = seal({ targetId: tiger.id, maxGuesses: 6 });
    const response = await callGuess({ gameToken, animalId: tiger.id });

    expect(response.correct).toBe(true);
    expect(response.status).toBe("won");
    expect(response.reveal?.id).toBe(tiger.id);
    expect(response.hasHintAvailable).toBe(false);
  });

  it("loses on the last guess and reveals the target", async () => {
    const gameToken = seal({ targetId: tiger.id, maxGuesses: 2, guessAnimalIds: [wolf.id] });
    const response = await callGuess({ gameToken, animalId: lion.id });

    expect(response.status).toBe("lost");
    expect(response.guessesUsed).toBe(2);
    expect(response.reveal?.id).toBe(tiger.id);
  });

  it("rejects a guess when no guesses remain", async () => {
    const gameToken = seal({ targetId: tiger.id, maxGuesses: 1, guessAnimalIds: [wolf.id] });
    await expect(callGuess({ gameToken, animalId: lion.id }))
      .rejects
      .toMatchObject({ statusCode: 400, statusMessage: "No guesses remaining" });
  });

  it("rejects a tampered token", async () => {
    const bytes = Buffer.from(seal({ targetId: tiger.id, maxGuesses: 6 }), "base64url");
    bytes[30]! ^= 0xFF;
    await expect(callGuess({ gameToken: bytes.toString("base64url"), animalId: wolf.id }))
      .rejects
      .toMatchObject({ statusCode: 400, statusMessage: "Invalid game token" });
  });

  it("rejects a non-baby organism in baby mode", async () => {
    const gameToken = seal({ mode: "baby", targetId: lion.id, maxGuesses: 20 });
    await expect(callGuess({ gameToken, animalId: wolf.id }))
      .rejects
      .toMatchObject({ statusCode: 400, statusMessage: "Animal not in Baby Mode set" });
  });
});
