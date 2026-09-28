import { getRequestIP, readBody } from "h3";
import type { GameGuessRequest, GameGuessResponse } from "~/types/gameApi";
import { isBabyModeOrganism, resolveBabyModeLCA } from "~/utils/babyMode";
import { calculateLCA } from "~/utils/lcaCalculator";
import {
  buildHintCladeSelectorInput,
  selectHintClade,
} from "~/utils/hintCladeSelector";
import { HINT_GUESS_COST } from "~/types/hint";
import {
  checkGameApiRateLimit,
  GAME_GUESS_RATE_LIMIT_MAX,
} from "../../utils/gameRateLimit";
import {
  createGameTokenPayload,
  getPuzzleSecret,
  getSpentGuessUnits,
  openGameToken,
  sealGameToken,
} from "../../utils/gameToken";
import {
  recomputeGuessLcas,
  revealedCladeNamesFromHistory,
} from "../../utils/gameProgress";
import { loadAnimalById, loadMysteryTarget } from "../../utils/loadAnimal";

export default defineEventHandler(async (event): Promise<GameGuessResponse> => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  if (!checkGameApiRateLimit(`guess:${ip}`, GAME_GUESS_RATE_LIMIT_MAX)) {
    throw createError({ statusCode: 429, statusMessage: "Too many requests" });
  }

  const body = await readBody<GameGuessRequest>(event);
  if (!body?.gameToken || typeof body.animalId !== "string" || !body.animalId) {
    throw createError({ statusCode: 400, statusMessage: "Invalid guess request" });
  }

  const secret = getPuzzleSecret();
  let payload;
  try {
    payload = openGameToken(body.gameToken, secret);
  } catch (error) {
    const expired = error instanceof Error && error.message === "Game token expired";
    throw createError({
      statusCode: 400,
      statusMessage: expired ? "Game token expired" : "Invalid game token",
    });
  }

  if (payload.mode === "baby" && !isBabyModeOrganism(body.animalId)) {
    throw createError({ statusCode: 400, statusMessage: "Animal not in Baby Mode set" });
  }

  const spentBefore = getSpentGuessUnits(payload);
  if (spentBefore >= payload.maxGuesses) {
    throw createError({ statusCode: 400, statusMessage: "No guesses remaining" });
  }

  const target = await loadMysteryTarget(payload.mode, payload.targetId);
  if (!target) {
    throw createError({ statusCode: 500, statusMessage: "Failed to load mystery target" });
  }

  const guess = payload.mode === "baby"
    ? await loadMysteryTarget("baby", body.animalId)
    : await loadAnimalById(body.animalId);
  if (!guess) {
    throw createError({ statusCode: 400, statusMessage: "Unknown animal" });
  }

  let lca = calculateLCA(guess, target);
  if (payload.mode === "baby") {
    lca = resolveBabyModeLCA(lca, target);
  }

  const nextGuessAnimalIds = [...payload.guessAnimalIds, body.animalId];
  const nextPayload = createGameTokenPayload({
    ...payload,
    guessAnimalIds: nextGuessAnimalIds,
    hintClades: payload.hintClades,
  });
  const guessesUsed = getSpentGuessUnits(nextPayload);

  const correct = guess.id === target.id;
  let status: GameGuessResponse["status"] = "playing";
  if (correct) {
    status = "won";
  } else if (guessesUsed >= payload.maxGuesses) {
    status = "lost";
  }

  const priorLcas = await recomputeGuessLcas(
    payload.mode,
    target,
    payload.guessAnimalIds,
  );
  const revealedCladeNames = revealedCladeNamesFromHistory(
    target,
    [...priorLcas, lca],
    payload.hintClades,
  );

  const hasHintAvailable = status === "playing"
    && (payload.maxGuesses - guessesUsed) > HINT_GUESS_COST
    && selectHintClade(buildHintCladeSelectorInput({
      target,
      guesses: [...priorLcas, lca].map(entry => ({ lca: entry })),
      hints: payload.hintClades.map(revealedClade => ({ revealedClade })),
      revealedCladeNames,
    })) !== null;

  const response: GameGuessResponse = {
    lca,
    correct,
    status,
    guessesUsed,
    hasHintAvailable,
    gameToken: sealGameToken(nextPayload, secret),
  };

  if (status === "won" || status === "lost") {
    response.reveal = target;
  }

  return response;
});
