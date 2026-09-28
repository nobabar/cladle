/**
 * Client helpers for /api/game/* endpoints.
 */

import type {
  GameApiMode,
  GameGuessRequest,
  GameGuessResponse,
  GameHintRequest,
  GameHintResponse,
  GameStartResponse,
} from "~/types/gameApi";

export async function startGameSession(mode: GameApiMode): Promise<GameStartResponse> {
  return await $fetch<GameStartResponse>("/api/game/start", {
    method: "POST",
    body: { mode },
  });
}

export async function submitGameGuess(body: GameGuessRequest): Promise<GameGuessResponse> {
  return await $fetch<GameGuessResponse>("/api/game/guess", {
    method: "POST",
    body,
  });
}

export async function submitGameHint(body: GameHintRequest): Promise<GameHintResponse> {
  return await $fetch<GameHintResponse>("/api/game/hint", {
    method: "POST",
    body,
  });
}
