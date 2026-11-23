/**
 * In-memory mock of ~/services/gameApiClient for unit tests.
 * Computes real LCAs/hints from registered animals so tree assertions stay meaningful.
 * Reuses the server's pure progress helpers; only animal loading and token sealing are faked.
 */

import type { Animal } from "~/types/animal";
import type {
  GameApiMode,
  GameGuessRequest,
  GameGuessResponse,
  GameHintRequest,
  GameHintResponse,
  GameStartResponse,
} from "~/types/gameApi";
import { HINT_GUESS_COST } from "~/types/hint";
import { isBabyModeOrganism, resolveBabyModeLCA } from "~/utils/babyMode";
import {
  buildHintCladeSelectorInput,
  selectHintClade,
} from "~/utils/hintCladeSelector";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { LCAResult } from "~/utils/lcaCalculator";
import { revealedCladeNamesFromHistory } from "../../server/utils/gameProgress";

interface MockSession {
  targetId: string;
  mode: GameApiMode;
  maxGuesses: number;
  puzzleDate: string;
  guessAnimalIds: string[];
  hintClades: string[];
}

const animalsById = new Map<string, Animal>();
const sessionsByToken = new Map<string, MockSession>();
let tokenSeq = 0;

function spentGuessUnits(session: MockSession): number {
  return session.guessAnimalIds.length + session.hintClades.length * HINT_GUESS_COST;
}

function recomputeGuessLcas(session: MockSession, target: Animal): LCAResult[] {
  const results: LCAResult[] = [];
  for (const animalId of session.guessAnimalIds) {
    // Mirrors server/utils/gameProgress.recomputeGuessLcas, minus the network loaders.
    if (session.mode === "baby" && !isBabyModeOrganism(animalId)) {
      continue;
    }
    const guess = animalsById.get(animalId);
    if (!guess) {
      continue;
    }
    let lca = calculateLCA(guess, target);
    if (session.mode === "baby") {
      lca = resolveBabyModeLCA(lca, target);
    }
    results.push(lca);
  }
  return results;
}

function rotateToken(oldToken: string, next: MockSession): string {
  sessionsByToken.delete(oldToken);
  const gameToken = `test:${++tokenSeq}`;
  sessionsByToken.set(gameToken, next);
  return gameToken;
}

/**
 * Register an animal so guesses/hints can resolve its lineage.
 * @param animal - Animal fixture
 */
export function registerTestAnimal(animal: Animal): void {
  animalsById.set(animal.id, animal);
}

/**
 * Register multiple animals.
 * @param animals - Animal fixtures
 */
export function registerTestAnimals(...animals: Animal[]): void {
  for (const animal of animals) {
    registerTestAnimal(animal);
  }
}

/**
 * Clear all mock sessions and animals (call in beforeEach).
 */
export function resetMockGameApi(): void {
  animalsById.clear();
  sessionsByToken.clear();
  tokenSeq = 0;
}

/**
 * Create a sealed test session for a target animal.
 * @param target - Mystery target
 * @param options - Session options
 * @param options.mode - Game mode (default "daily")
 * @param options.maxGuesses - Guess budget (default 20)
 * @param options.puzzleDate - Puzzle date ("" for free-play by default)
 * @returns Start-response shape with opaque test token
 */
export function createTestGameSession(
  target: Animal,
  options: {
    mode?: GameApiMode;
    maxGuesses?: number;
    puzzleDate?: string;
  } = {},
): GameStartResponse {
  registerTestAnimal(target);
  const mode = options.mode ?? "daily";
  const maxGuesses = options.maxGuesses ?? 20;
  const puzzleDate = options.puzzleDate ?? (mode === "free-play" ? "" : "2026-01-15");
  const gameToken = `test:${++tokenSeq}`;
  sessionsByToken.set(gameToken, {
    targetId: target.id,
    mode,
    maxGuesses,
    puzzleDate,
    guessAnimalIds: [],
    hintClades: [],
  });
  return { mode, puzzleDate, gameToken, maxGuesses };
}

/**
 * Bootstrap a sealed game on the store for unit tests.
 * @param store - Game store instance
 * @param store.initializeSealedGame - Store action that installs the sealed session
 * @param target - Mystery target
 * @param maxGuesses - Guess budget
 * @param mode - Game mode
 * @param animals - Additional animals to register for guesses
 * @param puzzleDate - Optional puzzle date override
 */
export function beginSealedTestGame(
  store: {
    initializeSealedGame: (
      params: {
        mode: GameApiMode;
        gameToken: string;
        puzzleDate: string;
        maxGuesses: number;
      },
      forceNew?: boolean,
    ) => void;
  },
  target: Animal,
  maxGuesses: number,
  mode: GameApiMode = "daily",
  animals: Animal[] = [],
  puzzleDate?: string,
): void {
  registerTestAnimal(target);
  registerTestAnimals(...animals);
  const session = createTestGameSession(target, { maxGuesses, mode, puzzleDate });
  store.initializeSealedGame(session, true);
}

/**
 * Mock startGameSession — the mock has no target pool to draw from.
 * @param mode - Requested game mode
 */
