/**
 * Shared types for /api/game/* endpoints.
 */

import type { Animal } from "~/types/animal";
import type { LCAResult } from "~/utils/lcaCalculator";

export type GameApiMode = "daily" | "free-play" | "baby";

export interface GameStartRequest {
  mode: GameApiMode;
}

export interface GameStartResponse {
  mode: GameApiMode;
  puzzleDate: string;
  gameToken: string;
  maxGuesses: number;
}

export interface GameGuessRequest {
  gameToken: string;
  animalId: string;
}

export interface GameGuessResponse {
  lca: LCAResult;
  correct: boolean;
  status: "playing" | "won" | "lost";
  guessesUsed: number;
  hasHintAvailable: boolean;
  /** Rotated sealed token with this guess recorded. */
  gameToken: string;
  /** Set when status is won or lost. */
  reveal?: Animal;
}

export interface GameHintRequest {
  gameToken: string;
}

export interface GameHintResponse {
  hint: {
    revealedClade: string;
    rank: string;
    depth: number;
    path: string[];
    cost: number;
  };
  status: "playing" | "won" | "lost";
  guessesUsed: number;
  hasHintAvailable: boolean;
  /** Rotated sealed token with this hint recorded. */
  gameToken: string;
  reveal?: Animal;
}
