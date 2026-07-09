import type { Animal } from "~/types/animal";
import { lineagePath } from "~/utils/taxonLineage";

/**
 * Result of Last Common Ancestor (LCA) calculation
 */
export interface LCAResult {
  clade: string;
  rank: string;
  depth: number;
  path: string[];
}

const LIFE_ROOT: LCAResult = {
  clade: "Life",
  rank: "root",
  depth: -1,
  path: [],
};

/**
 * Build an LCA-shaped result for a clade on the target's lineage path.
 * @param target - The target animal.
 * @param depth - Index into target.lineage.
 * @returns The LCA result.
 */
export function lcaResultFromTargetPath(target: Animal, depth: number): LCAResult {
  const lineage = target.lineage ?? [];
  const entry = lineage[depth];
  if (!entry) {
    return {
      clade: "",
      rank: "unknown",
      depth,
      path: [],
    };
  }
  return {
    clade: entry.name,
    rank: entry.rank,
    depth,
    path: lineagePath(lineage, depth),
  };
}

/**
 * Deepest taxon on the target lineage whose id appears in the guess lineage.
 * Depth is always an index into target.lineage.
 * @param guess - The guess animal.
 * @param target - The target animal.
 * @returns The LCA result.
 */
export function calculateLCA(guess: Animal, target: Animal): LCAResult {
  const guessLineage = guess.lineage ?? [];
  const targetLineage = target.lineage ?? [];

  if (guessLineage.length === 0 || targetLineage.length === 0) {
    return LIFE_ROOT;
  }

  const guessIds = new Set(guessLineage.map(t => t.id));
  let deepestMatch = -1;

  for (let i = 0; i < targetLineage.length; i++) {
    if (guessIds.has(targetLineage[i]!.id)) {
      deepestMatch = i;
    }
  }

  if (deepestMatch === -1) {
    return LIFE_ROOT;
  }

  return lcaResultFromTargetPath(target, deepestMatch);
}

/**
 * Taxon id at an LCA depth on the reference animal's lineage.
 * @param lca - LCA result whose `depth` indexes into `referenceAnimal.lineage`.
 * @param referenceAnimal - Animal whose lineage supplied the depth index.
 * @returns Matched taxon id, or `null` when depth is invalid.
 */
export function lcaTaxonId(lca: LCAResult, referenceAnimal: Animal): string | null {
  if (lca.depth < 0) {
    return null;
  }
  return referenceAnimal.lineage?.[lca.depth]?.id ?? null;
}

/**
 * Index of a taxon id on an animal's lineage.
 * @param animal - Animal whose lineage to search.
 * @param taxonId - iNaturalist taxon id.
 * @returns Zero-based index, or `-1` when absent.
 */
export function lineageIndexForTaxonId(animal: Animal, taxonId: string): number {
  return (animal.lineage ?? []).findIndex(t => t.id === taxonId);
}

/**
 * Map an LCA (computed on `referenceAnimal`) to its index on `target.lineage`.
 * @param lca - LCA result relative to `referenceAnimal`.
 * @param referenceAnimal - Animal used as the second argument to `calculateLCA`.
 * @param target - Game target (normalization reference).
 * @returns Index on `target.lineage`, or `-1` when the taxon is absent.
 */
export function lcaDepthOnTarget(
  lca: LCAResult,
  referenceAnimal: Animal,
  target: Animal,
): number {
  const taxonId = lcaTaxonId(lca, referenceAnimal);
  if (!taxonId) {
    return -1;
  }
  return lineageIndexForTaxonId(target, taxonId);
}

/**
 * Whether `candidate` is phylogenetically more specific than `anchor` on `target`.
 * Compares taxon identity on the target lineage when present; otherwise falls back to
 * iNaturalist `rankLevel` on the matched taxon entries.
 * @param candidate - LCA between the new guess and a previous guess.
 * @param candidateReference - Previous guess (second arg to `calculateLCA`).
 * @param anchor - LCA between the new guess and the target.
 * @param target - Game target animal.
 * @returns `true` when candidate is strictly more specific than anchor.
 */
export function isLCAMoreSpecificOnTarget(
  candidate: LCAResult,
  candidateReference: Animal,
  anchor: LCAResult,
  target: Animal,
): boolean {
  if (candidate.rank === "species" || candidate.depth < 0) {
    return false;
  }

  const depthOnTarget = lcaDepthOnTarget(candidate, candidateReference, target);
  if (depthOnTarget > anchor.depth) {
    return true;
  }

  if (depthOnTarget >= 0 || anchor.depth < 0) {
    return false;
  }

  const candidateEntry = candidateReference.lineage?.[candidate.depth];
  const anchorEntry = target.lineage?.[anchor.depth];
  if (
    candidateEntry?.rankLevel !== undefined
    && anchorEntry?.rankLevel !== undefined
  ) {
    return candidateEntry.rankLevel < anchorEntry.rankLevel;
  }

  return false;
}

/**
 * Sort key for related-guess LCAs: higher means more specific.
 * Prefers target-lineage index; falls back to inverted `rankLevel`.
 * @param lca - LCA result.
 * @param referenceAnimal - The animal to compare to.
 * @param target - The game target animal.
 * @returns A score indicating how specific the LCA is.
 */
export function lcaSpecificityScore(
  lca: LCAResult,
  referenceAnimal: Animal,
  target: Animal,
): number {
  const onTarget = lcaDepthOnTarget(lca, referenceAnimal, target);
  if (onTarget >= 0) {
    return onTarget * 1000;
  }
  const rankLevel = referenceAnimal.lineage?.[lca.depth]?.rankLevel;
  if (rankLevel !== undefined) {
    return 500 - rankLevel;
  }
  return lca.depth;
}
