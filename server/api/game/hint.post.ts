import { getRequestIP, readBody } from "h3";
import type { GameHintRequest, GameHintResponse } from "~/types/gameApi";
import {
  buildHintCladeSelectorInput,
  selectHintClade,
} from "~/utils/hintCladeSelector";
import { HINT_GUESS_COST } from "~/types/hint";
import {
  checkGameApiRateLimit,
  GAME_HINT_RATE_LIMIT_MAX,
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
import { loadMysteryTarget } from "../../utils/loadAnimal";

export default defineEventHandler(async (event): Promise<GameHintResponse> => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  if (!checkGameApiRateLimit(`hint:${ip}`, GAME_HINT_RATE_LIMIT_MAX)) {
    throw createError({ statusCode: 429, statusMessage: "Too many requests" });
  }

  const body = await readBody<GameHintRequest>(event);
  if (!body?.gameToken || typeof body.gameToken !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Invalid hint request" });
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

  const spentBefore = getSpentGuessUnits(payload);
  if (spentBefore + HINT_GUESS_COST > payload.maxGuesses) {
    throw createError({ statusCode: 400, statusMessage: "Not enough guesses for a hint" });
  }

  const target = await loadMysteryTarget(payload.mode, payload.targetId);
  if (!target) {
    throw createError({ statusCode: 500, statusMessage: "Failed to load mystery target" });
  }

  const guessLcas = await recomputeGuessLcas(
    payload.mode,
    target,
    payload.guessAnimalIds,
  );
  const revealedCladeNames = revealedCladeNamesFromHistory(
    target,
    guessLcas,
    payload.hintClades,
  );

  const selected = selectHintClade(buildHintCladeSelectorInput({
    target,
    guesses: guessLcas.map(lca => ({ lca })),
    hints: payload.hintClades.map(revealedClade => ({ revealedClade })),
    revealedCladeNames,
  }));

  if (!selected) {
    throw createError({ statusCode: 400, statusMessage: "No hint available" });
  }

  const nextHintClades = [...payload.hintClades, selected.clade];
  const nextPayload = createGameTokenPayload({
    ...payload,
    guessAnimalIds: payload.guessAnimalIds,
    hintClades: nextHintClades,
  });
  const guessesUsed = getSpentGuessUnits(nextPayload);
  const status: GameHintResponse["status"]
    = guessesUsed >= payload.maxGuesses ? "lost" : "playing";

  const nextRevealed = revealedCladeNamesFromHistory(
    target,
    guessLcas,
    nextHintClades,
  );
  const hasHintAvailable = status === "playing"
    && (payload.maxGuesses - guessesUsed) > HINT_GUESS_COST
    && selectHintClade(buildHintCladeSelectorInput({
      target,
      guesses: guessLcas.map(lca => ({ lca })),
      hints: nextHintClades.map(revealedClade => ({ revealedClade })),
      revealedCladeNames: nextRevealed,
    })) !== null;

  const response: GameHintResponse = {
    hint: {
      revealedClade: selected.clade,
      rank: selected.rank,
      depth: selected.depth,
      path: [...selected.path],
      cost: HINT_GUESS_COST,
    },
    status,
    guessesUsed,
    hasHintAvailable,
    gameToken: sealGameToken(nextPayload, secret),
  };

  if (status === "lost") {
    response.reveal = target;
  }

  return response;
});
