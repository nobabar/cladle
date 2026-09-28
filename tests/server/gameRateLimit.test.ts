import { describe, expect, it } from "vitest";
import {
  checkGameApiRateLimit,
  GAME_GUESS_RATE_LIMIT_MAX,
  resetGameApiRateLimitMemory,
} from "../../server/utils/gameRateLimit";

describe("gameRateLimit", () => {
  it("allows requests under the cap and blocks after", () => {
    resetGameApiRateLimitMemory();
    const key = "guess:test-ip";
    for (let i = 0; i < GAME_GUESS_RATE_LIMIT_MAX; i++) {
      expect(checkGameApiRateLimit(key, GAME_GUESS_RATE_LIMIT_MAX)).toBe(true);
    }
    expect(checkGameApiRateLimit(key, GAME_GUESS_RATE_LIMIT_MAX)).toBe(false);
  });
});
