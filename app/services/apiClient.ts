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
// 100ms delay between requests to respect API usage policies and prevent rate limiting
const RATE_LIMIT_DELAY = 100;
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
  wikipedia_url?: string;
  default_photo?: {
    medium_url?: string;
  };
}

interface INaturalistResponse {
  results: INaturalistTaxon[];
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
    const url = `${INATURALIST_BASE_URL}/taxa/${id}`;

    try {
      const response = await this.makeRequest<INaturalistResponse>(url);

      if (!response.results || response.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("ANIMAL_NOT_FOUND"),
          "ANIMAL_NOT_FOUND",
        );
      }

      const taxon = response.results[0]!;
      const mappedAnimal = this.mapToAnimal(taxon);

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

    const normalizedQuery = trimmedQuery.toLowerCase();

    // Metazoa (animals) taxon ID is 1 in iNaturalist
    // Using taxon_id=1 filters for all descendants of Metazoa (animals only)
    // Using is_active=true filters for only active animals
    // Order by observations_count to get most popular animals first
    // Also filter by rank to get species/subspecies level results
    const url = `${INATURALIST_BASE_URL}/taxa?q=${encodeURIComponent(trimmedQuery)}&taxon_id=1&is_active=true&rank=species,subspecies&per_page=${limit}&order_by=observations_count&order=desc`;

    try {
      const response = await this.makeRequest<INaturalistResponse>(url);

      if (!response.results || response.results.length === 0) {
        return { data: [], error: null };
      }

      // Map and validate all results
      const animals: Animal[] = [];
      for (const taxon of response.results) {
        const mappedAnimal = this.mapToAnimal(taxon);
        const validation = validateAnimalData(mappedAnimal);

        if (validation.valid && validation.data) {
          animals.push(validation.data);
        }
      }

      // Sort results to prioritize common name matches, then scientific name matches
      // Common name matches come first, then scientific name matches
      const sortedAnimals = animals.sort((a, b) => {
        const aCommonMatch = a.name.toLowerCase().includes(normalizedQuery);
        const bCommonMatch = b.name.toLowerCase().includes(normalizedQuery);

        // Prioritize common name matches
        if (aCommonMatch && !bCommonMatch) return -1;
        if (!aCommonMatch && bCommonMatch) return 1;

        // If both match common name or both match scientific name, maintain API order (by popularity)
        // This preserves the observations_count ordering from the API
        return 0;
      });

      // Return limited results after sorting
      return { data: sortedAnimals.slice(0, limit), error: null };
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

    // 2. Cache miss - fetch from API
    const url = `${INATURALIST_BASE_URL}/taxa?q=${encodeURIComponent(name)}`;

    try {
      const response = await this.makeRequest<INaturalistResponse>(url);

      if (!response.results || response.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("CLADE_NOT_FOUND"),
          "CLADE_NOT_FOUND",
        );
      }

      const taxon = response.results[0]!;
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
      return this.handleError(error, url);
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
            await this.waitForBackoff(attempt);
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
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Map iNaturalist taxon to Animal
   * Maps iNaturalist API response to our Animal type:
   * - name: Uses preferred_common_name if available, otherwise falls back to scientific name
   * - scientificName: Always uses the 'name' field from API (which is the scientific name)
   * @param taxon - iNaturalist taxon object
   * @returns Animal object with mapped fields
   */
  private mapToAnimal(taxon: INaturalistTaxon): Animal {
    // API 'name' field is the scientific name
    const scientificName = taxon.name;
    // API 'preferred_common_name' is the common name, fallback to scientific name if not available
    const name = taxon.preferred_common_name || taxon.name;
    const taxonomy = this.parseTaxonomy(taxon.ancestry);

    return {
      id: String(taxon.id),
      name,
      scientificName,
      taxonomy,
      url: `https://www.inaturalist.org/taxa/${taxon.id}`,
      wikipediaUrl: taxon.wikipedia_url,
      imageUrl: taxon.default_photo?.medium_url,
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
    };
  }

  /**
   * Parse ancestry string to taxonomy array
   * @param ancestry - Ancestry string from iNaturalist API
   * @returns Array of taxonomy names (empty for MVP, implemented in Story 2.5)
   */
  private parseTaxonomy(ancestry?: string): string[] {
    if (!ancestry) {
      return [];
    }
    // Ancestry is a string like "48460/1/2/355675/40151"
    // For MVP, return empty array - full taxonomy resolution in Story 2.5
    return [];
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
