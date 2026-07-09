/**
 * Animal Validator Tests
 *
 * Tests for animal validation utilities.
 * Tests cover:
 * - Valid animal validation
 * - Invalid animal validation (not in database)
 * - Duplicate detection
 * - Empty/whitespace input handling
 * - Case-insensitive duplicate detection
 * - Error message generation
 * - Edge cases
 */

import { describe, expect, it, vi } from "vitest";
import type { Animal } from "~/types/animal";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";
import {
  validateAnimalGuess,
  validateAnimalGuessSync,

} from "~/utils/animalValidator";

/**
 * Mock API client for testing
 * @param fetchResult - The result of the fetchAnimalData call (Animal or null)
 * @param shouldThrow - Whether to throw an error
 * @returns A mock API client
 */
function createMockApiClient(
  fetchResult: Animal | null = null,
  shouldThrow = false,
): BiologicalAPIClient {
  return {
    fetchAnimalData: vi.fn(async (id: string) => {
      if (shouldThrow) {
        throw new Error("API Error");
      }
      if (fetchResult && fetchResult.id === id) {
        return {
          data: fetchResult,
          error: null,
        };
      }
      return {
        data: null,
        error: { code: "NOT_FOUND", message: "Not found" },
      };
    }),
    fetchTaxonGalleryPhotos: vi.fn(),
    fetchCladeData: vi.fn(),
    searchAnimals: vi.fn(),
  };
}

/**
 * Test animals
 */
