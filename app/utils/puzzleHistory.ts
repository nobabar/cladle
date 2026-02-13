/**
 * Puzzle history storage (localStorage MVP).
 *
 * - Save completed puzzles for replay.
 * - Load history list and get puzzle by date.
 * - Enforce size limit and cleanup old entries.
 */

import type { TreeData } from "~/types/tree";
import type {
  PuzzleHistoryEntry,
  StoredGuessEntry,
  StoredTreeData,
} from "~/types/puzzleHistory";
import type { CompletionStatus, GuessEntry } from "~/stores/gameStore";

const STORAGE_KEY = "cladle-puzzle-history";
const DEFAULT_DAYS_TO_KEEP = 30;

/**
 * Strip parent references and convert TreeData to storable form.
 * @param treeData - Tree data to serialize
 * @returns Serialized tree data
 */
function serializeTreeData(treeData: TreeData | null): StoredTreeData | null {
  if (!treeData) return null;

  const replacer = (_key: string, value: unknown): unknown => {
    if (_key === "parent") return undefined;
    if (value instanceof Map) return undefined;
    return value;
  };

  const serialized = JSON.parse(JSON.stringify(treeData, replacer)) as StoredTreeData;
  return serialized;
}

/**
 * Convert game store guesses to stored format.
 * @param guesses - Guesses to serialize
 * @returns Serialized guesses
 */
function serializeGuesses(guesses: GuessEntry[]): StoredGuessEntry[] {
  return guesses.map(g => ({
    animal: g.animal,
    lca: {
      clade: g.lca.clade,
      rank: g.lca.rank,
      depth: g.lca.depth,
      path: g.lca.path ?? [],
    },
    timestamp: g.timestamp,
  }));
}

/**
 * Build a history entry from current game state (call when puzzle is completed).
 * @param puzzleDate - Puzzle date
 * @param targetAnimal - Target animal
 * @param targetAnimal.id - Target animal ID
 * @param targetAnimal.name - Target animal name
 * @param targetAnimal.scientificName - Target animal scientific name
 * @param targetAnimal.taxonomy - Target animal taxonomy
 * @param completionStatus - Completion status
 * @param guesses - Guesses
 * @param treeData - Tree data
 * @returns History entry
 */
export function buildHistoryEntry(
  puzzleDate: string,
  targetAnimal: { id: string; name: string; scientificName: string; taxonomy: string[] },
  completionStatus: CompletionStatus,
  guesses: GuessEntry[],
  treeData: TreeData | null,
): PuzzleHistoryEntry {
  return {
    puzzleDate,
    targetAnimal: targetAnimal as PuzzleHistoryEntry["targetAnimal"],
    completionStatus,
    guesses: serializeGuesses(guesses),
    treeData: serializeTreeData(treeData),
    completedAt: Date.now(),
  };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/**
 * Load full puzzle history from localStorage.
 * @returns Full puzzle history
 */
export function loadPuzzleHistory(): PuzzleHistoryEntry[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PuzzleHistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Get a single puzzle by date, or null if not in history.
 * @param date - Puzzle date
 * @returns Puzzle history entry or null
 */
export function getPuzzleByDate(date: string): PuzzleHistoryEntry | null {
  const history = loadPuzzleHistory();
  return history.find(entry => entry.puzzleDate === date) ?? null;
}

/**
 * Save a puzzle to history. Replaces existing entry for same date.
 * Caller should run clearOldHistory after if size limits are desired.
 * @param entry
 */
export function savePuzzleToHistory(entry: PuzzleHistoryEntry): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const history = loadPuzzleHistory();
    const withoutDate = history.filter(e => e.puzzleDate !== entry.puzzleDate);
    withoutDate.push(entry);
    // Sort by date descending (newest first)
    withoutDate.sort((a, b) => (b.puzzleDate > a.puzzleDate ? 1 : -1));
    storage.setItem(STORAGE_KEY, JSON.stringify(withoutDate));
  } catch (e) {
    if (e instanceof Error && (e.name === "QuotaExceededError" || e.message?.includes("QuotaExceeded"))) {
      throw new Error("Puzzle history storage full. Some old entries were not saved.");
    }
    throw e;
  }
}

/**
 * Remove entries older than the given number of days (by puzzle date).
 * Keeps at least the most recent `daysToKeep` days of puzzle dates.
 * @param daysToKeep - Number of days to keep
 */
export function clearOldHistory(daysToKeep: number = DEFAULT_DAYS_TO_KEEP): void {
  const storage = getStorage();
  if (!storage) return;

  const history = loadPuzzleHistory();
  if (history.length === 0) return;

  const now = new Date();
  const cutoffMs = now.getTime() - daysToKeep * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffMs);
  const cutoffStr = `${cutoffDate.getUTCFullYear()
  }-${
    String(cutoffDate.getUTCMonth() + 1).padStart(2, "0")
  }-${
    String(cutoffDate.getUTCDate()).padStart(2, "0")}`;

  const kept = history.filter(e => e.puzzleDate >= cutoffStr);
  if (kept.length === history.length) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch {
    // If quota still an issue after cleanup, leave as-is
  }
}
