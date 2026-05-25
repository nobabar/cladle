/**
 * Biological API Client Composable
 *
 * Abstract interface for biological database API integration.
 * This composable defines the contract for fetching animal and clade data,
 * allowing for implementation swapping based on API selection.
 *
 * @see services/apiClient.ts - Concrete implementation
 */

import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";
import type { ApiResponse } from "~/types/api";
import type { TaxonGalleryPhoto } from "~/types/taxonGallery";
import { apiClient as defaultApiClient } from "~/services/apiClient";

export interface BiologicalAPIClient {
  fetchAnimalData: (id: string) => Promise<ApiResponse<Animal>>;
  fetchTaxonGalleryPhotos: (
    id: string,
    limit?: number,
  ) => Promise<ApiResponse<TaxonGalleryPhoto[]>>;
  fetchCladeData: (name: string) => Promise<ApiResponse<Clade>>;
  searchAnimals: (query: string, limit?: number) => Promise<ApiResponse<Animal[]>>;
}

export interface BiologicalAPIOptions {
  implementation?: BiologicalAPIClient;
}

export function useBiologicalAPI(options?: BiologicalAPIOptions): BiologicalAPIClient {
  if (options?.implementation) {
    return options.implementation;
  }

  return defaultApiClient;
}
