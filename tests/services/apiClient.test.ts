/**
 * API Client Tests
 *
 * Comprehensive test suite for the biological database API client.
 * Tests cover:
 * - Successful API calls
 * - Rate limiting behavior
 * - Retry logic with exponential backoff
 * - Error handling for different HTTP status codes
 * - Response validation
 * - Error logging
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "~/services/apiClient";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";

// Mock globalThis fetch
globalThis.fetch = vi.fn();

describe("api client", () => {
  let client: BiologicalAPIClient;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Create fresh client instance
    client = createApiClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("fetchAnimalData", () => {
    it("should fetch animal data successfully", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockResponse = {
        results: [{
          id: 42,
          name: "Tiger",
          preferred_common_name: "Tiger",
          rank: "species",
          ancestry: "48460/1/2/355675/40151/41066/41067/947378",
          wikipedia_url: "https://en.wikipedia.org/wiki/Tiger",
          default_photo: {
            medium_url: "https://example.com/tiger.jpg",
          },
        }],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
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
        "https://api.inaturalist.org/v1/taxa/42",
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
      expect(result.error?.code).toBe("NOT_FOUND");

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
      expect(result.error?.message).toContain("Invalid response");
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
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("fetchCladeData", () => {
    it("should fetch clade data successfully", async () => {
      // Arrange
      /* eslint-disable camelcase */
      const mockResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
          rank: "class",
          wikipedia_url: "https://en.wikipedia.org/wiki/Mammal",
          default_photo: {
            medium_url: "https://example.com/mammal.jpg",
          },
        }],
      };
      /* eslint-enable camelcase */

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
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
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/taxa?q=Mammalia"),
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
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("rate limiting", () => {
    it("should throttle rapid requests", async () => {
      // Arrange
      const mockResponse = { results: [{ id: 1, name: "Test", rank: "species" }] };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act - Make 3 rapid requests
      const promises = [
        client.fetchAnimalData("1"),
        client.fetchAnimalData("2"),
        client.fetchAnimalData("3"),
      ];

      // First request should go through immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Second request after throttle delay (100ms)
      await vi.advanceTimersByTimeAsync(100);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);

      // Third request after another throttle delay
      await vi.advanceTimersByTimeAsync(100);
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);

      // Wait for all promises to resolve
      await Promise.all(promises);
    });

    it("should handle 429 rate limit errors with retry", async () => {
      // Arrange - First call returns 429, second succeeds
      const mockResponse = { results: [{ id: 1, name: "Test", rank: "species" }] };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");

      // Fast-forward through retry delay (1 second for first retry)
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("retry logic with exponential backoff", () => {
    it("should retry on network error with exponential backoff", async () => {
      // Arrange - Fail twice, succeed third time
      const mockResponse = { results: [{ id: 1, name: "Test", rank: "species" }] };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");

      // First retry after 1 second (2^0 * 1000)
      await vi.advanceTimersByTimeAsync(1000);

      // Second retry after 2 seconds (2^1 * 1000)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should retry on 500 server error", async () => {
      // Arrange - Fail once, succeed second time
      const mockResponse = { results: [{ id: 1, name: "Test", rank: "species" }] };

      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        } as Response);

      // Act
      const promise = client.fetchAnimalData("1");

      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      // Assert
      expect(result.data).not.toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
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
      expect(result.error?.message).toContain("Network request failed");
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
      expect(callTimes[1] - callTimes[0]).toBe(1000);
      expect(callTimes[2] - callTimes[1]).toBe(2000);
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
      } as Response);

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
      // Arrange - Missing rank
      const mockResponse = {
        results: [{
          id: 40151,
          name: "Mammalia",
          // Missing rank
        }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act
      const promise = client.fetchCladeData("Mammalia");
      await vi.runAllTimersAsync();
      const result = await promise;

      // Assert
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should handle optional fields gracefully", async () => {
      // Arrange - Only required fields
      const mockResponse = {
        results: [{
          id: 42,
          name: "Tiger",
          rank: "species",
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
      const mockResponse = {
        results: [{ id: 1, name: "Test", rank: "species" }],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
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
});
