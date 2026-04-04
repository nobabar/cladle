import type { Animal } from "~/types/animal";
import type { GameMode, GameStatus, GuessEntry } from "~/stores/gameStore";
import type { TreeData } from "~/types/tree";
import { calculateLCA } from "~/utils/lcaCalculator";

/**
 * Phylogenetic metrics for a completed puzzle.
 * Number values only; shareable copy formatting is handled elsewhere.
 */
export interface PhylogeneticMetrics {
  /** Maximum depth among guess nodes in the visualization tree (integer ≥ 0). */
  treeDepth: number;
  /**
   * Ranks from the best guess's LCA down to the target's deepest taxon (integer ≥ 0).
   * Smaller means closer to the target; a correct guess typically yields 0 when store LCA aligns.
   *
   * If every guess has an invalid LCA (`depth < 0`), this is **`targetMax + 1`** where
   * `targetMax` is the deepest taxonomy index for the target (or 0 if taxonomy is empty) —
   * a conservative "unknown / far" bucket when distance cannot be inferred from LCAs.
   */
  evolutionaryDistance: number;

  /**
   * Furthest "remaining ranks distance" from the target to any animal represented
   * in the visualization (integer ≥ 0).
   *
   * Unit/range matches `evolutionaryDistance`, but instead of choosing the *closest*
   * guess (min), we choose the *most distant* animal (max).
   *
   * Definition (clamped to stay >= 0):
   * `remaining = targetMax - lca.depth`, where `targetMax` is the deepest taxonomy
   * index of the target, and `lca.depth` comes from `calculateLCA(animal, target)`.
   *
   * When `treeData` is unavailable, the computation falls back to using each
   * guess entry's stored `lca`.
   */
  furthestEvolutionaryDistance: number;
}

/**
 * Typed input for shareable text generation.
 *
 * Important: This snapshot may include `target` and `guesses`, but share text must
 * never echo those names.
 */
export interface ShareableGameSnapshot {
  status: GameStatus;
  target: Animal | null;
  guesses: GuessEntry[];
  treeData: TreeData | null;
  gameMode: GameMode;
  puzzleDate: string;
  maxGuesses: number;
}

function computeTreeDepth(treeData: TreeData | null, guesses: GuessEntry[]): number {
  const guessNodes = treeData?.guesses ?? [];
  const depthsWithNumeric: number[] = [];
  for (const n of guessNodes) {
    const d = n.depth;
    if (typeof d === "number" && !Number.isNaN(d)) {
      depthsWithNumeric.push(d);
    }
  }

  if (treeData != null && depthsWithNumeric.length > 0) {
    return Math.max(...depthsWithNumeric);
  }

  const fromLca = guesses
    .filter(g => g.lca.depth >= 0)
    .map(g => Math.max(g.lca.depth + 1, 0));

  if (fromLca.length === 0) {
    return 0;
  }

  return Math.max(...fromLca);
}

function computeEvolutionaryDistance(guesses: GuessEntry[], target: Animal): number {
  const taxonomy = target.taxonomy ?? [];
  const targetMax = taxonomy.length === 0 ? 0 : taxonomy.length - 1;

  const validGuesses = guesses.filter(g => g.lca.depth >= 0);
  if (validGuesses.length === 0) {
    return targetMax + 1;
  }

  const ranksRemaining = validGuesses.map(g =>
    Math.max(targetMax - g.lca.depth, 0),
  );
  return Math.min(...ranksRemaining);
}

function computeFurthestEvolutionaryDistance(
  treeData: TreeData | null,
  guesses: GuessEntry[],
  target: Animal,
): number {
  const taxonomy = target.taxonomy ?? [];
  const targetMax = taxonomy.length === 0 ? 0 : taxonomy.length - 1;

  const distances: number[] = [];

  // 1) Consider animals represented in the visualization tree.
  // These nodes have full `Animal` data, so we can calculate LCA on demand.
  if (treeData != null) {
    for (const node of treeData.nodes) {
      if (node.type !== "animal") continue;
      if (!node.data) continue;

      const lca = calculateLCA(node.data, target);
      if (lca.depth >= 0) {
        distances.push(Math.max(targetMax - lca.depth, 0));
      }
    }
  }

  // 2) Also consider guess entries (use stored LCA) as a fallback / supplemental
  // source of distances. This keeps behavior aligned with how `guesses`
  // were evaluated when building the game state.
  for (const g of guesses) {
    if (g.lca.depth < 0) continue;
    distances.push(Math.max(targetMax - g.lca.depth, 0));
  }

  if (distances.length === 0) {
    return targetMax + 1;
  }

  return Math.max(...distances);
}

/**
 * Computes phylogenetic metrics for sharing after a puzzle ends.
 *
 * @param treeData - Built tree from the game, or `null` if missing (e.g. replay edge cases).
 * @param guesses - Guess history; each entry should carry `lca` vs target from guess time.
 * @param target - Puzzle target animal; required when status is terminal.
 * @param status - Must be `won` or `lost` for non-null metrics.
 * @returns Metrics object, or `null` if the puzzle is not completed or inputs are invalid
 * (empty guesses, null target, or non-terminal status). Callers must not coerce `null` to zero.
 */
export function calculatePhylogeneticMetrics(
  treeData: TreeData | null,
  guesses: GuessEntry[],
  target: Animal | null,
  status: GameStatus,
): PhylogeneticMetrics | null {
  if (status !== "won" && status !== "lost") {
    return null;
  }
  if (target == null || guesses.length === 0) {
    return null;
  }

  return {
    treeDepth: computeTreeDepth(treeData, guesses),
    evolutionaryDistance: computeEvolutionaryDistance(guesses, target),
    furthestEvolutionaryDistance: computeFurthestEvolutionaryDistance(
      treeData,
      guesses,
      target,
    ),
  };
}

/**
 * Builds spoiler-safe, multi-line plain text for copy/paste.
 *
 * @param snapshot - Shareable inputs. May include `target` and `guesses`, but output
 * must never echo their names.
 *
 * @returns `null` when the puzzle is not complete or when metrics cannot be computed.
 */
export function buildShareableText(snapshot: ShareableGameSnapshot): string | null {
  const { status, target, guesses, treeData, gameMode, puzzleDate } = snapshot;

  const metrics = calculatePhylogeneticMetrics(treeData, guesses, target, status);
  if (metrics == null) {
    return null;
  }

  const lines: string[] = [];
  lines.push("Cladle");

  if (gameMode === "daily" && puzzleDate) {
    lines.push(`Daily puzzle: ${puzzleDate}`);
  }

  lines.push(`Tree depth: ${metrics.treeDepth}`);
  lines.push(`Evolutionary distance: ${metrics.evolutionaryDistance}`);
  lines.push(`Furthest evolutionary distance: ${metrics.furthestEvolutionaryDistance}`);

  if (status === "won") {
    lines.push(`Outcome: Solved in ${guesses.length} guesses.`);
  } else {
    lines.push(`Outcome: Did not solve in ${guesses.length} guesses.`);
  }

  return lines.join("\n");
}
