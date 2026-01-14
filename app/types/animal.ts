/**
 * Animal Data Interface
 *
 * Represents an animal entity from the biological database API.
 * Used throughout the application for animal data representation.
 */
export interface Animal {
  /** Unique identifier for the animal */
  id: string;

  /** Common name of the animal (e.g., "African Elephant") */
  name: string;

  /** Scientific taxonomic name (e.g., "Loxodonta africana") */
  scientificName: string;

  /**
   * Full taxonomic classification, ordered from kingdom to species
   * Example: ["Animalia", "Chordata", "Mammalia", "Proboscidea", "Elephantidae", "Loxodonta", "Loxodonta africana"]
   */
  taxonomy: string[];

  /** Optional URL to the animal's page on the biological database (e.g., iNaturalist) */
  url?: string;

  /** Optional URL to the animal's Wikipedia page for additional information */
  wikipediaUrl?: string;

  /** Optional URL to an image of the animal */
  imageUrl?: string;

  /** Optional description or additional information about the animal */
  description?: string;
}
