/**
 * Tests for useBiologicalAPI Composable
 *
 * Validates the abstract API client interface contract,
 * dependency injection, and type safety.
 */

import { describe, expect, it, vi } from "vitest";
import type { BiologicalAPIClient } from "~/app/composables/useBiologicalAPI";
import { useBiologicalAPI } from "~/app/composables/useBiologicalAPI";
import type { Animal } from "~/app/types/animal";
import type { ApiResponse } from "~/app/types/api";
import type { Clade } from "~/app/types/clade";

describe("useBiologicalAPI", () => {
  describe("interface contract", () => {
    it("should throw error when no implementation is provided (Story 2.3 not yet implemented)", () => {
      expect(() => useBiologicalAPI()).toThrow(
        /Default BiologicalAPI implementation not yet available/,
      );
    });

    it("should accept custom implementation via options", () => {
      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn(),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });

      expect(api).toBe(mockImplementation);
      expect(api.fetchAnimalData).toBeDefined();
      expect(api.fetchCladeData).toBeDefined();
    });
  });

  describe("fetchAnimalData method", () => {
    it("should return success response with animal data", async () => {
      const mockAnimal: Animal = {
        id: "12345",
        name: "African Elephant",
        scientificName: "Loxodonta africana",
        taxonomy: ["Animalia", "Chordata", "Mammalia", "Proboscidea", "Elephantidae", "Loxodonta", "Loxodonta africana"],
        url: "https://www.inaturalist.org/taxa/12345",
        wikipediaUrl: "https://en.wikipedia.org/wiki/African_elephant",
        imageUrl: "https://example.com/elephant.jpg",
        description: "A large mammal native to Africa",
      };

      const mockResponse: ApiResponse<Animal> = {
        data: mockAnimal,
        error: null,
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn().mockResolvedValue(mockResponse),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchAnimalData("12345");

      expect(result.data).toEqual(mockAnimal);
      expect(result.error).toBeNull();
      expect(mockImplementation.fetchAnimalData).toHaveBeenCalledWith("12345");
    });

    it("should return error response when animal not found", async () => {
      const mockErrorResponse: ApiResponse<Animal> = {
        data: null,
        error: {
          message: "Animal not found",
          code: "NOT_FOUND",
        },
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn().mockResolvedValue(mockErrorResponse),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchAnimalData("invalid-id");

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        message: "Animal not found",
        code: "NOT_FOUND",
      });
    });

    it("should return error response when API call fails", async () => {
      const mockErrorResponse: ApiResponse<Animal> = {
        data: null,
        error: {
          message: "Network error",
          code: "NETWORK_ERROR",
          details: { originalError: "Failed to fetch" },
        },
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn().mockResolvedValue(mockErrorResponse),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchAnimalData("12345");

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe("Network error");
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });
  });

  describe("fetchCladeData method", () => {
    it("should return success response with clade data", async () => {
      const mockClade: Clade = {
        name: "Mammalia",
        rank: "class",
        url: "https://www.inaturalist.org/taxa/40151",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Mammal",
        description: "Class of warm-blooded vertebrate animals",
        imageUrl: "https://example.com/mammalia.jpg",
      };

      const mockResponse: ApiResponse<Clade> = {
        data: mockClade,
        error: null,
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn(),
        fetchCladeData: vi.fn().mockResolvedValue(mockResponse),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchCladeData("Mammalia");

      expect(result.data).toEqual(mockClade);
      expect(result.error).toBeNull();
      expect(mockImplementation.fetchCladeData).toHaveBeenCalledWith("Mammalia");
    });

    it("should return error response when clade not found", async () => {
      const mockErrorResponse: ApiResponse<Clade> = {
        data: null,
        error: {
          message: "Clade not found",
          code: "NOT_FOUND",
        },
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn(),
        fetchCladeData: vi.fn().mockResolvedValue(mockErrorResponse),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchCladeData("InvalidClade");

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        message: "Clade not found",
        code: "NOT_FOUND",
      });
    });

    it("should return error response when API call fails", async () => {
      const mockErrorResponse: ApiResponse<Clade> = {
        data: null,
        error: {
          message: "API timeout",
          code: "TIMEOUT",
          details: { timeout: 5000 },
        },
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn(),
        fetchCladeData: vi.fn().mockResolvedValue(mockErrorResponse),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchCladeData("Mammalia");

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe("API timeout");
      expect(result.error?.code).toBe("TIMEOUT");
    });
  });

  describe("type safety", () => {
    it("should enforce BiologicalAPIClient interface contract", () => {
      // This test validates TypeScript compilation
      // If types are incorrect, this won't compile

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: async (id: string): Promise<ApiResponse<Animal>> => ({
          data: {
            id,
            name: "Test Animal",
            scientificName: "Testus animalus",
            taxonomy: ["Animalia", "Chordata"],
          },
          error: null,
        }),
        fetchCladeData: async (name: string): Promise<ApiResponse<Clade>> => ({
          data: {
            name,
            rank: "phylum",
          },
          error: null,
        }),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });

      // Type assertions to ensure correct return types
      expect(typeof api.fetchAnimalData).toBe("function");
      expect(typeof api.fetchCladeData).toBe("function");
    });

    it("should support optional fields in Animal interface", async () => {
      // Animal with only required fields
      const minimalAnimal: Animal = {
        id: "123",
        name: "Minimal Animal",
        scientificName: "Minimus animalus",
        taxonomy: ["Animalia"],
      };

      const mockResponse: ApiResponse<Animal> = {
        data: minimalAnimal,
        error: null,
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn().mockResolvedValue(mockResponse),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchAnimalData("123");

      expect(result.data).toEqual(minimalAnimal);
      expect(result.data?.url).toBeUndefined();
      expect(result.data?.wikipediaUrl).toBeUndefined();
      expect(result.data?.imageUrl).toBeUndefined();
      expect(result.data?.description).toBeUndefined();
    });

    it("should support optional fields in Clade interface", async () => {
      // Clade with only required fields
      const minimalClade: Clade = {
        name: "Chordata",
        rank: "phylum",
      };

      const mockResponse: ApiResponse<Clade> = {
        data: minimalClade,
        error: null,
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn(),
        fetchCladeData: vi.fn().mockResolvedValue(mockResponse),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchCladeData("Chordata");

      expect(result.data).toEqual(minimalClade);
      expect(result.data?.url).toBeUndefined();
      expect(result.data?.wikipediaUrl).toBeUndefined();
      expect(result.data?.description).toBeUndefined();
      expect(result.data?.imageUrl).toBeUndefined();
    });
  });

  describe("error handling patterns", () => {
    it("should follow standard error format with message", async () => {
      const mockErrorResponse: ApiResponse<Animal> = {
        data: null,
        error: {
          message: "Standard error message",
        },
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn().mockResolvedValue(mockErrorResponse),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchAnimalData("123");

      expect(result.error).toHaveProperty("message");
      expect(typeof result.error?.message).toBe("string");
    });

    it("should support optional error code", async () => {
      const mockErrorResponse: ApiResponse<Animal> = {
        data: null,
        error: {
          message: "Error with code",
          code: "ERROR_CODE",
        },
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn().mockResolvedValue(mockErrorResponse),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchAnimalData("123");

      expect(result.error?.code).toBe("ERROR_CODE");
    });

    it("should support optional error details", async () => {
      const errorDetails = {
        statusCode: 500,
        originalError: "Internal Server Error",
        timestamp: "2026-01-13T00:00:00Z",
      };

      const mockErrorResponse: ApiResponse<Animal> = {
        data: null,
        error: {
          message: "Server error",
          code: "INTERNAL_ERROR",
          details: errorDetails,
        },
      };

      const mockImplementation: BiologicalAPIClient = {
        fetchAnimalData: vi.fn().mockResolvedValue(mockErrorResponse),
        fetchCladeData: vi.fn(),
      };

      const api = useBiologicalAPI({ implementation: mockImplementation });
      const result = await api.fetchAnimalData("123");

      expect(result.error?.details).toEqual(errorDetails);
    });
  });
});
