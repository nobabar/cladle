/**
 * Biological Database API Client Implementation
 *
 * Concrete implementation of the BiologicalAPIClient interface using iNaturalist API.
 * Features:
 * - Rate limiting with request throttling
 * - Retry logic with exponential backoff
 * - Response validation
 * - Error handling and logging
 * - AbortController for request timeouts
 *
 * @see composables/useBiologicalAPI.ts - Abstract interface
 */

import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";
import type { ApiError, ApiResponse } from "~/types/api";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";
import { CacheKeys, cacheService, TTL_VALUES } from "~/services/cacheService";
import {
  validateAnimalData,
  validateCladeData,
} from "~/utils/dataValidation";
import {
  getUserFriendlyError,
  mapHttpStatusToErrorCode,
} from "~/utils/errorMessages";

/**
 * iNaturalist API Configuration
 */
const INATURALIST_BASE_URL = "https://api.inaturalist.org/v1";
// ~1 request / second to respect iNaturalist API recommended practices.
// See: https://www.inaturalist.org/pages/api+recommended+practices
const RATE_LIMIT_DELAY = 1000;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000; // 5 seconds timeout between retries

/**
 * Rate Limiter
 * Simple in-memory rate limiter to respect API usage policies
 */
class RateLimiter {
  private lastRequestTime = 0;
  private requestQueue: Array<() => void> = [];
  private isProcessing = false;

