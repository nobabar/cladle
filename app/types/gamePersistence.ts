import type { Animal } from "./animal";
import type { StoredHintEntry } from "./hint";
import type { StoredGuessEntry, StoredTreeData } from "./puzzleHistory";

/**
 * Current persisted game snapshot schema version (integer).
 * Bump when the wire shape changes; add migration branches in parsePersistedGameState.
 */
export const PERSISTED_GAME_STATE_SCHEMA_VERSION = 1;

/** Game mode as stored in the payload (matches Pinia `GameMode`). */
export type PersistedGameMode = "daily" | "free-play";

/** Status values allowed in persisted mode snapshots. */
export type PersistedGameStatus = "idle" | "playing" | "won" | "lost";

/**
 * One mode’s game state in wire format.
 * `nodeMap` / `cladeMap` are omitted: rebuilt from `treeData` on restore (see gameStore).
 */
export interface PersistedModeGameState {
  status: PersistedGameStatus;
  target: Animal | null;
  guesses: StoredGuessEntry[];
  hints: StoredHintEntry[];
  maxGuesses: number;
  treeData: StoredTreeData | null;
  puzzleDate: string;
}

/**
 * Versioned envelope for the full Pinia-persisted slice (`gameMode`, `dailyState`,
 * `freePlayState`). Storage-agnostic JSON string is produced by serializePersistedGameState.
 */
export interface PersistedGameStatePayload {
  version: number;
  gameMode: PersistedGameMode | null;
  dailyState: PersistedModeGameState | null;
  freePlayState: PersistedModeGameState | null;
}
