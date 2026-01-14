/**
 * Clade Data Interface
 *
 * Represents a clade (taxonomic group) from the biological database API.
 * Clades are used to build the phylogenetic tree in the game.
 */
export interface Clade {
  /** Clade name (e.g., "Mammalia", "Chordata") */
  name: string;

  /**
   * Taxonomic rank of the clade
   * Examples: "kingdom", "phylum", "class", "order", "family", "genus", "species"
   */
  rank: string;

  /** Optional URL to the clade's page on the biological database (e.g., iNaturalist) */
  url?: string;

  /** Optional URL to the clade's Wikipedia page for additional information */
  wikipediaUrl?: string;

  /** Optional description of the clade */
  description?: string;

  /** Optional URL to an image representing the clade */
  imageUrl?: string;
}
