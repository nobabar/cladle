/**
 * Preview photos for taxon galleries (win state, etc.).
 * Sourced from iNaturalist `default_photo` + `taxon_photos` on a single taxa request.
 */

export interface TaxonGalleryPhoto {
  id: string;
  mediumUrl: string;
  largeUrl?: string;
  attribution?: string;
}

/** Max photos loaded per taxon gallery request (limits API payload use). */
export const TAXON_GALLERY_MAX_PHOTOS = 5;

/**
 * iNaturalist taxon page listing community photos for a taxon.
 * @param taxonId - iNaturalist taxon ID
 * @returns URL to the iNaturalist taxon page listing community photos for the given taxon
 */
export function inaturalistTaxonBrowsePhotosUrl(taxonId: string): string {
  return `https://www.inaturalist.org/taxa/${taxonId}/browse_photos`;
}
