/**
 * Animal Data Interface
 *
 * Represents an animal entity from the biological database API.
 * Used throughout the application for animal data representation.
 */
export interface Animal {
  id: string;

  /** Common name of the animal (e.g., "African Elephant") */
  name: string;

  /** Scientific taxonomic name (e.g., "Loxodonta africana") */
  scientificName: string;

  /**
   * Kingdom → species, broad to specific.
   * Example: ["Animalia", "Chordata", "Mammalia", "Proboscidea", "Elephantidae", "Loxodonta", "Loxodonta africana"]
   */
  taxonomy: string[];

  url?: string;
  wikipediaUrl?: string;
  imageUrl?: string;
  description?: string;
}
