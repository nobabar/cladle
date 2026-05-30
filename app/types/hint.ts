/** Guesses spent per paid hint. */
export const HINT_GUESS_COST = 4;

/** One paid hint recorded in game state. */
export interface HintEntry {
  timestamp: number;
  cost: number;
  revealedClade: string | null;
  rank?: string;
  depth?: number;
  path?: string[];
}

/** Wire / persistence shape for a hint entry. */
export interface StoredHintEntry {
  timestamp: number;
  cost: number;
  revealedClade: string | null;
  rank?: string;
  depth?: number;
  path?: string[];
}
