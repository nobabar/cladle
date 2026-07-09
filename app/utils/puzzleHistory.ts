/** Puzzle history in localStorage: save/load by date, prune by age. */

import type { Animal } from "~/types/animal";
import type { TreeData } from "~/types/tree";
import type { PuzzleHistoryEntry } from "~/types/puzzleHistory";
import type { CompletionStatus, GuessEntry } from "~/stores/gameStore";
import {
  serializeGuessesForStorage,
  serializeTreeDataForStorage,
} from "~/utils/wireFormatSerialization";
import { safeGetItem, safeSetItem } from "~/utils/storageSafe";

const STORAGE_KEY = "cladle-puzzle-history";
const DEFAULT_DAYS_TO_KEEP = 30;

/**
 * Build a history entry from current game state (call when puzzle is completed).
 * @param puzzleDate - Puzzle date
 * @param targetAnimal - Target animal
 * @param targetAnimal.id - Target animal ID
 * @param targetAnimal.name - Target animal name
 * @param targetAnimal.scientificName - Target animal scientific name
 * @param targetAnimal.lineage - Target animal lineage
 * @param completionStatus - Completion status
 * @param guesses - Guesses
 * @param treeData - Tree data
 * @returns History entry
 */
export function buildHistoryEntry(
  puzzleDate: string,
  targetAnimal: { id: string; name: string; scientificName: string; lineage: Animal["lineage"] },
  completionStatus: CompletionStatus,
  guesses: GuessEntry[],
  treeData: TreeData | null,
): PuzzleHistoryEntry {
  return {
    puzzleDate,
    targetAnimal: targetAnimal as PuzzleHistoryEntry["targetAnimal"],
    completionStatus,
    guesses: serializeGuessesForStorage(guesses),
    treeData: serializeTreeDataForStorage(treeData),
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

  const rawResult = safeGetItem(storage, STORAGE_KEY);
  if (!rawResult.ok || !rawResult.value) return [];

  try {
    const parsed = JSON.parse(rawResult.value) as unknown;
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

  const history = loadPuzzleHistory();
  const withoutDate = history.filter(e => e.puzzleDate !== entry.puzzleDate);
  withoutDate.push(entry);
  // Sort by date descending (newest first)
  withoutDate.sort((a, b) => (b.puzzleDate > a.puzzleDate ? 1 : -1));

  const write = safeSetItem(storage, STORAGE_KEY, JSON.stringify(withoutDate));
  if (!write.ok) {
    if (write.errorCode === "STORAGE_QUOTA_EXCEEDED") {
      throw new Error("Puzzle history storage full. Some old entries were not saved.");
    }
    throw new Error("Could not save puzzle history.");
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

  safeSetItem(storage, STORAGE_KEY, JSON.stringify(kept));
}
