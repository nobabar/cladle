/**
 * Rebuild hint-selector inputs from sealed token progress.
 */

import type { Animal } from "~/types/animal";
import type { LCAResult } from "~/utils/lcaCalculator";
import { normalizeCladeName } from "~/utils/hintCladeSelector";
import { isBabyModeOrganism, resolveBabyModeLCA } from "~/utils/babyMode";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { GameApiMode } from "./gameToken";
import { loadAnimalById, loadMysteryTarget } from "./loadAnimal";

/**
 * Collect clade names already known from sealed guesses and hints.
 * @param target - Mystery target
 * @param guessLcas - LCAs recomputed from sealed guess animal ids
 * @param hintClades - Sealed hint clade names
 * @returns Unique clade names for the hint selector
 */
export function revealedCladeNamesFromHistory(
  target: Animal,
  guessLcas: LCAResult[],
  hintClades: string[],
): string[] {
  const names = new Set<string>();

  for (const lca of guessLcas) {
    for (const clade of lca.path) {
      if (clade.trim()) {
        names.add(clade);
      }
    }
    if (lca.clade.trim()) {
      names.add(lca.clade);
    }
  }

  for (const hintClade of hintClades) {
    if (!hintClade.trim()) {
      continue;
    }
    names.add(hintClade);
    const idx = target.lineage.findIndex(
      taxon => normalizeCladeName(taxon.name) === normalizeCladeName(hintClade),
    );
    if (idx >= 0) {
      for (let i = 0; i <= idx; i++) {
        const name = target.lineage[i]?.name;
        if (name?.trim()) {
          names.add(name);
        }
      }
    }
  }

  return Array.from(names);
}

/**
 * Load sealed guess animals and recompute LCAs against the mystery target.
 * @param mode - Game mode
 * @param target - Mystery target
 * @param guessAnimalIds - Sealed guess animal ids in order
 * @returns LCA results in the same order (skips unknown ids)
 */
export async function recomputeGuessLcas(
  mode: GameApiMode,
  target: Animal,
  guessAnimalIds: string[],
): Promise<LCAResult[]> {
  const results: LCAResult[] = [];

  for (const animalId of guessAnimalIds) {
    if (mode === "baby" && !isBabyModeOrganism(animalId)) {
      continue;
    }
    const guess = mode === "baby"
      ? await loadMysteryTarget("baby", animalId)
      : await loadAnimalById(animalId);
    if (!guess) {
      continue;
    }
    let lca = calculateLCA(guess, target);
    if (mode === "baby") {
      lca = resolveBabyModeLCA(lca, target);
    }
    results.push(lca);
  }

  return results;
}
