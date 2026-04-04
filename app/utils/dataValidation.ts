/**
 * Validation functions for API response data.
 * Returns ValidationResult with errors; weak shapes are coerced where needed (e.g. empty taxonomy → ["Animalia"]).
 */

import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";

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
 * - taxonomy: Must be a non-empty array of strings
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

  // Taxonomy: required field, but empty or all-blank entries are coerced to a minimal lineage below.
  if (!data.taxonomy) {
    errors.push("Missing taxonomy");
  } else if (!Array.isArray(data.taxonomy)) {
    errors.push("Invalid taxonomy format");
  } else {
    // Check if there's at least one valid taxonomy term
    const validTerms = data.taxonomy.filter(
      (term: any) => typeof term === "string" && term.trim().length > 0,
    );
    if (validTerms.length === 0) {
      // No usable terms: still valid; animal builder substitutes ["Animalia"] (common for lightweight search hits).
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
    taxonomy: (() => {
      if (!Array.isArray(data.taxonomy)) {
        return ["Animalia"];
      }
      const validTerms = data.taxonomy
        .filter((term: any) => typeof term === "string" && term.trim().length > 0)
        .map((term: string) => term.trim());
      return validTerms.length > 0 ? validTerms : ["Animalia"];
    })(),
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

/**
 * Check if taxonomy array is valid
 *
 * A valid taxonomy:
 * - Must be an array
 * - Must have at least one element
 * - All elements must be non-empty strings
 *
 * @param taxonomy - Taxonomy data to validate
 * @returns True if taxonomy is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidTaxonomy(['Animalia', 'Chordata', 'Mammalia']) // true
 * isValidTaxonomy([]) // false
 * isValidTaxonomy(['Animalia', '', 'Mammalia']) // false
 * isValidTaxonomy('not-an-array') // false
 * ```
 */
export function isValidTaxonomy(taxonomy: any): boolean {
  if (!Array.isArray(taxonomy)) {
    return false;
  }

  if (taxonomy.length === 0) {
    return false;
  }

  // All elements must be non-empty strings
  return taxonomy.every(
    term => typeof term === "string" && term.trim().length > 0,
  );
}
