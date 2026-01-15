import type { Animal } from "~/types/animal";

/**
 * Result of Last Common Ancestor (LCA) calculation
 */
export interface LCAResult {
  /** Name of the LCA clade (e.g., "Carnivora") */
  clade: string;

  /** Taxonomic rank (e.g., "order", "family", "genus") */
  rank: string;

  /** Index in taxonomy array representing depth (0-based) */
  depth: number;

  /** Full path from root to LCA */
  path: string[];
}

/**
 * Standard taxonomic ranks indexed by position
 * This mapping helps determine the rank based on taxonomy depth
 * Special case: -1 maps to "root" for edge cases (no common ancestor)
 */
const TAXONOMIC_RANKS: Record<number, string> = {
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
 * Time Complexity: O(n) where n is the shorter taxonomy length
 * Space Complexity: O(n) for the path array
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

  const taxonomy1 = animal1.taxonomy;
  const taxonomy2 = animal2.taxonomy;

  // Find the length of the shorter taxonomy (we can only compare up to this point)
  const minLength = Math.min(taxonomy1.length, taxonomy2.length);

  // Find the last common index (last matching element in both arrays)
  let lastCommonIndex = -1;

  for (let i = 0; i < minLength; i++) {
    if (taxonomy1[i] === taxonomy2[i]) {
      lastCommonIndex = i;
    } else {
      // Found divergence point - stop here
      break;
    }
  }

  // Handle edge case: no common ancestor found
  if (lastCommonIndex === -1) {
    return {
      clade: "Life",
      rank: "root",
      depth: -1,
      path: [],
    };
  }

  // Handle special case: taxonomies are identical
  // If we matched up to the last index and lengths are equal, all elements match
  if (lastCommonIndex === minLength - 1 && taxonomy1.length === taxonomy2.length) {
    // Return the deepest level (most specific) as LCA
    const depth = taxonomy1.length - 1;
    return {
      clade: taxonomy1[depth]!,
      rank: TAXONOMIC_RANKS[depth] || "unknown",
      depth,
      path: [...taxonomy1],
    };
  }

  // Normal case: extract LCA information
  const lcaClade = taxonomy1[lastCommonIndex]!;
  const lcaDepth = lastCommonIndex;
  const lcaRank = TAXONOMIC_RANKS[lcaDepth] || "unknown";
  const lcaPath = taxonomy1.slice(0, lastCommonIndex + 1);

  return {
    clade: lcaClade,
    rank: lcaRank,
    depth: lcaDepth,
    path: lcaPath,
  };
}
