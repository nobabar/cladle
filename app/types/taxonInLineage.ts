/**
 * One taxon step on an animal's lineage path (kingdom → species).
 */
export interface TaxonInLineage {
  id: string;
  name: string;
  rank: string;
  rankLevel?: number;
}
