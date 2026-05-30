import type { Animal } from "~/types/animal";
import { PERSISTED_GAME_STATE_SCHEMA_VERSION } from "~/types/gamePersistence";
import type {
  PersistedGameMode,
  PersistedGameStatePayload,
  PersistedGameStatus,
  PersistedModeGameState,
} from "~/types/gamePersistence";
import type { HintEntry, StoredHintEntry } from "~/types/hint";
import type { StoredGuessEntry, StoredTreeData } from "~/types/puzzleHistory";
import type { GameMode, GameStatus, GuessEntry } from "~/stores/gameStore";
import type { TreeData } from "~/types/tree";
import {
  serializeGuessesForStorage,
  serializeTreeDataForStorage,
} from "~/utils/wireFormatSerialization";

const GAME_STATUSES = new Set<PersistedGameStatus>(["idle", "playing", "won", "lost"]);
const GAME_MODES = new Set<PersistedGameMode>(["daily", "free-play"]);

/** Input slice matching fields persisted per mode (maps ignored). */
export interface SerializeModeStateInput {
  status: GameStatus;
  target: Animal | null;
  guesses: GuessEntry[];
  hints: HintEntry[];
  maxGuesses: number;
  treeData: TreeData | null;
  puzzleDate: string;
}

export interface SerializePersistedGameStateInput {
  gameMode: GameMode | null;
  dailyState: SerializeModeStateInput | null;
  freePlayState: SerializeModeStateInput | null;
}

function serializeHintsForStorage(hints: HintEntry[]): StoredHintEntry[] {
  return hints.map(h => ({
    timestamp: h.timestamp,
    cost: h.cost,
    revealedClade: h.revealedClade ?? null,
    rank: h.rank,
    depth: h.depth,
    path: h.path ? [...h.path] : undefined,
  }));
}

function modeToWire(input: SerializeModeStateInput): PersistedModeGameState {
  return {
    status: input.status,
    target: input.target,
    guesses: serializeGuessesForStorage(input.guesses),
    hints: serializeHintsForStorage(input.hints),
    maxGuesses: input.maxGuesses,
    treeData: serializeTreeDataForStorage(input.treeData),
    puzzleDate: input.puzzleDate,
  };
}

/**
 * Serialize the Pinia-persisted game slice to a versioned JSON string.
 * Maps are not included; tree/guess shapes match puzzle history wire types.
 * @param input - Current `gameMode` and per-mode snapshots (maps ignored).
 * @returns JSON string with `version` and wire-format mode states.
 */
export function serializePersistedGameState(input: SerializePersistedGameStateInput): string {
  const payload: PersistedGameStatePayload = {
    version: PERSISTED_GAME_STATE_SCHEMA_VERSION,
    gameMode: input.gameMode,
    dailyState: input.dailyState ? modeToWire(input.dailyState) : null,
    freePlayState: input.freePlayState ? modeToWire(input.freePlayState) : null,
  };
  return JSON.stringify(payload);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGameMode(value: unknown): PersistedGameMode | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && GAME_MODES.has(value as PersistedGameMode)) {
    return value as PersistedGameMode;
  }
  return null;
}

function parseHintsField(value: unknown): StoredHintEntry[] | null {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  for (const item of value) {
    if (!isPlainObject(item)) {
      return null;
    }
    if (typeof item.timestamp !== "number" || !Number.isFinite(item.timestamp)) {
      return null;
    }
    if (typeof item.cost !== "number" || !Number.isFinite(item.cost)) {
      return null;
    }
    if (
      item.revealedClade !== undefined
      && item.revealedClade !== null
      && typeof item.revealedClade !== "string"
    ) {
      return null;
    }
    if (item.rank !== undefined && typeof item.rank !== "string") {
      return null;
    }
    if (item.depth !== undefined && (typeof item.depth !== "number" || !Number.isFinite(item.depth))) {
      return null;
    }
    if (item.path !== undefined) {
      if (!Array.isArray(item.path) || item.path.some(p => typeof p !== "string")) {
        return null;
      }
    }
  }
  return value as StoredHintEntry[];
}

function parseModeState(value: unknown): PersistedModeGameState | null {
  if (value === null) {
    return null;
  }
  if (!isPlainObject(value)) {
    return null;
  }
  const o = value;
  if (typeof o.status !== "string" || !GAME_STATUSES.has(o.status as PersistedGameStatus)) {
    return null;
  }
  if (!Array.isArray(o.guesses)) {
    return null;
  }
  const hints = parseHintsField(o.hints);
  if (hints === null) {
    return null;
  }
  if (typeof o.maxGuesses !== "number" || !Number.isFinite(o.maxGuesses)) {
    return null;
  }
  if (typeof o.puzzleDate !== "string") {
    return null;
  }
  if (o.target !== null && !isPlainObject(o.target)) {
    return null;
  }
  if (o.treeData !== null && !isPlainObject(o.treeData)) {
    return null;
  }

  return {
    status: o.status as PersistedGameStatus,
    target: (o.target ?? null) as Animal | null,
    guesses: o.guesses as StoredGuessEntry[],
    hints,
    maxGuesses: o.maxGuesses,
    treeData: (o.treeData ?? null) as StoredTreeData | null,
    puzzleDate: o.puzzleDate,
  };
}

function parseVersion1Envelope(obj: Record<string, unknown>): PersistedGameStatePayload | null {
  const gameMode = parseGameMode(obj.gameMode ?? null);
  if (obj.gameMode !== undefined && obj.gameMode !== null && gameMode === null) {
    return null;
  }

  let dailyState: PersistedModeGameState | null = null;
  if (obj.dailyState !== undefined && obj.dailyState !== null) {
    dailyState = parseModeState(obj.dailyState);
    if (dailyState === null) {
      return null;
    }
  }

  let freePlayState: PersistedModeGameState | null = null;
  if (obj.freePlayState !== undefined && obj.freePlayState !== null) {
    freePlayState = parseModeState(obj.freePlayState);
    if (freePlayState === null) {
      return null;
    }
  }

  return {
    version: PERSISTED_GAME_STATE_SCHEMA_VERSION,
    gameMode: gameMode ?? null,
    dailyState,
    freePlayState,
  };
}

/**
 * Parse and validate persisted game JSON. Never throws.
 * Accepts versioned `{ version: 1, ... }` or legacy Pinia pick (no `version` key).
 * @param raw - JSON string from storage, or null.
 * @returns Validated payload or null if empty, invalid JSON, or wrong schema.
 */
export function parsePersistedGameState(raw: string | null): PersistedGameStatePayload | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed === "") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) {
    return null;
  }

  if ("version" in parsed) {
    const v = parsed.version;
    if (v !== PERSISTED_GAME_STATE_SCHEMA_VERSION) {
      return null;
    }
    return parseVersion1Envelope(parsed);
  }

  // Legacy: pinia-plugin-persistedstate shape without top-level version
  if (
    "gameMode" in parsed
    || "dailyState" in parsed
    || "freePlayState" in parsed
  ) {
    return parseVersion1Envelope({
      ...parsed,
      version: PERSISTED_GAME_STATE_SCHEMA_VERSION,
    });
  }

  return null;
}
