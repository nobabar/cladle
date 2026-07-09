/**
 * Validation functions for API response data.
 * Returns ValidationResult with errors; missing lineage is normalized to an empty array.
 */

import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";
import type { TaxonInLineage } from "~/types/taxonInLineage";

/** Validation result structure. */
export interface ValidationResult<T> {
  /** Whether the data passed validation */
  valid: boolean;

  /** Validated data object, or null if validation failed */
  data: T | null;

  /** Array of validation error messages */
  errors: string[];
}

/** Valid taxonomic ranks for clade validation. */
const VALID_TAXONOMIC_RANKS = [
  "kingdom",
  "phylum",
  "class",
  "order",
  "family",
  "genus",
  "species",
  "subspecies",
  "variety",
] as const;

/**
 * Validate animal data from API response
 *
 * Required fields:
 * - id: Must be present and convertible to string
 * - name or scientificName: At least one must be present
 * - lineage: Array of taxon entries (may be empty for search-only animals)
 *
 * Optional fields:
 * - imageUrl, description, url, wikipediaUrl: May be missing
 *
 * @param data - Raw data from API response
 * @returns ValidationResult with validated Animal or error details
 *
 * @example
 * ```typescript
 * const result = validateAnimalData(apiResponse);
 * if (result.valid) {
 *   const animal = result.data; // Type-safe Animal
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateAnimalData(
  data: any,
): ValidationResult<Animal> {
  const errors: string[] = [];

  // Check required fields
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      data: null,
      errors: ["Data must be an object"],
    };
  }

  // Validate ID
  if (!data.id && data.id !== 0) {
    errors.push("Missing animal ID");
  } else if (typeof data.id !== "string" && typeof data.id !== "number") {
    errors.push("Animal ID must be a string or number");
  }

  // Validate name (either name or scientificName required)
  const hasName = data.name && typeof data.name === "string" && data.name.trim().length > 0;
  const hasScientificName
    = data.scientificName
      && typeof data.scientificName === "string"
      && data.scientificName.trim().length > 0;

  if (!hasName && !hasScientificName) {
    errors.push("Missing animal name (name or scientificName required)");
  }

  if (data.lineage !== undefined && data.lineage !== null) {
    if (!Array.isArray(data.lineage)) {
      errors.push("Invalid lineage format");
    } else if (!isValidLineage(data.lineage)) {
      errors.push("Invalid lineage entries");
    }
  }

  // If validation failed, return early
  if (errors.length > 0) {
    return {
      valid: false,
      data: null,
      errors,
    };
  }

  const animal: Animal = {
    id: String(data.id).trim(),
    name: hasName ? data.name.trim() : data.scientificName.trim(),
    scientificName: hasScientificName
      ? data.scientificName.trim()
      : (data.name?.trim() || ""),
    lineage: normalizeLineageFromRaw(data.lineage),
    // Optional fields - use undefined if not present (not empty strings)
    url: data.url && typeof data.url === "string" && data.url.trim().length > 0
      ? data.url.trim()
      : undefined,
    wikipediaUrl:
      data.wikipediaUrl
      && typeof data.wikipediaUrl === "string"
      && data.wikipediaUrl.trim().length > 0
        ? data.wikipediaUrl.trim()
        : undefined,
    imageUrl:
      data.imageUrl && typeof data.imageUrl === "string" && data.imageUrl.trim().length > 0
        ? data.imageUrl.trim()
        : undefined,
    description:
      data.description
      && typeof data.description === "string"
      && data.description.trim().length > 0
        ? data.description.trim()
        : undefined,
  };

  return {
    valid: true,
    data: animal,
    errors: [],
  };
}

/**
 * Validate clade data from API response
 *
 * Required fields:
 * - name: Must be a non-empty string
 * - rank: Must be a valid taxonomic rank
 *
 * Optional fields:
 * - description, imageUrl, url, wikipediaUrl: May be missing
 *
 * @param data - Raw data from API response
 * @returns ValidationResult with validated Clade or error details
 *
 * @example
 * ```typescript
 * const result = validateCladeData(apiResponse);
 * if (result.valid) {
 *   const clade = result.data; // Type-safe Clade
 * } else {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateCladeData(data: any): ValidationResult<Clade> {
  const errors: string[] = [];

  // Check required fields
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      data: null,
      errors: ["Data must be an object"],
    };
  }

  // Validate name
  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Missing or invalid clade name");
  }

  // Validate rank
  if (!data.rank || typeof data.rank !== "string" || data.rank.trim().length === 0) {
    errors.push("Missing or invalid clade rank");
  } else {
    const rank = data.rank.trim().toLowerCase();
    if (!VALID_TAXONOMIC_RANKS.includes(rank as any)) {
      // Allow rank even if not in standard list (some APIs use custom ranks)
      // Just log a warning, don't fail validation
      console.warn(`Non-standard taxonomic rank: ${rank}`);
    }
  }

  // If validation failed, return early
  if (errors.length > 0) {
    return {
      valid: false,
      data: null,
      errors,
    };
  }

  const clade: Clade = {
    name: data.name.trim(),
    rank: data.rank.trim(),
    preferredCommonName:
      data.preferredCommonName
      && typeof data.preferredCommonName === "string"
      && data.preferredCommonName.trim().length > 0
        ? data.preferredCommonName.trim()
        : undefined,
    // Optional fields - use undefined if not present
    url:
      data.url && typeof data.url === "string" && data.url.trim().length > 0
        ? data.url.trim()
        : undefined,
    wikipediaUrl:
      data.wikipediaUrl
      && typeof data.wikipediaUrl === "string"
      && data.wikipediaUrl.trim().length > 0
        ? data.wikipediaUrl.trim()
        : undefined,
    imageUrl:
      data.imageUrl && typeof data.imageUrl === "string" && data.imageUrl.trim().length > 0
        ? data.imageUrl.trim()
        : undefined,
    description:
      data.description
      && typeof data.description === "string"
      && data.description.trim().length > 0
        ? data.description.trim()
        : undefined,
  };

  return {
    valid: true,
    data: clade,
    errors: [],
  };
}

function isValidLineageEntry(entry: unknown): entry is TaxonInLineage {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  const e = entry as Record<string, unknown>;
  return (
    (typeof e.id === "string" || typeof e.id === "number")
    && typeof e.name === "string"
    && e.name.trim().length > 0
    && typeof e.rank === "string"
    && e.rank.trim().length > 0
  );
}

/**
 * Check whether a lineage array is valid.
 *
 * Each entry must have a non-empty `id`, `name`, and `rank`.
 *
 * @param lineage - Lineage data to validate
 * @returns `true` when every entry is a valid {@link TaxonInLineage} shape
 */
export function isValidLineage(lineage: unknown): boolean {
  if (!Array.isArray(lineage)) {
    return false;
  }
  return lineage.every(isValidLineageEntry);
}

function normalizeLineageFromRaw(raw: unknown): TaxonInLineage[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    if (!isValidLineageEntry(item)) {
      throw new Error("normalizeLineageFromRaw: invalid lineage entry after validation");
    }
    const entry: TaxonInLineage = {
      id: String(item.id).trim(),
      name: item.name.trim(),
      rank: item.rank.trim(),
    };
    if (item.rankLevel !== undefined && !Number.isNaN(item.rankLevel)) {
      entry.rankLevel = item.rankLevel;
    }
    return entry;
  });
}
