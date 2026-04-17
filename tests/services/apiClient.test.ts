/**
 * API Client Tests
 *
 * Tests for the biological database API client.
 * Tests cover:
 * - Successful API calls
 * - Rate limiting behavior
 * - Retry logic with exponential backoff
 * - Error handling for different HTTP status codes
 * - Response validation
 * - Error logging
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { createApiClient } from "~/services/apiClient";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";
import { cacheService } from "~/services/cacheService";

// Mock globalThis fetch
globalThis.fetch = vi.fn();

describe("api client", () => {
  let client: BiologicalAPIClient;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Initialize cache service BEFORE fake timers (IndexedDB doesn't work with fake timers)
    await cacheService.init();

    // Reset mocks before each test
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Create fresh client instance
    client = createApiClient();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    // Clean up cache after timers are restored
    try {
      await cacheService.clear("animals");
      await cacheService.clear("clades");
      await cacheService.clear("lca");
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("fetchAnimalData", () => {
    it("should fetch animal data successfully", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 42,
          name: "Tiger",
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "48460/1/2/355675/40151/41066/41067/947378",
          ancestor_ids: [48460, 1, 2, 355675, 40151, 41066, 41067, 947378],
          wikipedia_url: "https://en.wikipedia.org/wiki/Tiger",
          default_photo: {
            medium_url: "https://example.com/tiger.jpg",
          },
        }],
      };
      /* eslint-enable camelcase */

      // Mock ancestor taxa response (simplified - just return minimal data)
      const mockAncestorResponse = {
        results: [
          { id: 48460, name: "Animalia", rank: "kingdom" },
          { id: 1, name: "Chordata", rank: "phylum" },
          { id: 2, name: "Mammalia", rank: "class" },
          { id: 355675, name: "Carnivora", rank: "order" },
          { id: 40151, name: "Felidae", rank: "family" },
          { id: 41066, name: "Panthera", rank: "genus" },
          { id: 41067, name: "Panthera tigris", rank: "species" },
          { id: 947378, name: "Panthera tigris", rank: "species" },
        ],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("42");
      await vi.runAllTimersAsync(); // Process rate limiter queue
      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe("42");
      expect(result.data?.name).toBe("Tiger");
      expect(result.data?.scientificName).toBe("Tiger");
      expect(result.data?.imageUrl).toBe("https://example.com/tiger.jpg");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.inaturalist.org/v1/taxa/42?include_ancestors=true",
        expect.any(Object),
      );
    });

    it("should return error for 404 not found", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      // Act
      const promise = client.fetchAnimalData("99999");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("not found");
      expect(result.error?.code).toBe("ANIMAL_NOT_FOUND");

      // Should not retry 404 errors
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should validate response data structure", async () => {
      // Arrange - malformed response
      const mockResponse = {
        results: [{}], // Missing required fields
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const promise = client.fetchAnimalData("42");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("Data format issue");
      expect(result.error?.code).toBe("VALIDATION_ERROR");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle empty results", async () => {
      // Arrange
      const mockResponse = {
        results: [],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const promise = client.fetchAnimalData("99999");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("not found");
      expect(result.error?.code).toBe("ANIMAL_NOT_FOUND");
    });
  });

  describe("fetchCladeData", () => {
    it("should fetch clade data successfully", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockSearchResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
          rank: "class",
        }],
      };
      const mockDetailResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
          rank: "class",
          wikipedia_url: "https://en.wikipedia.org/wiki/Mammal",
          wikipedia_summary: "Mammals are a group of vertebrates...",
          default_photo: {
            medium_url: "https://example.com/mammal.jpg",
          },
        }],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSearchResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockDetailResponse,
        } as Response);

      // Act
      const promise = client.fetchCladeData("Mammalia");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.data?.name).toBe("Mammalia");
      expect(result.data?.rank).toBe("class");
      expect(result.data?.imageUrl).toBe("https://example.com/mammal.jpg");
      expect(result.data?.description).toBe("Mammals are a group of vertebrates...");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/taxa?q=Mammalia"),
        expect.any(Object),
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/taxa/40151"),
        expect.any(Object),
      );
    });

    it("should return error for clade not found", async () => {
      // Arrange
      const mockResponse = {
        results: [],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const promise = client.fetchCladeData("InvalidClade");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe("CLADE_NOT_FOUND");
    });
  });

  describe("searchAnimals", () => {
    it("should surface Panthera tigris for query 'Tiger' even when insects are present", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockSearchResponse = {
        results: [
          {
            type: "Taxon",
            score: 50,
            record: {
              id: 123,
              name: "Papilio glaucus",
              preferred_common_name: "Eastern Tiger Swallowtail",
              rank: "species",
              ancestry: "48460/47158/211194/47224",
              ancestor_ids: [48460, 47158, 211194, 47224],
            },
          },
          {
            type: "Taxon",
            score: 10,
            record: {
              id: 947378,
              name: "Panthera tigris",
              preferred_common_name: "Tiger",
              rank: "species",
              ancestry: "48460/1/2/355675/40151/41066/41067/947378",
              ancestor_ids: [48460, 1, 2, 355675, 40151, 41066, 41067, 947378],
              wikipedia_url: "https://en.wikipedia.org/wiki/Tiger",
              default_photo: { medium_url: "https://example.com/tiger.jpg" },
              observations_count: 5000,
            },
          },
        ],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSearchResponse,
      } as Response);

      // Act
      const promise = client.searchAnimals("Tiger", 10);
      await vi.runAllTimersAsync(); // Process rate limiter queue
      const result = await promise;

      // Assert
      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.data?.[0]?.name).toBe("Tiger");
      expect(result.data?.[0]?.scientificName).toBe("Panthera tigris");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.inaturalist.org/v1/search?q=Tiger"),
        expect.any(Object),
      );
    });

    it("should filter out non-animal taxa and non-species ranks", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockSearchResponse = {
        results: [
          {
            type: "Taxon",
            score: 100,
            record: {
              id: 999,
              name: "Tiger lily",
              preferred_common_name: "Tiger lily",
              rank: "species",
              ancestry: "47126/47125", // Plantae-ish, does NOT include Animalia (48460)
              ancestor_ids: [47126, 47125],
            },
          },
          {
            type: "Taxon",
            score: 80,
            record: {
              id: 41066,
              name: "Panthera",
              preferred_common_name: "Panthers",
              rank: "genus", // Should be excluded (not species/subspecies)
              ancestry: "48460/1/2/355675/40151/41066",
              ancestor_ids: [48460, 1, 2, 355675, 40151, 41066],
            },
          },
          {
            type: "Taxon",
            score: 10,
            record: {
              id: 947378,
              name: "Panthera tigris",
              preferred_common_name: "Tiger",
              rank: "species",
              ancestry: "48460/1/2/355675/40151/41066/41067/947378",
              ancestor_ids: [48460, 1, 2, 355675, 40151, 41066, 41067, 947378],
              observations_count: 5000,
            },
          },
        ],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSearchResponse,
      } as Response);

      // Act
      const promise = client.searchAnimals("Tiger", 10);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.error).toBeNull();
      expect(result.data?.map(a => a.scientificName)).toEqual(["Panthera tigris"]);
    });

    it("should filter out fungi and mushrooms using iconic_taxon_name and ancestry", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockSearchResponse = {
        results: [
          {
            type: "Taxon",
            score: 100,
            record: {
              id: 123456,
              name: "Amanita muscaria",
              preferred_common_name: "Fly agaric",
              rank: "species",
              iconic_taxon_name: "Fungi", // Should be excluded
              ancestry: "47125/123/456/789",
              ancestor_ids: [47125, 123, 456, 789],
            },
          },
          {
            type: "Taxon",
            score: 90,
            record: {
              id: 789012,
              name: "Portobello mushroom",
              preferred_common_name: "Portobello",
              rank: "species",
              // No iconic_taxon_name, but Fungi in ancestry
              ancestry: "47125/345/678/901",
              ancestor_ids: [47125, 345, 678, 901],
            },
          },
          {
            type: "Taxon",
            score: 80,
            record: {
              id: 345678,
              name: "Rosa canina",
              preferred_common_name: "Dog rose",
              rank: "species",
              iconic_taxon_name: "Plantae", // Should be excluded
              ancestry: "47126/111/222/333",
              ancestor_ids: [47126, 111, 222, 333],
            },
          },
          {
            type: "Taxon",
            score: 10,
            record: {
              id: 947378,
              name: "Panthera tigris",
              preferred_common_name: "Tiger",
              rank: "species",
              iconic_taxon_name: "Animalia", // Should be included
              ancestry: "48460/1/2/355675/40151/41066/41067/947378",
              ancestor_ids: [48460, 1, 2, 355675, 40151, 41066, 41067, 947378],
              observations_count: 5000,
            },
          },
        ],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSearchResponse,
      } as Response);

      // Act
      const promise = client.searchAnimals("mushroom", 10);
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.error).toBeNull();
      expect(result.data?.map(a => a.scientificName)).toEqual(["Panthera tigris"]);
      // Verify fungi and plants were filtered out
      expect(result.data?.find(a => a.scientificName === "Amanita muscaria")).toBeUndefined();
      expect(result.data?.find(a => a.scientificName === "Portobello mushroom")).toBeUndefined();
      expect(result.data?.find(a => a.scientificName === "Rosa canina")).toBeUndefined();
    });

    it("should not mark outage on a single search failure", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

      const promise = client.searchAnimals("lion", 10);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.data).toEqual([]);
      expect(result.error?.code).toBe("API_UNAVAILABLE");
      expect(result.error?.details?.provider).toBe("iNaturalist");
      expect(result.error?.details?.outageLikely).toBe(false);
    });

    it("should mark outage after repeated search failures", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const p1 = client.searchAnimals("lion", 10);
      await vi.runAllTimersAsync();
      const r1 = await p1;

      const p2 = client.searchAnimals("tiger", 10);
      await vi.runAllTimersAsync();
      const r2 = await p2;

      const p3 = client.searchAnimals("bear", 10);
      await vi.runAllTimersAsync();
      const r3 = await p3;

      expect(r1.error?.details?.outageLikely).toBe(false);
      expect(r2.error?.details?.outageLikely).toBe(false);
      expect(r3.error?.details?.outageLikely).toBe(true);
      expect(r3.error?.message).toContain("iNaturalist appears to be unavailable");
    });
  });

  describe("rate limiting", () => {
    it("should throttle rapid requests", async () => {
      // Arrange

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Test",
          preferred_common_name: "Test",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
        if (url.includes("?include_ancestors=true")) {
          return {
            ok: true,
            status: 200,
            json: async () => mockAnimalResponse,
          } as Response;
        }
        // Ancestor fetch
        return {
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response;
      });

      // Act - Make 3 rapid requests
      const promise1 = client.fetchAnimalData("1");
      const promise2 = client.fetchAnimalData("2");
      const promise3 = client.fetchAnimalData("3");

      // Run all timers to let rate limiter process all requests
      await vi.runAllTimersAsync();

      // Wait for all promises to resolve
      const results = await Promise.all([promise1, promise2, promise3]);

      // Assert - All requests should succeed
      expect(results[0]!.data).not.toBeNull();
      expect(results[1]!.data).not.toBeNull();
      expect(results[2]!.data).not.toBeNull();
      // Each animal fetch makes 2 calls: one for animal, one for ancestors
      expect(globalThis.fetch).toHaveBeenCalledTimes(6);
    });

    it("should handle 429 rate limit errors with retry", async () => {
      // Arrange - First call returns 429, second succeeds

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Test",
          preferred_common_name: "Test",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");

      // Advance through rate limiter and retry delay
      await vi.advanceTimersByTimeAsync(0); // Rate limiter initial
      await vi.advanceTimersByTimeAsync(1000); // First retry backoff
      await vi.advanceTimersByTimeAsync(1000); // Rate limiter for ancestor fetch

      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(3); // Initial + retry + ancestor fetch
    });

    it("should honor Retry-After header on 429 before retrying", async () => {
      // Arrange - First call returns 429 with Retry-After=2, then succeeds
      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Test",
          preferred_common_name: "Test",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      const retryAfterSeconds = 2;

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: {
            get: (name: string) => (name.toLowerCase() === "retry-after" ? String(retryAfterSeconds) : null),
          },
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");

      // Let the initial call proceed
      await vi.advanceTimersByTimeAsync(0);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Not yet retried (waiting for Retry-After)
      await vi.advanceTimersByTimeAsync((retryAfterSeconds * 1000) - 1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Retry kicks in after Retry-After delay
      await vi.advanceTimersByTimeAsync(1);
      // Then ancestor fetch is throttled by the rate limiter (~1s)
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("retry logic with exponential backoff", () => {
    it("should retry on network error with exponential backoff", async () => {
      // Arrange - Fail twice, succeed third time

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Test",
          preferred_common_name: "Test",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");

      // Advance through rate limiter and retries
      await vi.advanceTimersByTimeAsync(0); // Rate limiter initial
      await vi.advanceTimersByTimeAsync(1000); // First retry (2^0 * 1000)
      await vi.advanceTimersByTimeAsync(2000); // Second retry (2^1 * 1000)
      await vi.advanceTimersByTimeAsync(1000); // Rate limiter for ancestor fetch

      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(4); // 3 retries + 1 ancestor fetch
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should retry on 500 server error", async () => {
      // Arrange - Fail once, succeed second time

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Test",
          preferred_common_name: "Test",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");

      // Advance through rate limiter and retry
      await vi.advanceTimersByTimeAsync(0); // Rate limiter initial
      await vi.advanceTimersByTimeAsync(1000); // First retry backoff
      await vi.advanceTimersByTimeAsync(1000); // Rate limiter for ancestor fetch

      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(3); // Initial + retry + ancestor fetch
    });

    it("should fail after max retries (3 attempts)", async () => {
      // Arrange - All attempts fail
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      // Act
      const promise = client.fetchAnimalData("1");

      // Fast-forward through all retry delays
      // First retry: 1s, Second retry: 2s, Third retry: 4s
      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry
      await vi.advanceTimersByTimeAsync(4000); // Third retry

      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("Connection issue");
      expect(result.error?.code).toBe("NETWORK_ERROR");
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should NOT retry on 404 errors", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      // Act
      const promise = client.fetchAnimalData("99999");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it("should have correct exponential backoff timing", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      // Act
      const promise = client.fetchAnimalData("1");

      // Track when each retry happens
      const callTimes: number[] = [];

      // Initial call
      callTimes.push(Date.now());
      await vi.advanceTimersByTimeAsync(0);

      // First retry (after 1 second)
      await vi.advanceTimersByTimeAsync(1000);
      callTimes.push(Date.now());

      // Second retry (after 2 seconds)
      await vi.advanceTimersByTimeAsync(2000);
      callTimes.push(Date.now());

      await promise;

      // Assert - Verify exponential backoff: 1s, 2s
      expect(callTimes[1]! - callTimes[0]!).toBe(1000);
      expect(callTimes[2]! - callTimes[1]!).toBe(2000);
    });
  });

  describe("error handling", () => {
    it("should handle timeout errors", async () => {
      // Arrange - Simulate timeout with AbortError
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(abortError);

      // Act
      const promise = client.fetchAnimalData("1");
      // Fast-forward through retries: 1s + 2s + 4s
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe("TIMEOUT");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle JSON parse errors", async () => {
      // Arrange - JSON parsing fails after 3 retries
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Partial<Response> as Response);

      // Act
      const promise = client.fetchAnimalData("1");
      // Advance through retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("parse");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should include error context in logs", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error"),
      );

      // Act
      const promise = client.fetchAnimalData("test-id");
      await vi.advanceTimersByTimeAsync(10000); // Fast-forward
      await promise;

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("API Error"),
        expect.objectContaining({
          endpoint: expect.stringContaining("test-id"),
          error: expect.any(String),
        }),
      );
    });
  });

  describe("response validation", () => {
    it("should validate required animal fields", async () => {
      // Arrange - Missing scientificName
      const mockResponse = {
        results: [{
          id: 42,
          // Missing name/preferred_common_name
          rank: "species",
        }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const promise = client.fetchAnimalData("42");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should validate required clade fields", async () => {
      // Arrange - Missing rank in detail response
      const mockSearchResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
        }],
      };
      const mockDetailResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
          // Missing rank
        }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSearchResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockDetailResponse,
        } as Response);

      // Act
      const promise = client.fetchCladeData("Mammalia");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should accept missing optional fields", async () => {
      // Arrange - Only required fields
      const mockResponse = {
        results: [{
          id: 42,
          name: "Tiger",
          /* eslint-disable-next-line camelcase */
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "1",
          // No optional fields like wikipedia_url, default_photo
        }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const promise = client.fetchAnimalData("42");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(result.data?.imageUrl).toBeUndefined();
      expect(result.data?.wikipediaUrl).toBeUndefined();
    });
  });

  describe("wrapped response format", () => {
    it("should return success format { data, error: null }", async () => {
      // Arrange

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Test",
          preferred_common_name: "Test",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("error");
      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it("should return error format { data: null, error }", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      // Act
      const promise = client.fetchAnimalData("99999");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("error");
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error).toHaveProperty("message");
      expect(result.error).toHaveProperty("code");
    });
  });

  describe("caching integration", () => {
    // Use real timers for caching tests (IndexedDB doesn't work with fake timers)
    beforeEach(() => {
      vi.useRealTimers();
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it("fetchAnimalData() should return cached animal data if available before API call", async () => {
      // Arrange
      const cachedAnimal = {
        id: "42",
        name: "Tiger",
        scientificName: "Panthera tigris",
        taxonomy: [],
        url: "https://www.inaturalist.org/taxa/42",
      };

      // Pre-populate cache
      await cacheService.set("animals", "animal:42", cachedAnimal);

      // Act
      const result = await client.fetchAnimalData("42");

      // Assert - Should return cached data without calling API
      expect(result.data).toEqual(cachedAnimal);
      expect(result.error).toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled(); // No API call made
    });

    it("should return cached animal data on second request", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 42,
          name: "Tiger",
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "48460/1/2/355675/40151/41066/41067/947378",
          ancestor_ids: [48460, 1, 2, 355675, 40151, 41066, 41067, 947378],
        }],
      };
      const mockAncestorResponse = {
        results: [
          { id: 48460, name: "Animalia", rank: "kingdom" },
          { id: 1, name: "Chordata", rank: "phylum" },
          { id: 2, name: "Mammalia", rank: "class" },
          { id: 355675, name: "Carnivora", rank: "order" },
          { id: 40151, name: "Felidae", rank: "family" },
          { id: 41066, name: "Panthera", rank: "genus" },
          { id: 41067, name: "Panthera tigris", rank: "species" },
          { id: 947378, name: "Panthera tigris", rank: "species" },
        ],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act - First request (cache miss)
      const result1 = await client.fetchAnimalData("42");

      // Second request (cache hit)
      const result2 = await client.fetchAnimalData("42");

      // Assert
      expect(result1.data).toEqual(result2.data);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2); // Animal + ancestors (only on first request)
      expect(result2.data?.id).toBe("42");
      expect(result2.data?.name).toBe("Tiger");
    });

    it("should return cached clade data on second request", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockSearchResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
          rank: "class",
        }],
      };
      const mockDetailResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
          rank: "class",
          wikipedia_url: "https://en.wikipedia.org/wiki/Mammal",
          wikipedia_summary: "Mammals are a group of vertebrates...",
        }],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSearchResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockDetailResponse,
        } as Response);

      // Act - First request (cache miss)
      const result1 = await client.fetchCladeData("Mammalia");

      // Second request (cache hit)
      const result2 = await client.fetchCladeData("Mammalia");

      // Assert
      expect(result1.data).toEqual(result2.data);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2); // Search + detail (only on first request)
      expect(result2.data?.name).toBe("Mammalia");
    });

    it("should not cache error responses", async () => {
      // Arrange - API returns 404
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      // Act - Make two requests with error response
      const result1 = await client.fetchAnimalData("99999");
      const result2 = await client.fetchAnimalData("99999");

      // Assert - Both requests should hit API (errors not cached)
      expect(result1.error).not.toBeNull();
      expect(result2.error).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("should cache different animals separately", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockAnimalResponse1 = {
        results: [{
          id: 1,
          name: "Tiger",
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      const mockAnimalResponse2 = {
        results: [{
          id: 2,
          name: "Lion",
          preferred_common_name: "Lion",
          rank: "species",
          ancestry: "2",
          ancestor_ids: [2],
        }],
      };
      const mockAncestorResponse1 = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };
      const mockAncestorResponse2 = {
        results: [{ id: 2, name: "Animalia", rank: "kingdom" }],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse2,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse2,
        } as Response);

      // Act - Request two different animals
      const result1 = await client.fetchAnimalData("1");
      const result2 = await client.fetchAnimalData("2");

      // Fetch again (should use cache)
      const result1Cached = await client.fetchAnimalData("1");
      const result2Cached = await client.fetchAnimalData("2");

      // Assert
      expect(result1.data?.name).toBe("Tiger");
      expect(result2.data?.name).toBe("Lion");
      expect(result1Cached.data?.name).toBe("Tiger");
      expect(result2Cached.data?.name).toBe("Lion");
      expect(globalThis.fetch).toHaveBeenCalledTimes(4); // 2 animals × (animal + ancestors)
    });

    it("should provide instant cached response (performance)", async () => {
      // Arrange

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Tiger",
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act - First request (cache miss)
      await client.fetchAnimalData("1");

      // Second request (cache hit) - measure time
      const startTime = performance.now();
      const result2 = await client.fetchAnimalData("1");
      const endTime = performance.now();

      // Assert
      expect(result2.data).not.toBeNull();

      // Cached response should be nearly instant (< 10ms)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10);
    });

    it("should fetch from API if cache is cleared", async () => {
      // Arrange

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Tiger",
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
        if (url.includes("?include_ancestors=true")) {
          return {
            ok: true,
            status: 200,
            json: async () => mockAnimalResponse,
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response;
      });

      // Act - First request (cache miss)
      await client.fetchAnimalData("1");

      // Clear cache
      await cacheService.clear("animals");

      // Second request (should fetch from API again)
      await client.fetchAnimalData("1");

      // Assert
      expect(globalThis.fetch).toHaveBeenCalledTimes(4); // 2 × (animal + ancestors)
    });

    it("should work offline with cached data", async () => {
      // Arrange

      /* eslint-disable camelcase */
      const mockAnimalResponse = {
        results: [{
          id: 1,
          name: "Tiger",
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "1",
          ancestor_ids: [1],
        }],
      };
      /* eslint-enable camelcase */
      const mockAncestorResponse = {
        results: [{ id: 1, name: "Animalia", rank: "kingdom" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnimalResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAncestorResponse,
        } as Response);

      // Act - First request (cache miss, online)
      const result1 = await client.fetchAnimalData("1");

      // Simulate offline - no fetch calls should happen
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();

      // Second request (cache hit, simulating offline)
      const result2 = await client.fetchAnimalData("1");

      // Assert
      expect(result1.data).toEqual(result2.data);
      expect(globalThis.fetch).not.toHaveBeenCalled(); // No network request
      expect(result2.data?.name).toBe("Tiger");
    });
  });
});
