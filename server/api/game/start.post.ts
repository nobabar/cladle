import { getRequestIP, readBody } from "h3";
import type { GameStartRequest, GameStartResponse } from "~/types/gameApi";
import { BABY_MODE_MAX_GUESSES } from "~/utils/babyMode";
import { getCurrentDateUTC } from "../../../shared/puzzleDateCore";
import { selectBabyModeTarget } from "../../utils/babyTarget";
import {
  checkGameApiRateLimit,
  GAME_START_RATE_LIMIT_MAX,
} from "../../utils/gameRateLimit";
import {
  createGameTokenPayload,
  getPuzzleSecret,
  sealGameToken,
} from "../../utils/gameToken";
import type { GameApiMode } from "../../utils/gameToken";
import {
  selectRandomTargetAnimal,
  selectTargetAnimalWithDifficulty,
} from "../../utils/puzzleSelector";

const STANDARD_MAX_GUESSES = 20;

function isMode(value: unknown): value is GameApiMode {
  return value === "daily" || value === "free-play" || value === "baby";
}

export default defineEventHandler(async (event): Promise<GameStartResponse> => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  if (!checkGameApiRateLimit(`start:${ip}`, GAME_START_RATE_LIMIT_MAX)) {
    throw createError({ statusCode: 429, statusMessage: "Too many requests" });
  }

  const body = await readBody<GameStartRequest>(event);
  if (!body || !isMode(body.mode)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid mode" });
  }

  const mode = body.mode;
  let puzzleDate = "";
  let targetId: string;
  let maxGuesses = STANDARD_MAX_GUESSES;
  const secret = getPuzzleSecret();

  if (mode === "daily") {
    puzzleDate = getCurrentDateUTC();
    targetId = selectTargetAnimalWithDifficulty(puzzleDate, secret);
  } else if (mode === "baby") {
    puzzleDate = getCurrentDateUTC();
    targetId = selectBabyModeTarget(puzzleDate, secret);
    maxGuesses = BABY_MODE_MAX_GUESSES;
  } else {
    targetId = selectRandomTargetAnimal();
  }

  const gameToken = sealGameToken(
    createGameTokenPayload({
      mode,
      targetId,
      puzzleDate,
      maxGuesses,
    }),
    secret,
  );

  return {
    mode,
    puzzleDate,
    gameToken,
    maxGuesses,
  };
});
