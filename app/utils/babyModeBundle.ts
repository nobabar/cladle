/**
 * Baby Mode static animal bundle, offline LCA/tree without live API.
 *
 * Bundle `version` is independent of PERSISTED_GAME_STATE_SCHEMA_VERSION.
 * In-progress saves embed full `Animal` in babyModeState; a bundle bump does not rewrite old snapshots.
 */

import type { Animal } from "~/types/animal";
import type { TaxonInLineage } from "~/types/taxonInLineage";
import { BABY_MODE_DIFFICULTY_PROFILE } from "~/utils/babyMode";
import bundleJson from "~/assets/data/baby-mode-bundle.json";

export const BABY_MODE_BUNDLE_VERSION = 1;

export interface BabyModeBundle {
  version: number;
  generatedAt: string;
  animals: Animal[];
}

let cachedBundle: BabyModeBundle | null = null;
let cachedById: Map<string, Animal> | null = null;

function isValidTaxonInLineage(entry: unknown): entry is TaxonInLineage {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  const taxon = entry as Record<string, unknown>;
  return (
    typeof taxon.id === "string"
    && taxon.id.length > 0
    && typeof taxon.name === "string"
    && taxon.name.length > 0
    && typeof taxon.rank === "string"
    && taxon.rank.length > 0
  );
}

function isValidAnimal(entry: unknown): entry is Animal {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  const animal = entry as Record<string, unknown>;
  if (
    typeof animal.id !== "string"
    || animal.id.length === 0
    || typeof animal.name !== "string"
    || animal.name.length === 0
    || typeof animal.scientificName !== "string"
    || animal.scientificName.length === 0
    || !Array.isArray(animal.lineage)
    || animal.lineage.length === 0
  ) {
    return false;
  }
  return animal.lineage.every(isValidTaxonInLineage);
}

function validateBundle(raw: unknown): BabyModeBundle | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const envelope = raw as Record<string, unknown>;
  const { minCount, maxCount } = BABY_MODE_DIFFICULTY_PROFILE;

  if (
    typeof envelope.version !== "number"
    || !Number.isInteger(envelope.version)
    || typeof envelope.generatedAt !== "string"
    || !Array.isArray(envelope.animals)
  ) {
    return undefined;
  }

  const animals = envelope.animals;
  if (animals.length < minCount || animals.length > maxCount) {
    return undefined;
  }

  if (!animals.every(isValidAnimal)) {
    return undefined;
  }

  const ids = animals.map(animal => animal.id);
  if (new Set(ids).size !== ids.length) {
    return undefined;
  }

  return {
    version: envelope.version,
    generatedAt: envelope.generatedAt,
    animals,
  };
}

/**
 * Parse and validate the committed bundle once.
 * Returns an empty bundle shape when JSON is corrupt, callers treat missing animals as unavailable.
 * @returns Validated bundle or empty fallback when corrupt.
 */
export function loadBabyModeBundle(): BabyModeBundle {
  if (cachedBundle) {
    return cachedBundle;
  }

  const validated = validateBundle(bundleJson);
  cachedBundle = validated ?? {
    version: 0,
    generatedAt: "",
    animals: [],
  };
  cachedById = null;

  return cachedBundle;
}

function getAnimalsByIdMap(): Map<string, Animal> {
  if (cachedById) {
    return cachedById;
  }

  const bundle = loadBabyModeBundle();
  cachedById = new Map(bundle.animals.map(animal => [animal.id, animal]));
  return cachedById;
}

/**
 * Synchronous lookup, no API or IndexedDB. Returns undefined for unknown or corrupt bundle ids.
 * @param id - iNaturalist taxon id string.
 * @returns Bundled animal or undefined.
 */
export function getBabyModeAnimal(id: string): Animal | undefined {
  return getAnimalsByIdMap().get(id);
}

/**
 * All bundled animals for Baby Mode search.
 * @returns Copy of bundled animals array.
 */
export function listBabyModeAnimals(): Animal[] {
  return [...loadBabyModeBundle().animals];
}

/**
 * Map view for O(1) lookups by id.
 * @returns New map of id -> Animal.
 */
export function getBabyModeAnimalsById(): Map<string, Animal> {
  return new Map(getAnimalsByIdMap());
}
