import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  createGameTokenPayload,
  GAME_TOKEN_MAX_AGE_MS,
  getSpentGuessUnits,
  openGameToken,
  sealGameToken,
} from "../../server/utils/gameToken";
import type { GameTokenPayload } from "../../server/utils/gameToken";
import { HINT_GUESS_COST } from "~/types/hint";
import { getCurrentDateUTC } from "../../shared/puzzleDateCore";

describe("gameToken", () => {
  const secret = "unit-test-puzzle-secret-key";
  const now = Date.now();

  const basePayload = (): GameTokenPayload => createGameTokenPayload({
    mode: "daily",
    targetId: "41967",
    puzzleDate: getCurrentDateUTC(),
    maxGuesses: 20,
    issuedAt: now,
  });

  it("round-trips a payload without exposing plaintext targetId in the token", () => {
    const payload = basePayload();
    const token = sealGameToken(payload, secret);
    expect(token.includes("41967")).toBe(false);
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain("41967");

    expect(openGameToken(token, secret, now)).toEqual(payload);
  });

  it("rejects tampered tokens", () => {
    const token = sealGameToken(createGameTokenPayload({
      mode: "free-play",
      targetId: "1",
      puzzleDate: "",
      maxGuesses: 20,
      issuedAt: now,
    }), secret);

    const buf = Buffer.from(token, "base64url");
    buf[30]! ^= 0xFF;
    expect(() => openGameToken(buf.toString("base64url"), secret, now)).toThrow();
  });

  it("rejects payloads missing progress arrays", () => {
    const incomplete = {
      mode: "daily",
      targetId: "1",
      puzzleDate: getCurrentDateUTC(),
      maxGuesses: 20,
      issuedAt: now,
    };
    const token = sealGameToken(incomplete as GameTokenPayload, secret);
    expect(() => openGameToken(token, secret, now)).toThrow("Invalid game token");
  });

  it("rejects tokens older than the max age", () => {
    const token = sealGameToken(createGameTokenPayload({
      mode: "free-play",
      targetId: "1",
      puzzleDate: "",
      maxGuesses: 20,
      issuedAt: now - GAME_TOKEN_MAX_AGE_MS - 1,
    }), secret);
    expect(() => openGameToken(token, secret, now)).toThrow("Game token expired");
  });

  it("rejects daily tokens whose puzzleDate is not today", () => {
    const token = sealGameToken(createGameTokenPayload({
      mode: "daily",
      targetId: "41967",
      puzzleDate: "2020-01-01",
      maxGuesses: 20,
      issuedAt: now,
    }), secret);
    expect(() => openGameToken(token, secret, now)).toThrow("Game token expired");
  });

  it("computes spent units from sealed guess and hint history", () => {
    const payload = createGameTokenPayload({
      mode: "daily",
      targetId: "41967",
      puzzleDate: getCurrentDateUTC(),
      maxGuesses: 20,
      guessAnimalIds: ["1", "2"],
      hintClades: ["Mammalia"],
    });
    expect(getSpentGuessUnits(payload)).toBe(2 + HINT_GUESS_COST);
  });
});
