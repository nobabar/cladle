import type { TaxonInLineage } from "~/types/taxonInLineage";

/**
 * iNaturalist species floor: include taxa at or above species in playable lineage.
 * Kingdom ≈ 70, phylum ≈ 60, …, species = 10; subspecies = 5 (excluded).
 */
export const SPECIES_RANK_LEVEL = 10;

/** Rank names excluded when {@link rank_level} is absent (minimal fallback only). */
const BELOW_SPECIES_RANKS = new Set(["subspecies", "variety", "form"]);

/**
 * Raw taxon shape from iNaturalist API responses before normalization to {@link TaxonInLineage}.
 */
export interface LineageSourceTaxon {
  id: number | string;
  name: string;
  rank: string;
  rank_level?: number;
}

/**
 * Whether a taxon belongs in playable lineage (at or above species).
 *
 * Uses iNaturalist {@link SPECIES_RANK_LEVEL} when `rank_level` is present.
 * Otherwise falls back to excluding known infraspecific rank names only.
 *
 * @param rankLevel - iNaturalist numeric rank level, if provided on the taxon.
 * @param rank - iNaturalist rank string (e.g. `"species"`, `"subspecies"`).
 * @returns `true` when the taxon should appear in `Animal.lineage`.
 */
export function isAtOrAboveSpecies(rankLevel?: number, rank?: string): boolean {
  if (rankLevel !== undefined && !Number.isNaN(rankLevel)) {
    return rankLevel >= SPECIES_RANK_LEVEL;
  }
  if (!rank) {
    return true;
  }
  return !BELOW_SPECIES_RANKS.has(rank.toLowerCase());
}

/**
 * Map one API taxon to a {@link TaxonInLineage} entry.
 *
 * @param taxon - Source taxon from ancestors or the terminal leaf.
 * @returns Normalized lineage step with string `id` and optional `rankLevel`.
 */
function toLineageEntry(taxon: LineageSourceTaxon): TaxonInLineage {
  const entry: TaxonInLineage = {
    id: String(taxon.id),
    name: taxon.name,
    rank: taxon.rank,
  };
  if (taxon.rank_level !== undefined && !Number.isNaN(taxon.rank_level)) {
    entry.rankLevel = taxon.rank_level;
  }
  return entry;
}

/**
 * Drop pre-Animalia noise so lineage starts at Animalia when present.
 *
 * iNaturalist ancestor lists may include `stateofmatter` or other pre-kingdom nodes.
 * If kingdom Animalia exists, everything before it is removed; otherwise only
 * `stateofmatter` ranks are stripped.
 *
 * @param taxa - Ordered ancestor list plus terminal taxon (not yet filtered).
 * @returns Taxa slice beginning at Animalia or with pre-kingdom noise removed.
 */
function trimPreAnimalia(taxa: LineageSourceTaxon[]): LineageSourceTaxon[] {
  const animaliaIndex = taxa.findIndex(
    t => t.rank === "kingdom" && t.name.trim().toLowerCase() === "animalia",
  );
  if (animaliaIndex >= 0) {
    return taxa.slice(animaliaIndex);
  }
  return taxa.filter(t => t.rank !== "stateofmatter");
}

/**
 * Build `Animal.lineage` from iNaturalist ancestors and the terminal taxon.
 *
 * - Preserves iNaturalist order (broad → specific).
 * - Includes only taxa with `rank_level >=` {@link SPECIES_RANK_LEVEL} (or rank fallback).
 * - Deduplicates by taxon `id` (species often appears in both `ancestors` and leaf).
 * - Trims pre-Animalia nodes via {@link trimPreAnimalia}.
 *
 * @param ancestors - Ancestor taxa from `include_ancestors=true` or a follow-up fetch.
 * @param taxon - The selected animal taxon (typically rank `species`).
 * @returns Lineage from kingdom (or Animalia) through species, variable length.
 */
export function buildLineageFromAncestors(
  ancestors: LineageSourceTaxon[],
  taxon: LineageSourceTaxon,
): TaxonInLineage[] {
  const ordered = trimPreAnimalia([...ancestors, taxon]);
  const lineage: TaxonInLineage[] = [];
  const seenIds = new Set<string>();

  for (const source of ordered) {
    if (!isAtOrAboveSpecies(source.rank_level, source.rank)) {
      continue;
    }
    const id = String(source.id);
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    lineage.push(toLineageEntry(source));
  }

  return lineage;
}

/**
 * Display names along a lineage path (broad → specific).
 *
 * @param lineage - Full or partial animal lineage.
 * @returns Taxon names in path order (same order as `lineage`).
 */
export function lineageNames(lineage: TaxonInLineage[]): string[] {
  return lineage.map(t => t.name);
}

/**
 * Clade names from the root through a target depth index (inclusive).
 *
 * Used for LCA `path` display and tree metadata. Returns an empty array when
 * `depth` is negative (e.g. no common ancestor).
 *
 * @param lineage - Target or guess lineage path.
 * @param depth - Zero-based index into `lineage`; `-1` yields `[]`.
 * @returns Prefix of {@link lineageNames} through `depth`, inclusive.
 */
export function lineagePath(lineage: TaxonInLineage[], depth: number): string[] {
  if (depth < 0) {
    return [];
  }
  return lineageNames(lineage.slice(0, depth + 1));
}

const STANDARD_RANKS = [
  "kingdom",
  "phylum",
  "class",
  "order",
  "family",
  "genus",
  "species",
] as const;

const STANDARD_RANK_LEVELS = [70, 60, 50, 40, 30, 20, 10];

/**
 * Build a synthetic lineage from display names (fallback animals, tests).
 *
 * Assigns standard Linnaean ranks and iNaturalist-style `rankLevel` values by
 * position unless overridden. Shared ancestor steps in tests should pass explicit
 * `ids` so identity-based LCA can match across animals.
 *
 * @param names - Taxon display names from kingdom toward species.
 * @param options - Optional per-index overrides.
 * @param options.ids - Taxon ids (should match across animals for shared clades).
 * @param options.ranks - Rank strings per index.
 * @param options.rankLevels - iNaturalist-style rank levels per index.
 * @returns Lineage entries suitable for {@link Animal.lineage}.
 */
export function lineageFromNames(
  names: string[],
  options?: {
    ids?: string[];
    ranks?: string[];
    rankLevels?: number[];
  },
): TaxonInLineage[] {
  return names.map((name, index) => {
    const rank = options?.ranks?.[index]
      ?? STANDARD_RANKS[Math.min(index, STANDARD_RANKS.length - 1)]!;
    const rankLevel = options?.rankLevels?.[index]
      ?? STANDARD_RANK_LEVELS[Math.min(index, STANDARD_RANK_LEVELS.length - 1)];
    return {
      id: options?.ids?.[index] ?? `taxon-${index}`,
      name,
      rank,
      rankLevel,
    };
  });
}
