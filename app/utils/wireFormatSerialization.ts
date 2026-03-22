import type { GuessEntry } from "~/stores/gameStore";
import type { TreeData } from "~/types/tree";
import type { StoredGuessEntry, StoredTreeData } from "~/types/puzzleHistory";

/**
 * Strip parent references and Maps; produce JSON-safe tree data for storage.
 * Shared by puzzle history and full-game persistence.
 * @param treeData - Live tree graph or null.
 * @returns Serializable tree snapshot or null.
 */
export function serializeTreeDataForStorage(
  treeData: TreeData | null,
): StoredTreeData | null {
  if (!treeData) {
    return null;
  }

  const replacer = (_key: string, value: unknown): unknown => {
    if (_key === "parent") {
      return undefined;
    }
    if (value instanceof Map) {
      return undefined;
    }
    return value;
  };

  return JSON.parse(JSON.stringify(treeData, replacer)) as StoredTreeData;
}

/**
 * Normalize guesses to StoredGuessEntry (path default, no circular refs).
 * @param guesses - In-memory guess entries from the game store.
 * @returns Wire-format guess list for JSON persistence.
 */
export function serializeGuessesForStorage(guesses: GuessEntry[]): StoredGuessEntry[] {
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