  async throttle(): Promise<void> {
    return new Promise((resolve) => {
      this.requestQueue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Process queued requests with rate limiting
   * Ensures requests are spaced by RATE_LIMIT_DELAY
   */
  private processQueue(): void {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delay = Math.max(0, RATE_LIMIT_DELAY - timeSinceLastRequest);

    setTimeout(() => {
      this.lastRequestTime = Date.now();
      const resolve = this.requestQueue.shift();
      this.isProcessing = false;

      if (resolve) {
        resolve();
      }

      // Process next item in queue
      if (this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, delay);
  }
}

/**
 * iNaturalist API Response Types
 */
interface INaturalistTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  rank: string;
  ancestry?: string;
  ancestor_ids?: number[];
  ancestors?: INaturalistTaxon[];
  iconic_taxon_name?: string;
  wikipedia_url?: string;
  wikipedia_summary?: string;
  observations_count?: number;
  default_photo?: {
    medium_url?: string;
  };
}

interface INaturalistResponse {
  results: INaturalistTaxon[];
}

interface INaturalistSearchResult<TRecord> {
  type?: string;
  score?: number;
  record?: TRecord;
}

interface INaturalistSearchResponse {
  results: Array<INaturalistSearchResult<INaturalistTaxon>>;
}

/**
 * API Client Implementation
 */
class INaturalistAPIClient implements BiologicalAPIClient {
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Fetch animal data by ID
   * Implements hybrid caching: checks IndexedDB cache first, then fetches from API
   * @param id - Unique identifier for the animal
   * @returns Promise resolving to ApiResponse with Animal data or error
   */
  async fetchAnimalData(id: string): Promise<ApiResponse<Animal>> {
    const cacheKey = CacheKeys.animal(id);

    // 1. Check cache first (instant load if available)
    const cached = await cacheService.get<Animal>("animals", cacheKey);
    if (cached) {
      return { data: cached, error: null };
    }

    // 2. Cache miss - fetch from API
    // Include ancestor information to build taxonomy
    const url = `${INATURALIST_BASE_URL}/taxa/${id}?include_ancestors=true`;

    try {
      const response = await this.makeRequest<INaturalistResponse>(url);

      if (!response.results || response.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("ANIMAL_NOT_FOUND"),
          "ANIMAL_NOT_FOUND",
        );
      }

      const taxon = response.results[0]!;
      const mappedAnimal = await this.mapToAnimal(taxon);

      // Validate mapped animal data with comprehensive validation
      const validation = validateAnimalData(mappedAnimal);

      if (!validation.valid) {
        // Log detailed validation errors for developers
        this.logError("Animal Data Validation Failed", {
          animalId: id,
          errors: validation.errors,
          rawData: taxon,
        });

        // Return user-friendly error message
        return this.createErrorResponse(
          getUserFriendlyError("VALIDATION_ERROR"),
          "VALIDATION_ERROR",
          { validationErrors: validation.errors },
        );
      }

      // 3. Cache the validated result (only cache valid data)
      await cacheService.set(
        "animals",
        cacheKey,
        validation.data!,
        TTL_VALUES.ANIMAL,
      );

      return { data: validation.data, error: null };
    } catch (error) {
      return this.handleError(error, url);
    }
  }

  /**
   * Search for animals by name
   * Searches iNaturalist API for animals matching the query
   * Filters for Metazoa (animals) only, excluding plants and other kingdoms
   * Prioritizes common name matches but includes scientific name matches
   * @param query - Search query (animal name or scientific name)
   * @param limit - Maximum number of results to return (default: 20)
   * @returns Promise resolving to ApiResponse with array of Animal data or error
   */
  async searchAnimals(query: string, limit: number = 20): Promise<ApiResponse<Animal[]>> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return { data: [], error: null };
    }

    // Use iNaturalist's relevance-ranked search endpoint.
    // Unlike /taxa, /search ranks by textual match score (better for "Tiger" → Panthera tigris).
    // Caveat: /search doesn't support the same filters (rank/taxon_id) we used before, so we
    // post-filter results client-side to keep only Animalia + species/subspecies taxa.
    // Try to use iconic_taxa filter if supported by the search endpoint
    const url = `${INATURALIST_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}&sources=taxa&per_page=${limit * 3}`;

    try {
      const response = await this.makeRequest<INaturalistSearchResponse>(url);

      if (!response.results || response.results.length === 0) {
        return { data: [], error: null };
      }

      const ANIMALIA_TAXON_ID = 48460;
      const PLANTAE_TAXON_ID = 47126;
      const FUNGI_TAXON_ID = 47125;

      const isAnimaliaDescendant = (taxon: INaturalistTaxon): boolean => {
        // Check if this is Animalia itself
        if (taxon.id === ANIMALIA_TAXON_ID) return true;

        // Explicitly exclude Plantae and Fungi by ID
        if (taxon.id === PLANTAE_TAXON_ID || taxon.id === FUNGI_TAXON_ID) {
          return false;
        }

        // Check iconic_taxon_name if available
        if (taxon.iconic_taxon_name) {
          // Explicitly exclude Plantae and Fungi
          if (taxon.iconic_taxon_name === "Plantae" || taxon.iconic_taxon_name === "Fungi") {
            return false;
          }
          // If it's Animalia, include it
          if (taxon.iconic_taxon_name === "Animalia") {
            return true;
          }
          // For other iconic taxa (Mammalia, Aves, etc.), check ancestry to verify
          // they're descendants of Animalia
        }

        // Check ancestor_ids array (most reliable)
        const ancestorIds = taxon.ancestor_ids || [];

        // Exclude if Plantae or Fungi are in ancestor_ids
        if (ancestorIds.includes(PLANTAE_TAXON_ID) || ancestorIds.includes(FUNGI_TAXON_ID)) {
          return false;
        }

        // Include if Animalia is in ancestor_ids
        if (ancestorIds.includes(ANIMALIA_TAXON_ID)) {
          return true;
        }

        // Check ancestry string as fallback
        if (typeof taxon.ancestry === "string") {
          const ancestryIds = taxon.ancestry
            .split("/")
            .map(p => Number.parseInt(p.trim(), 10))
            .filter(n => !Number.isNaN(n));

          // Exclude if Plantae or Fungi are in ancestry
          if (ancestryIds.includes(PLANTAE_TAXON_ID) || ancestryIds.includes(FUNGI_TAXON_ID)) {
            return false;
          }

          // Include if Animalia is in ancestry
          if (ancestryIds.includes(ANIMALIA_TAXON_ID)) {
            return true;
          }
        }

        // If no clear indication, default to false (be conservative)
        return false;
      };

      const allowedRanks = new Set(["species", "subspecies"]);
      const MIN_OBSERVATIONS = 1000; // Minimum number of observations to include

      // Helper function to process a single page of results
      const processResults = (results: Array<INaturalistSearchResult<INaturalistTaxon>>) => {
        const candidates: Array<{
          animal: Animal;
          score: number;
          idx: number;
        }> = [];

        for (let idx = 0; idx < results.length; idx++) {
          const item = results[idx];
          const taxon = item?.record;
          if (!taxon) continue;

          // Be defensive: only keep taxa results
          const itemType = (item.type || "").toLowerCase();
          if (itemType && itemType !== "taxon" && itemType !== "taxa") continue;

          if (!taxon.rank || !allowedRanks.has(taxon.rank)) continue;

          if (!isAnimaliaDescendant(taxon)) continue;

          // Filter out animals with no or too few observations
          const observationsCount = taxon.observations_count ?? 0;
          if (observationsCount === 0 || observationsCount < MIN_OBSERVATIONS) {
            continue;
          }

          const mappedAnimal = this.mapToAnimalLightweight(taxon);
          const validation = validateAnimalData(mappedAnimal);
          if (!validation.valid || !validation.data) continue;

          candidates.push({
            animal: validation.data,
            score: typeof item.score === "number" ? item.score : 0,
            idx,
          });
        }

        return candidates;
      };

      // Process first page
      let allCandidates = processResults(response.results);

      // If we have fewer than 5 results, fetch next page
      if (allCandidates.length < 5 && response.results.length === limit * 3) {
        try {
          const nextPageUrl = `${INATURALIST_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}&sources=taxa&per_page=${limit * 3}&page=2`;
          const nextPageResponse = await this.makeRequest<INaturalistSearchResponse>(nextPageUrl);

          if (nextPageResponse.results && nextPageResponse.results.length > 0) {
            const nextPageCandidates = processResults(nextPageResponse.results);
            allCandidates = [...allCandidates, ...nextPageCandidates];
          }
        } catch (error) {
          // If fetching next page fails, continue with what we have
          this.logError("Animal Search Pagination Error", {
            query: trimmedQuery,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Sort by iNaturalist's relevance score (higher is better)
      allCandidates.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.idx - b.idx; // stable fallback
      });

      return { data: allCandidates.slice(0, limit).map(c => c.animal), error: null };
    } catch (error) {
      // For search, return empty array on error rather than error response
      // This allows the UI to continue working even if API fails
      this.logError("Animal Search Error", {
        query: trimmedQuery,
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: [], error: null };
    }
  }

  /**
   * Fetch clade data by name
   * Implements hybrid caching: checks IndexedDB cache first, then fetches from API
   * @param name - Name of the clade to fetch
   * @returns Promise resolving to ApiResponse with Clade data or error
   */
  async fetchCladeData(name: string): Promise<ApiResponse<Clade>> {
    const cacheKey = CacheKeys.clade(name);

    // 1. Check cache first (instant load if available)
    const cached = await cacheService.get<Clade>("clades", cacheKey);
    if (cached) {
      return { data: cached, error: null };
    }

    // 2. Cache miss - first search for the clade by name to get the ID
    const searchUrl = `${INATURALIST_BASE_URL}/taxa?q=${encodeURIComponent(name)}`;

    try {
      const searchResponse = await this.makeRequest<INaturalistResponse>(searchUrl);

      if (!searchResponse.results || searchResponse.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("CLADE_NOT_FOUND"),
          "CLADE_NOT_FOUND",
        );
      }

      // 3. Get the taxon ID from search results and fetch full taxon details
      // This ensures we get wikipedia_summary and other complete data
      const taxonId = searchResponse.results[0]!.id;
      const detailUrl = `${INATURALIST_BASE_URL}/taxa/${taxonId}`;
      const detailResponse = await this.makeRequest<INaturalistResponse>(detailUrl);

      if (!detailResponse.results || detailResponse.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("CLADE_NOT_FOUND"),
          "CLADE_NOT_FOUND",
        );
      }

      const taxon = detailResponse.results[0]!;
      const mappedClade = this.mapToClade(taxon);

      // Validate mapped clade data with comprehensive validation
      const validation = validateCladeData(mappedClade);

      if (!validation.valid) {
        // Log detailed validation errors for developers
        this.logError("Clade Data Validation Failed", {
          cladeName: name,
          errors: validation.errors,
          rawData: taxon,
        });

        // Return user-friendly error message
        return this.createErrorResponse(
          getUserFriendlyError("VALIDATION_ERROR"),
          "VALIDATION_ERROR",
          { validationErrors: validation.errors },
        );
      }

      // 3. Cache the validated result (only cache valid data)
      await cacheService.set(
        "clades",
        cacheKey,
        validation.data!,
        TTL_VALUES.CLADE,
      );

      return { data: validation.data, error: null };
    } catch (error) {
      return this.handleError(error, searchUrl);
    }
  }

  /**
   * Make HTTP request with rate limiting, retries, and timeout
   * @param url - URL to request
   * @returns Promise resolving to parsed JSON response
   */
  private async makeRequest<T>(url: string): Promise<T> {
    // Apply rate limiting
    await this.rateLimiter.throttle();

    // Retry with exponential backoff
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          signal: controller.signal,
          cache: "default", // Use browser's HTTP cache
          headers: {
            Accept: "application/json",
          },
        });

        clearTimeout(timeoutId);

        // Handle HTTP error responses
        if (!response.ok) {
          const shouldRetry = this.shouldRetry(response.status);

          if (!shouldRetry) {
            // Don't retry client errors (4xx)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Log and retry server errors (5xx) and rate limits (429)
          this.logError("API Error", {
            endpoint: url,
            status: response.status,
            attempt: attempt + 1,
          });

          if (attempt < MAX_RETRIES - 1) {
            // If we were rate-limited, prefer server-provided backoff (Retry-After) when present.
            if (response.status === 429) {
              const retryAfterMs = this.getRetryAfterMs(response);
              if (retryAfterMs !== null) {
                await this.wait(retryAfterMs);
              } else {
                await this.waitForBackoff(attempt);
              }
            } else {
              await this.waitForBackoff(attempt);
            }
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Parse JSON response
        const data = await response.json();
        return data as T;
      } catch (error: any) {
        lastError = error;

        // Handle AbortError (timeout)
        if (error.name === "AbortError") {
          this.logError("API Error", {
            endpoint: url,
            error: "Request timeout",
            attempt: attempt + 1,
          });

          if (attempt < MAX_RETRIES - 1) {
            await this.waitForBackoff(attempt);
            continue;
          }

          // Create custom error to distinguish timeout from network errors
          const timeoutError = new Error("Request timed out");
          timeoutError.name = "TimeoutError";
          throw timeoutError;
        }

        // Handle network errors
        if (error instanceof TypeError) {
          this.logError("API Error", {
            endpoint: url,
            error: error.message,
            attempt: attempt + 1,
          });

          if (attempt < MAX_RETRIES - 1) {
            await this.waitForBackoff(attempt);
            continue;
          }

          throw error;
        }

        // For HTTP errors that shouldn't retry, throw immediately
        if (error.message && error.message.startsWith("HTTP 4")) {
          throw error;
        }

        // Other errors - retry if not last attempt
        this.logError("API Error", {
          endpoint: url,
          error: error.message || String(error),
          attempt: attempt + 1,
        });

        if (attempt < MAX_RETRIES - 1) {
          await this.waitForBackoff(attempt);
          continue;
        }

        throw error;
      }
    }

    // Should not reach here, but TypeScript needs this
    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Determine if error should be retried
   * @param status - HTTP status code
   * @returns True if request should be retried, false otherwise
   */
  private shouldRetry(status: number): boolean {
    // Retry server errors (5xx) and rate limit (429)
    return status >= 500 || status === 429;
  }

  /**
   * Wait with exponential backoff
   * Delays: 1s, 2s, 4s
   * @param attempt - Current attempt number (0-indexed)
   * @returns Promise that resolves after delay
   */
  private async waitForBackoff(attempt: number): Promise<void> {
    const delay = 2 ** attempt * 1000; // 1s, 2s, 4s
    return this.wait(delay);
  }

  /**
   * Parse Retry-After header (seconds or HTTP date) into a millisecond delay.
   * @param response
   * @returns delay in ms, or null if header missing/invalid.
   */
  private getRetryAfterMs(response: Response): number | null {
    const raw = response.headers?.get?.("Retry-After");
    if (!raw) return null;

    // Retry-After can be either seconds or an HTTP date.
    const seconds = Number.parseInt(raw, 10);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const dateMs = Date.parse(raw);
    if (!Number.isNaN(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }

    return null;
  }

  private async wait(delayMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Map iNaturalist taxon to Animal (lightweight version for search)
   * Does NOT fetch taxonomy - use this for search results to keep it fast
   * @param taxon - iNaturalist taxon object
   * @returns Animal object with minimal data (empty taxonomy array)
   */
  private mapToAnimalLightweight(taxon: INaturalistTaxon): Animal {
    // API 'name' field is the scientific name
    const scientificName = taxon.name;
    // API 'preferred_common_name' is the common name, fallback to scientific name if not available
    const name = taxon.preferred_common_name || taxon.name;

    return {
      id: String(taxon.id),
      name,
      scientificName,
      taxonomy: [], // Empty taxonomy - will be fetched when animal is selected
      url: `https://www.inaturalist.org/taxa/${taxon.id}`,
      wikipediaUrl: taxon.wikipedia_url,
      imageUrl: taxon.default_photo?.medium_url,
      description: taxon.wikipedia_summary,
    };
  }

  /**
   * Map iNaturalist taxon to Animal (full version with taxonomy)
   * Fetches complete taxonomy - use this when animal is selected
   * @param taxon - iNaturalist taxon object
   * @returns Promise resolving to Animal object with mapped fields including taxonomy
   */
  private async mapToAnimal(taxon: INaturalistTaxon): Promise<Animal> {
    // API 'name' field is the scientific name
    const scientificName = taxon.name;
    // API 'preferred_common_name' is the common name, fallback to scientific name if not available
    const name = taxon.preferred_common_name || taxon.name;
    const taxonomy = await this.parseTaxonomy(taxon);

    return {
      id: String(taxon.id),
      name,
      scientificName,
      taxonomy,
      url: `https://www.inaturalist.org/taxa/${taxon.id}`,
      wikipediaUrl: taxon.wikipedia_url,
      imageUrl: taxon.default_photo?.medium_url,
      description: taxon.wikipedia_summary,
    };
  }

  /**
   * Map iNaturalist taxon to Clade
   * @param taxon - iNaturalist taxon object
   * @returns Clade object with mapped fields
   */
  private mapToClade(taxon: INaturalistTaxon): Clade {
    return {
      name: taxon.name,
      rank: taxon.rank,
      url: `https://www.inaturalist.org/taxa/${taxon.id}`,
      wikipediaUrl: taxon.wikipedia_url,
      imageUrl: taxon.default_photo?.medium_url,
      description: taxon.wikipedia_summary,
    };
  }

  /**
   * Parse ancestry to taxonomy array
   * Fetches ancestor taxa to build complete taxonomy
   * @param taxon - iNaturalist taxon object with ancestry or ancestor_ids
   * @returns Promise resolving to array of taxonomy names from kingdom to the taxon
   */
  private async parseTaxonomy(taxon: INaturalistTaxon): Promise<string[]> {
    // If ancestors array is already available (from include_ancestors=true), use it
    if (taxon.ancestors && Array.isArray(taxon.ancestors) && taxon.ancestors.length > 0) {
      return this.buildTaxonomyFromAncestors(taxon.ancestors, taxon);
    }

    // Otherwise, fetch ancestors using ancestor_ids or ancestry string
    const ancestorIds = this.extractAncestorIds(taxon);
    if (ancestorIds.length === 0) {
      return [];
    }

    // Fetch all ancestor taxa in a single batch API call
    const ancestors = await this.fetchAncestorTaxa(ancestorIds);
    return this.buildTaxonomyFromAncestors(ancestors, taxon);
  }

  /**
   * Extract ancestor IDs from taxon
   * @param taxon - iNaturalist taxon object
   * @returns Array of ancestor IDs
   */
  private extractAncestorIds(taxon: INaturalistTaxon): number[] {
    // Prefer ancestor_ids array if available
    if (taxon.ancestor_ids && Array.isArray(taxon.ancestor_ids)) {
      return taxon.ancestor_ids;
    }

    // Fallback to parsing ancestry string
    if (taxon.ancestry && typeof taxon.ancestry === "string") {
      return taxon.ancestry
        .split("/")
        .map(id => Number.parseInt(id.trim(), 10))
        .filter(id => !Number.isNaN(id));
    }

    return [];
  }

  /**
   * Fetch ancestor taxa by their IDs
   * Uses batch API call to fetch multiple taxa at once
   * @param ancestorIds - Array of ancestor taxon IDs
   * @returns Promise resolving to array of ancestor taxon objects
   */
  private async fetchAncestorTaxa(ancestorIds: number[]): Promise<INaturalistTaxon[]> {
    if (ancestorIds.length === 0) {
      return [];
    }

    try {
      // iNaturalist API supports fetching multiple taxa by ID using comma-separated IDs
      const idsParam = ancestorIds.join(",");
      const url = `${INATURALIST_BASE_URL}/taxa/${idsParam}`;

      const response = await this.makeRequest<INaturalistResponse>(url);

      if (!response.results || response.results.length === 0) {
        return [];
      }

      // Return results in the order they were requested (important for taxonomy order)
      const taxaMap = new Map(response.results.map(t => [t.id, t]));
      return ancestorIds
        .map(id => taxaMap.get(id))
        .filter((t): t is INaturalistTaxon => t !== undefined);
    } catch (error) {
      // If fetching ancestors fails, log but don't throw (graceful degradation)
      this.logError("Failed to fetch ancestor taxa", {
        ancestorIds,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Build taxonomy array from ancestor taxa
   * Filters to standard taxonomic ranks and orders them correctly
   * @param ancestors - Array of ancestor taxon objects
   * @param taxon - Current taxon object
   * @returns Array of taxonomy names
   */
  private buildTaxonomyFromAncestors(
    ancestors: INaturalistTaxon[],
    taxon: INaturalistTaxon,
  ): string[] {
    const standardRanks = ["kingdom", "phylum", "class", "order", "family", "genus", "species"];
    const taxonomy: string[] = [];

    // Add ancestors in order (they should already be ordered from root to parent)
    for (const ancestor of ancestors) {
      if (ancestor.rank && standardRanks.includes(ancestor.rank)) {
        taxonomy.push(ancestor.name);
      }
    }

    // Add the current taxon if it's a standard rank (for species-level taxa)
    if (taxon.rank && standardRanks.includes(taxon.rank)) {
      taxonomy.push(taxon.name);
    }

    return taxonomy;
  }

  /**
   * Handle errors and create error response
   * @param error - Error object
   * @param endpoint - API endpoint that failed
   * @returns ApiResponse with error information
   */
  private handleError(error: any, endpoint: string): ApiResponse<never> {
    this.logError("API Error", {
      endpoint,
      error: error.message || String(error),
    });

    // Determine error type and use user-friendly messages
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return this.createErrorResponse(
        getUserFriendlyError("TIMEOUT"),
        "TIMEOUT",
        { originalError: error.message },
      );
    }

    if (error.message && error.message.includes("404")) {
      // Determine context from endpoint to return specific error code
      const isAnimalEndpoint = endpoint.includes("/taxa/") && !endpoint.includes("?q=");
      const errorCode = isAnimalEndpoint ? "ANIMAL_NOT_FOUND" : "NOT_FOUND";
      return this.createErrorResponse(
        getUserFriendlyError(errorCode),
        errorCode,
        { originalError: error.message },
      );
    }

    if (error.message && error.message.includes("Network error")) {
      return this.createErrorResponse(
        getUserFriendlyError("NETWORK_ERROR"),
        "NETWORK_ERROR",
        { originalError: error.message },
      );
    }

    if (error instanceof TypeError) {
      // Check if offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return this.createErrorResponse(
          getUserFriendlyError("OFFLINE"),
          "OFFLINE",
          { originalError: error.message },
        );
      }
      return this.createErrorResponse(
        getUserFriendlyError("NETWORK_ERROR"),
        "NETWORK_ERROR",
        { originalError: error.message },
      );
    }

    if (error.message && error.message.includes("Invalid JSON")) {
      return this.createErrorResponse(
        getUserFriendlyError("PARSE_ERROR"),
        "PARSE_ERROR",
        { originalError: error.message },
      );
    }

    // Extract HTTP status code if available
    const httpStatusMatch = error.message?.match(/HTTP (\d+)/);
    if (httpStatusMatch) {
      const status = Number.parseInt(httpStatusMatch[1], 10);
      const errorCode = mapHttpStatusToErrorCode(status);
      return this.createErrorResponse(
        getUserFriendlyError(errorCode),
        errorCode,
        { originalError: error.message, httpStatus: status },
      );
    }

    // Generic error
    return this.createErrorResponse(
      getUserFriendlyError("UNKNOWN_ERROR"),
      "UNKNOWN_ERROR",
      { originalError: error.message || String(error) },
    );
  }

  /**
   * Create standardized error response
   * @param message - User-friendly error message
   * @param code - Error code for programmatic handling
   * @param details - Optional additional error details
   * @returns ApiResponse with error information
   */
  private createErrorResponse(
    message: string,
    code: string,
    details?: any,
  ): ApiResponse<never> {
    const error: ApiError = { message, code, details };

    // Log error
    this.logError("API Client Error", { code, message, details });

    return { data: null, error };
  }

  /**
   * Log errors for monitoring
   * Using console.error for MVP (structured logging post-MVP)
   * @param title - Log title/category
   * @param context - Additional context information
   */
  private logError(title: string, context: Record<string, any>): void {
    console.error(title, {
      timestamp: new Date().toISOString(),
      ...context,
    });
  }
}

/**
 * Create API Client Factory Function
 * Allows for dependency injection and testing
 * @returns New BiologicalAPIClient instance
 */
export function createApiClient(): BiologicalAPIClient {
  return new INaturalistAPIClient();
}

/**
 * Default export - singleton instance
 */
export const apiClient = createApiClient();
