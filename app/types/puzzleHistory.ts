import type { Animal } from "~/types/animal";

/** Completion status for a puzzle (matches game store). */
export type PuzzleCompletionStatus = "playing" | "won" | "lost";

/**
 * Serializable guess entry (no circular refs).
 * Mirrors GuessEntry from game store for storage.
 */
export interface StoredGuessEntry {
  animal: Animal;
  lca: {
    clade: string;
    rank: string;
    depth: number;
    path: string[];
  };
  timestamp: number;
}

/**
 * Tree data with parent references stripped for JSON storage.
 * Maps are not stored; they are rebuilt when restoring.
 */
export interface StoredTreeData {
  root: StoredTreeNode;
  target: StoredTreeNode;
  nodes: StoredTreeNode[];
  guesses: StoredTreeNode[];
}

export interface StoredTreeNode {
  id: string;
  type: "animal" | "clade";
  name: string;
  data?: Animal;
  cladeData?: { name: string; rank: string };
  children: StoredTreeNode[];
  depth?: number;
  isTarget?: boolean;
  isGuess?: boolean;
  isLCA?: boolean;
}

/**
 * Single puzzle history entry (localStorage format).
 */
export interface PuzzleHistoryEntry {
  /** Puzzle date YYYY-MM-DD (UTC) */
  puzzleDate: string;
  /** Target animal for this puzzle */
  targetAnimal: Animal;
  /** playing | won | lost */
  completionStatus: PuzzleCompletionStatus;
  /** Guess history */
  guesses: StoredGuessEntry[];
  /** Tree state (no parent refs) */
  treeData: StoredTreeData | null;
  /** When the puzzle was completed (timestamp); set when status becomes won/lost */
  completedAt: number;
}