const testAnimal1: Animal = {
  id: "1",
  name: "African Elephant",
  scientificName: "Loxodonta africana",
  lineage: [
    { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
    { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
    { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
  ],
};

const testAnimal2: Animal = {
  id: "2",
  name: "Tiger",
  scientificName: "Panthera tigris",
  lineage: [
    { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
    { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
    { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
  ],
};

const testAnimal3: Animal = {
  id: "3",
  name: "Lion",
  scientificName: "Panthera leo",
  lineage: [
    { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
    { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
    { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
  ],
};

describe("validateAnimalGuess", () => {
  describe("empty input validation", () => {
    it("should reject animal with empty name", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const emptyAnimal: Animal = { ...testAnimal1, name: "" };
      const result = await validateAnimalGuess(emptyAnimal, [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("empty");
      expect(result.error?.message).toContain("Please enter an animal name");
    });

    it("should reject animal with whitespace-only name", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const whitespaceAnimal: Animal = { ...testAnimal1, name: "   " };
      const result = await validateAnimalGuess(whitespaceAnimal, [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("empty");
      expect(result.error?.message).toContain("Please enter an animal name");
    });

    it("should accept animal with trimmed name", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const trimmedAnimal: Animal = { ...testAnimal1, name: "  African Elephant  " };
      const result = await validateAnimalGuess(trimmedAnimal, [], apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
    });
  });

  describe("animal existence validation", () => {
    it("should validate animal exists in database", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const result = await validateAnimalGuess(testAnimal1, [], apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
      expect(result.error).toBeUndefined();
    });

    it("should reject animal not found in database", async () => {
      const apiClient = createMockApiClient(null);
      const nonExistentAnimal: Animal = {
        id: "999",
        name: "NonExistent Animal",
        scientificName: "Non existens",
        lineage: [],
      };
      const result = await validateAnimalGuess(nonExistentAnimal, [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.error?.message).toContain("We couldn't find that animal");
      expect(result.animal).toBeUndefined();
    });

    it("should reject animal without ID", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const noIdAnimal: Animal = {
        ...testAnimal1,
        id: "",
      };
      const result = await validateAnimalGuess(noIdAnimal, [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.error?.message).toContain("We couldn't find that animal");
    });

    it("should return invalid when the API errors", async () => {
      const apiClient = createMockApiClient(null, true);
      const result = await validateAnimalGuess(testAnimal1, [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.error?.message).toContain("We couldn't find that animal");
    });

    it("should fetch full animal data by ID", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const result = await validateAnimalGuess(testAnimal1, [], apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
      expect(apiClient.fetchAnimalData).toHaveBeenCalledWith(testAnimal1.id);
    });
  });

  describe("duplicate detection", () => {
    it("should detect duplicate by ID", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess(testAnimal1, guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
      expect(result.error?.message).toContain("already guessed");
    });

    it("should detect duplicate even with different name casing", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const guessHistory = [testAnimal1];
      const differentCaseAnimal: Animal = {
        ...testAnimal1,
        name: "AFRICAN ELEPHANT",
      };
      const result = await validateAnimalGuess(differentCaseAnimal, guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
    });

    it("should allow different animals", async () => {
      const apiClient = createMockApiClient(testAnimal2);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess(testAnimal2, guessHistory, apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal2);
    });

    it("should handle multiple guesses in history", async () => {
      const apiClient = createMockApiClient(testAnimal3);
      const guessHistory = [testAnimal1, testAnimal2];
      const result = await validateAnimalGuess(testAnimal3, guessHistory, apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal3);
    });

    it("should detect duplicate in multiple guesses", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const guessHistory = [testAnimal2, testAnimal1, testAnimal3];
      const result = await validateAnimalGuess(testAnimal1, guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
    });
  });

  describe("complete validation flow", () => {
    it("should validate valid, non-duplicate animal", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const guessHistory: Animal[] = [];
      const result = await validateAnimalGuess(testAnimal1, guessHistory, apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid animal even if not duplicate", async () => {
      const apiClient = createMockApiClient(null);
      const guessHistory: Animal[] = [];
      const invalidAnimal: Animal = {
        id: "999",
        name: "Invalid Animal",
        scientificName: "Invalidus animalis",
        lineage: [],
      };
      const result = await validateAnimalGuess(invalidAnimal, guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.animal).toBeUndefined();
    });

    it("should reject duplicate even if valid animal", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess(testAnimal1, guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
      expect(result.animal).toBeUndefined();
    });
  });

  describe("error messages", () => {
    it("should return the empty-input copy for blank name", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const emptyAnimal: Animal = { ...testAnimal1, name: "" };
      const result = await validateAnimalGuess(emptyAnimal, [], apiClient);

      expect(result.error?.message).toBe("Please enter an animal name.");
      expect(result.error?.message).not.toContain("technical");
      expect(result.error?.message).not.toContain("error");
    });

    it("should return the not-found copy when the API has no taxon", async () => {
      const apiClient = createMockApiClient(null);
      const nonExistentAnimal: Animal = {
        id: "999",
        name: "NonExistent",
        scientificName: "Non existens",
        lineage: [],
      };
      const result = await validateAnimalGuess(nonExistentAnimal, [], apiClient);

      expect(result.error?.message).toContain("We couldn't find that animal");
      expect(result.error?.message).toContain("Try checking the spelling");
      expect(result.error?.message).not.toContain("API");
      expect(result.error?.message).not.toContain("database");
    });

    it("should return the duplicate copy when the animal was already guessed", async () => {
      const apiClient = createMockApiClient(testAnimal1);
      const result = await validateAnimalGuess(testAnimal1, [testAnimal1], apiClient);

      expect(result.error?.message).toContain("already guessed");
      expect(result.error?.message).toContain("Try a different one");
      expect(result.error?.message).not.toContain("duplicate");
    });
  });
});

describe("validateAnimalGuessSync", () => {
  describe("empty input validation", () => {
    it("should reject empty string", () => {
      const result = validateAnimalGuessSync("", []);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("empty");
      expect(result.error?.message).toContain("Please enter an animal name");
    });

    it("should reject whitespace-only string", () => {
      const result = validateAnimalGuessSync("   ", []);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("empty");
    });

    it("should accept trimmed input", () => {
      const result = validateAnimalGuessSync("  African Elephant  ", []);

      expect(result.valid).toBe(true);
      // Note: sync validation doesn't return animal, just checks basic validity
    });
  });

  describe("duplicate detection (sync)", () => {
    it("should detect duplicate by name (case-insensitive)", () => {
      const guessHistory = [testAnimal1];
      const result = validateAnimalGuessSync("African Elephant", guessHistory);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
      expect(result.error?.message).toContain("already guessed");
    });

    it("should detect duplicate by scientific name (case-insensitive)", () => {
      const guessHistory = [testAnimal1];
      const result = validateAnimalGuessSync("Loxodonta africana", guessHistory);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
    });

    it("should detect duplicate with different case", () => {
      const guessHistory = [testAnimal1];
      const result = validateAnimalGuessSync("AFRICAN ELEPHANT", guessHistory);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
    });

    it("should allow different animals", () => {
      const guessHistory = [testAnimal1];
      const result = validateAnimalGuessSync("Tiger", guessHistory);

      expect(result.valid).toBe(true);
    });

    it("should handle multiple guesses in history", () => {
      const guessHistory = [testAnimal1, testAnimal2];
      const result = validateAnimalGuessSync("Lion", guessHistory);

      expect(result.valid).toBe(true);
    });

    it("should detect duplicate in multiple guesses", () => {
      const guessHistory = [testAnimal2, testAnimal1, testAnimal3];
      const result = validateAnimalGuessSync("African Elephant", guessHistory);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
    });
  });

  describe("edge cases", () => {
    it("should handle empty guess history", () => {
      const result = validateAnimalGuessSync("African Elephant", []);

      expect(result.valid).toBe(true);
    });

    it("should handle very long animal names", () => {
      const longName = "A".repeat(1000);
      const result = validateAnimalGuessSync(longName, []);

      expect(result.valid).toBe(true);
    });

    it("should handle special characters in names", () => {
      const specialName = "Animal-Name (with) [special] chars";
      const result = validateAnimalGuessSync(specialName, []);

      expect(result.valid).toBe(true);
    });

    it("should handle unicode characters", () => {
      const unicodeName = "动物名称";
      const result = validateAnimalGuessSync(unicodeName, []);

      expect(result.valid).toBe(true);
    });
  });
});
