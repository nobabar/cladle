/**
 * Clade Data Interface
 *
 * Represents a clade (taxonomic group) from the biological database API.
 * Clades are used to build the phylogenetic tree in the game.
 */
export interface Clade {
  name: string;

  /** e.g. kingdom, phylum, class, order, family, genus, species */
  rank: string;

  /** Preferred common name when it differs from {@link name} (iNaturalist `preferred_common_name`). */
  preferredCommonName?: string;

  url?: string;
  wikipediaUrl?: string;
  description?: string;
  imageUrl?: string;
}
