import type { Animal } from "~/types/animal";
import type { LCAResult } from "~/utils/lcaCalculator";
import {
  lcaResultFromAnimalPath,
  lcaTaxonId,
  lineageIndexForTaxonId,
} from "~/utils/lcaCalculator";
import { normalizeCladeName } from "~/utils/hintCladeSelector";

/**
 * Index of the guess∩mystery LCA taxon on the guess lineage.
 * Prefers taxon-id match via the target lineage; falls back to normalized clade name.
 * @param guess - Guessed animal.
 * @param lcaResult - Guess∩mystery LCA (depth indexes into target when target is provided).
 * @param target - Mystery animal, when available for id resolution.
 * @returns Zero-based index on `guess.lineage`, or `-1` when unresolved.
 */
function resolveLcaIndexOnGuess(
  guess: Animal,
  lcaResult: LCAResult,
  target?: Animal | null,
): number {
  if (target) {
    const taxonId = lcaTaxonId(lcaResult, target);
    if (taxonId) {
      const byId = lineageIndexForTaxonId(guess, taxonId);
      if (byId >= 0) {
        return byId;
      }
    }
  }

  const normalizedLca = normalizeCladeName(lcaResult.clade);
  if (!normalizedLca) {
    return -1;
  }
  return (guess.lineage ?? []).findIndex(
    entry => normalizeCladeName(entry.name) === normalizedLca,
  );
}

/**
 * Select one guess-side intermediate clade between the guess∩mystery LCA and the animal.
 * Returns the first non-species taxon strictly after the LCA on the guess lineage.
 * Does not create a clade for the species leaf itself.
 * @param guess - Guessed animal.
 * @param lcaResult - Guess∩mystery LCA result.
 * @param target - Mystery animal (preferred for resolving LCA taxon id).
 * @returns Path-fill LCA result, or `null` when no eligible intermediate exists.
 */
export function selectPathFillClade(
  guess: Animal,
  lcaResult: LCAResult,
  target?: Animal | null,
): LCAResult | null {
  const lineage = guess.lineage ?? [];
  if (lcaResult.depth < 0 || lineage.length === 0) {
    return null;
  }

  const lcaIndex = resolveLcaIndexOnGuess(guess, lcaResult, target);
  if (lcaIndex < 0) {
    return null;
  }

  // One step only: first taxon strictly after the LCA (never the species leaf).
  const fillIndex = lcaIndex + 1;
  const entry = lineage[fillIndex];
  if (!entry || entry.rank === "species") {
    return null;
  }
  return lcaResultFromAnimalPath(guess, fillIndex);
}
