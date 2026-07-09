import type { Animal } from "~/types/animal";
import type { LCAResult } from "~/utils/lcaCalculator";
import { lcaResultFromTargetPath } from "~/utils/lcaCalculator";
import { SPECIES_RANK_LEVEL } from "~/utils/taxonLineage";

export interface HintCladeSelectorGuess {
  lca: LCAResult;
}

export interface HintCladeSelectorInput {
  target: Animal;
  guesses: HintCladeSelectorGuess[];
  /** Raw clade names from prior hints (`revealedClade`). */
  previousHintClades: string[];
  /** Normalized clade names already visible on the tree (`cladeMap` keys). */
  revealedCladeNames: string[];
}

/** Slice of game state needed to build {@link HintCladeSelectorInput}. */
export interface BuildHintCladeSelectorInputParams {
  target: Animal;
  guesses: HintCladeSelectorGuess[];
  hints: { revealedClade: string | null }[];
  revealedCladeNames: string[];
}

/**
 * Build selector input from game state.
 * @param params - The parameters for the hint clade selector. See {@link BuildHintCladeSelectorInputParams}.
 * @returns The input for the hint clade selector.
 */
export function buildHintCladeSelectorInput(
  params: BuildHintCladeSelectorInputParams,
): HintCladeSelectorInput {
  const previousHintClades = params.hints
    .map(h => h.revealedClade)
    .filter((c): c is string => Boolean(c));

  return {
    target: params.target,
    guesses: params.guesses,
    previousHintClades,
    revealedCladeNames: params.revealedCladeNames,
  };
}

/**
 * Normalize clade names for set lookups (matches `gameStore.normalizeCladeName`).
 * @param name - A clade name.
 * @returns The normalized clade name.
 */
export function normalizeCladeName(name: string): string {
  return name.trim().toLowerCase();
}

function buildRevealedSet(input: HintCladeSelectorInput): Set<string> {
  const revealedSet = new Set<string>();
  for (const name of input.revealedCladeNames) {
    revealedSet.add(normalizeCladeName(name));
  }
  for (const clade of input.previousHintClades) {
    if (clade) {
      revealedSet.add(normalizeCladeName(clade));
    }
  }
  return revealedSet;
}

/**
 * Deepest rank on the target path already known from guesses, hints, or the tree.
 * @param lineage - The lineage of the target animal.
 * @param revealedSet - The set of revealed clades.
 * @param guessDepths - The depths of the guesses.
 * @returns The deepest depth on the target path already known from guesses, hints, or the tree.
 */
function deepestDiscoveredDepthOnTargetPath(
  lineage: Animal["lineage"],
  revealedSet: Set<string>,
  guessDepths: number[],
): number {
  let maxDepth = guessDepths.length > 0 ? Math.max(...guessDepths) : -1;

  for (let d = 0; d < lineage.length; d++) {
    const clade = lineage[d]?.name;
    if (clade?.trim() && revealedSet.has(normalizeCladeName(clade))) {
      maxDepth = Math.max(maxDepth, d);
    }
  }

  return maxDepth;
}

function isSpeciesRank(rank: string, rankLevel?: number): boolean {
  if (rankLevel !== undefined) {
    return rankLevel <= SPECIES_RANK_LEVEL && rank === "species";
  }
  return rank === "species";
}

/**
 * Reveal the clade one rank toward the target above the deepest discovery so far.
 * Never reveals species.
 *
 * @param input - The input for the hint clade selector.
 * @returns LCA-shaped result for the chosen clade, or `null` when no step remains.
 */
export function selectHintClade(input: HintCladeSelectorInput): LCAResult | null {
  const lineage = input.target.lineage;
  if (!lineage?.length) {
    return null;
  }

  const targetSpeciesDepth = lineage.length - 1;
  const revealedSet = buildRevealedSet(input);
  const guessDepths = input.guesses.map(g => g.lca.depth);
  const anchorDepth = deepestDiscoveredDepthOnTargetPath(lineage, revealedSet, guessDepths);
  const candidateDepth = anchorDepth + 1;

  if (candidateDepth >= targetSpeciesDepth) {
    return null;
  }

  const candidate = lineage[candidateDepth];
  if (!candidate?.name?.trim()) {
    return null;
  }

  if (isSpeciesRank(candidate.rank, candidate.rankLevel)) {
    return null;
  }

  if (revealedSet.has(normalizeCladeName(candidate.name))) {
    return null;
  }

  return lcaResultFromTargetPath(input.target, candidateDepth);
}
