/**
 * Biological API Client Composable
 *
 * Abstract interface for biological database API integration.
 * This composable defines the contract for fetching animal and clade data,
 * allowing for implementation swapping based on API selection.
 *
 * Architecture Pattern:
 * - Composable defines the interface (this file)
 * - Service provides concrete implementation (services/apiClient.ts)
 * - Allows for dependency injection and easy testing
 *
 * @see services/apiClient.ts - Concrete implementation
 */

import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";
import type { ApiResponse } from "~/types/api";
import { apiClient as defaultApiClient } from "~/services/apiClient";

/**
 * Biological API Client Interface
 *
 * Defines methods for fetching animal and clade data from biological databases.
 * Implementations must follow the wrapped response format defined in ApiResponse.
 */
export interface BiologicalAPIClient {
  /**
   * Fetch animal data by unique identifier
   *
   * @param id - Unique identifier for the animal (e.g., taxon ID from iNaturalist)
   * @returns Promise resolving to ApiResponse with Animal data or error
   *
   * @example
   * ```typescript
   * const result = await client.fetchAnimalData('12345');
   * if (result.data) {
   *   console.log(result.data.name, result.data.scientificName);
   * } else {
   *   console.error(result.error.message);
   * }
   * ```
   */
  fetchAnimalData: (id: string) => Promise<ApiResponse<Animal>>;

  /**
   * Fetch clade (taxonomic group) data by name
   *
   * @param name - Name of the clade (e.g., "Mammalia", "Chordata")
   * @returns Promise resolving to ApiResponse with Clade data or error
   *
   * @example
   * ```typescript
   * const result = await client.fetchCladeData('Mammalia');
   * if (result.data) {
   *   console.log(result.data.name, result.data.rank);
   * } else {
   *   console.error(result.error.message);
   * }
   * ```
   */
  fetchCladeData: (name: string) => Promise<ApiResponse<Clade>>;

  /**
   * Search for animals by name
   *
   * @param query - Search query (animal name or scientific name)
   * @param limit - Maximum number of results to return (default: 20)
   * @returns Promise resolving to ApiResponse with array of Animal data or error
   *
   * @example
   * ```typescript
   * const result = await client.searchAnimals('tiger', 10);
   * if (result.data) {
   *   result.data.forEach(animal => console.log(animal.name));
   * } else {
   *   console.error(result.error.message);
   * }
   * ```
   */
  searchAnimals: (query: string, limit?: number) => Promise<ApiResponse<Animal[]>>;
}

/**
 * Biological API Client Options
 *
 * Configuration options for the useBiologicalAPI composable.
 */
export interface BiologicalAPIOptions {
  /**
   * Optional custom implementation of the BiologicalAPIClient interface.
   * If not provided, the default implementation from services/apiClient.ts will be used.
   * Useful for testing and implementation swapping.
   */
  implementation?: BiologicalAPIClient;
}

/**
 * Use Biological API
 *
 * Composable for accessing biological database APIs.
 * Provides a consistent interface for fetching animal and clade data.
 * Default implementation uses iNaturalist API (services/apiClient.ts).
 *
 * @param options - Optional configuration options
 * @returns BiologicalAPIClient instance
 *
 * @example
 * ```typescript
 * // Use default implementation (iNaturalist API)
 * const api = useBiologicalAPI();
 * const animal = await api.fetchAnimalData('12345');
 *
 * // Use custom implementation (e.g., for testing)
 * const mockApi = useBiologicalAPI({ implementation: mockClient });
 * const testAnimal = await mockApi.fetchAnimalData('test-id');
 * ```
 */
export function useBiologicalAPI(options?: BiologicalAPIOptions): BiologicalAPIClient {
  // If a custom implementation is provided, use it
  if (options?.implementation) {
    return options.implementation;
  }

  // Return default implementation (iNaturalist API client)
  return defaultApiClient;
}
