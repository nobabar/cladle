/**
 * Load full Animal records on the server for LCA / reveal.
 */

import type { Animal } from "~/types/animal";
import { getBabyModeAnimal } from "~/utils/babyModeBundle";
import { validateAnimalData } from "~/utils/dataValidation";
import { buildLineageFromAncestors } from "~/utils/taxonLineage";
import type { GameApiMode } from "./gameToken";

const INATURALIST_BASE_URL = "https://api.inaturalist.org/v1";

interface INaturalistTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  rank: string;
  rank_level?: number;
  wikipedia_url?: string;
  wikipedia_summary?: string;
  default_photo?: { medium_url?: string };
  ancestors?: INaturalistTaxon[];
}

const targetCache = new Map<string, Animal>();

function mapTaxonToAnimal(taxon: INaturalistTaxon): Animal {
  const lineage = buildLineageFromAncestors(
    /* eslint-disable camelcase */
    (taxon.ancestors ?? []).map(a => ({
      id: a.id,
      name: a.name,
      rank: a.rank,
      rank_level: a.rank_level,
    })),
    {
      id: taxon.id,
      name: taxon.name,
      rank: taxon.rank,
      rank_level: taxon.rank_level,
      /* eslint-enable camelcase */
    },
  );

  return {
    id: String(taxon.id),
    name: taxon.preferred_common_name || taxon.name,
    scientificName: taxon.name,
    lineage,
    imageUrl: taxon.default_photo?.medium_url,
    description: taxon.wikipedia_summary,
    wikipediaUrl: taxon.wikipedia_url,
    url: `https://www.inaturalist.org/taxa/${taxon.id}`,
  };
}

/**
 * Fetch an animal by iNaturalist id (process-local cache).
 * @param id - iNaturalist taxon id
 * @returns Animal or null if not found
 */
export async function loadAnimalById(id: string): Promise<Animal | null> {
  const cached = targetCache.get(id);
  if (cached) {
    return cached;
  }

  const url = `${INATURALIST_BASE_URL}/taxa/${encodeURIComponent(id)}?include_ancestors=true`;
  const response = await $fetch<{ results?: INaturalistTaxon[] }>(url).catch(() => null);
  const taxon = response?.results?.[0];
  if (!taxon) {
    return null;
  }

  const mapped = mapTaxonToAnimal(taxon);
  const validation = validateAnimalData(mapped);
  if (!validation.valid || !validation.data) {
    return null;
  }

  targetCache.set(id, validation.data);
  return validation.data;
}

/**
 * Load the target for a mode (Baby Mode bundle, otherwise iNaturalist).
 * @param mode - Game mode
 * @param targetId - iNaturalist taxon id
 * @returns Animal or null if not found
 */
export async function loadMysteryTarget(
  mode: GameApiMode,
  targetId: string,
): Promise<Animal | null> {
  if (mode === "baby") {
    return getBabyModeAnimal(targetId) ?? null;
  }
  return loadAnimalById(targetId);
}
