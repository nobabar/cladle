import type { Animal } from "~/types/animal";

/**
 * Result of Last Common Ancestor (LCA) calculation
 */
export interface LCAResult {
  clade: string;
  rank: string;
  depth: number;
  path: string[];
}

/**
 * Standard taxonomic ranks indexed by position
 * This mapping helps determine the rank based on taxonomy depth
 * Special case: -1 maps to "root" for edge cases (no common ancestor)
 */
export const TAXONOMIC_RANKS: Record<number, string> = {
  "-1": "root",
  "0": "kingdom",
  "1": "phylum",
  "2": "class",
  "3": "order",
  "4": "family",
  "5": "genus",
  "6": "species",
};

/**
 * Rank label for a taxonomy depth, or `"unknown"`.
 * @param depth - A taxonomy depth.
 * @returns The rank label for the taxonomy depth.
 */
export function taxonomicRankAtDepth(depth: number): string {
  return TAXONOMIC_RANKS[depth] ?? "unknown";
}

/**
 * Build an LCA-shaped result for a clade on the target's taxonomy path.
 * @param target - The target animal.
 * @param depth - A taxonomy depth.
 * @returns The LCA-shaped result for the clade on the target's taxonomy path.
 */
export function lcaResultFromTargetPath(target: Animal, depth: number): LCAResult {
  const clade = target.taxonomy[depth] ?? "";
  return {
    clade,
    rank: taxonomicRankAtDepth(depth),
    depth,
    path: target.taxonomy.slice(0, depth + 1),
  };
}

/**
 * Calculate the Last Common Ancestor (LCA) between two animals
 *
 * This function finds the most recent common taxonomic level shared by two animals
 * by comparing their taxonomy arrays from broadest to most specific classification.
 *
 * Algorithm:
 * 1. Iterate through both taxonomy arrays in parallel
 * 2. Find the first index where taxonomies diverge
 * 3. The LCA is the taxonomic level just before divergence
 * 4. Return LCA name, rank, depth, and full path
 *
 * @param animal1 - First animal with taxonomy classification
 * @param animal2 - Second animal with taxonomy classification
 * @returns LCAResult containing clade name, rank, depth, and path
 *
 * @example
 * ```typescript
 * const tiger = { taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae"] };
 * const wolf = { taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Canidae"] };
 * const lca = calculateLCA(tiger, wolf);
 * // Returns: { clade: "Carnivora", rank: "order", depth: 3, path: [...] }
 * ```
 */
export function calculateLCA(animal1: Animal, animal2: Animal): LCAResult {
  // Handle edge case: missing or invalid taxonomy data
  if (
    !animal1.taxonomy
    || !animal2.taxonomy
    || animal1.taxonomy.length === 0
    || animal2.taxonomy.length === 0
  ) {
    return {
      clade: "Life",
      rank: "root",
      depth: -1,
      path: [],
    };
  }

  // Keep original taxonomies for return values, but normalize for comparison
  const taxonomy1Original = animal1.taxonomy;
  const taxonomy2Original = animal2.taxonomy;
  const taxonomy1 = taxonomy1Original.map(t => t.trim());
  const taxonomy2 = taxonomy2Original.map(t => t.trim());

  // Find the length of the shorter taxonomy (we can only compare up to this point)
  const minLength = Math.min(taxonomy1.length, taxonomy2.length);

  // Last index where both paths still agree (case-insensitive); first mismatch ends the shared prefix.
  let lastCommonIndex = -1;

  for (let i = 0; i < minLength; i++) {
    const taxon1 = taxonomy1[i]?.trim();
    const taxon2 = taxonomy2[i]?.trim();

    if (taxon1 && taxon2 && taxon1.toLowerCase() === taxon2.toLowerCase()) {
      lastCommonIndex = i;
    } else {
      // Found divergence point - stop here
      break;
    }
  }

  if (lastCommonIndex === -1) {
    return {
      clade: "Life",
      rank: "root",
      depth: -1,
      path: [],
    };
  }

  // Identical paths: LCA is the deepest rank (both lists match through the end).
  if (lastCommonIndex === minLength - 1 && taxonomy1.length === taxonomy2.length) {
    // Return the deepest level (most specific) as LCA
    const depth = taxonomy1.length - 1;
    return {
      clade: taxonomy1Original[depth]!,
      rank: TAXONOMIC_RANKS[depth] || "unknown",
      depth,
      path: [...taxonomy1Original],
    };
  }

  // Prefer original strings for display; comparison used trimmed/lowercase only above.
  const lcaClade = taxonomy1Original[lastCommonIndex]!;
  const lcaDepth = lastCommonIndex;
  const lcaRank = TAXONOMIC_RANKS[lcaDepth] || "unknown";
  const lcaPath = taxonomy1Original.slice(0, lastCommonIndex + 1);

  return {
    clade: lcaClade,
    rank: lcaRank,
    depth: lcaDepth,
    path: lcaPath,
  };
}