export async function mockStartGameSession(mode: GameApiMode): Promise<GameStartResponse> {
  throw new Error(
    `mockStartGameSession(${mode}): use createTestGameSession or beginSealedTestGame to pick a target`,
  );
}

/**
 * Mock submitGameGuess — mirrors server/api/game/guess.post.ts scoring.
 * @param body - Guess request (token + animal id)
 * @returns Guess response with a rotated token
 */
export async function mockSubmitGameGuess(
  body: GameGuessRequest,
): Promise<GameGuessResponse> {
  const session = sessionsByToken.get(body.gameToken);
  if (!session) {
    throw new Error("Invalid game token");
  }

  if (session.mode === "baby" && !isBabyModeOrganism(body.animalId)) {
    throw new Error("Animal not in Baby Mode set");
  }

  if (spentGuessUnits(session) >= session.maxGuesses) {
    throw new Error("No guesses remaining");
  }

  const target = animalsById.get(session.targetId);
  if (!target) {
    throw new Error("Failed to load mystery target");
  }

  const guess = animalsById.get(body.animalId);
  if (!guess) {
    throw new Error("Unknown animal");
  }

  let lca = calculateLCA(guess, target);
  if (session.mode === "baby") {
    lca = resolveBabyModeLCA(lca, target);
  }

  const nextSession: MockSession = {
    ...session,
    guessAnimalIds: [...session.guessAnimalIds, body.animalId],
    hintClades: [...session.hintClades],
  };
  const guessesUsed = spentGuessUnits(nextSession);

  const correct = guess.id === target.id;
  let status: GameGuessResponse["status"] = "playing";
  if (correct) {
    status = "won";
  } else if (guessesUsed >= session.maxGuesses) {
    status = "lost";
  }

  const priorLcas = recomputeGuessLcas(session, target);
  const revealedCladeNames = revealedCladeNamesFromHistory(
    target,
    [...priorLcas, lca],
    session.hintClades,
  );

  const hasHintAvailable = status === "playing"
    && (session.maxGuesses - guessesUsed) > HINT_GUESS_COST
    && selectHintClade(buildHintCladeSelectorInput({
      target,
      guesses: [...priorLcas, lca].map(entry => ({ lca: entry })),
      hints: session.hintClades.map(revealedClade => ({ revealedClade })),
      revealedCladeNames,
    })) !== null;

  const gameToken = rotateToken(body.gameToken, nextSession);

  const response: GameGuessResponse = {
    lca,
    correct,
    status,
    guessesUsed,
    hasHintAvailable,
    gameToken,
  };

  if (status === "won" || status === "lost") {
    response.reveal = target;
  }

  return response;
}

/**
 * Mock submitGameHint — mirrors server/api/game/hint.post.ts scoring.
 * @param body - Hint request (token)
 * @returns Hint response with a rotated token
 */
export async function mockSubmitGameHint(
  body: GameHintRequest,
): Promise<GameHintResponse> {
  const session = sessionsByToken.get(body.gameToken);
  if (!session) {
    throw new Error("Invalid game token");
  }

  if (spentGuessUnits(session) + HINT_GUESS_COST > session.maxGuesses) {
    throw new Error("Not enough guesses for a hint");
  }

  const target = animalsById.get(session.targetId);
  if (!target) {
    throw new Error("Failed to load mystery target");
  }

  const guessLcas = recomputeGuessLcas(session, target);
  const revealedCladeNames = revealedCladeNamesFromHistory(
    target,
    guessLcas,
    session.hintClades,
  );

  const selected = selectHintClade(buildHintCladeSelectorInput({
    target,
    guesses: guessLcas.map(lca => ({ lca })),
    hints: session.hintClades.map(revealedClade => ({ revealedClade })),
    revealedCladeNames,
  }));

  if (!selected) {
    throw new Error("No hint available");
  }

  const nextHintClades = [...session.hintClades, selected.clade];
  const nextSession: MockSession = {
    ...session,
    guessAnimalIds: [...session.guessAnimalIds],
    hintClades: nextHintClades,
  };
  const guessesUsed = spentGuessUnits(nextSession);
  const status: GameHintResponse["status"]
    = guessesUsed >= session.maxGuesses ? "lost" : "playing";

  const nextRevealed = revealedCladeNamesFromHistory(
    target,
    guessLcas,
    nextHintClades,
  );
  const hasHintAvailable = status === "playing"
    && (session.maxGuesses - guessesUsed) > HINT_GUESS_COST
    && selectHintClade(buildHintCladeSelectorInput({
      target,
      guesses: guessLcas.map(lca => ({ lca })),
      hints: nextHintClades.map(revealedClade => ({ revealedClade })),
      revealedCladeNames: nextRevealed,
    })) !== null;

  const gameToken = rotateToken(body.gameToken, nextSession);

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
    gameToken,
  };

  if (status === "lost") {
    response.reveal = target;
  }

  return response;
}

/**
 * Factory for vi.mock("~/services/gameApiClient") exports.
 * @returns Replacement exports for the API client module
 */
export function createMockGameApiClientExports() {
  return {
    startGameSession: mockStartGameSession,
    submitGameGuess: mockSubmitGameGuess,
    submitGameHint: mockSubmitGameHint,
  };
}
