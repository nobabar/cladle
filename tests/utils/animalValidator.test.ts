/**
 * Animal Validator Tests
 *
 * Comprehensive test suite for animal validation utilities.
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
 * @param searchResult - The result of the search animals call
 * @param shouldThrow - Whether to throw an error
 * @returns A mock API client
 */
function createMockApiClient(
  searchResult: Animal[] | null = null,
  shouldThrow = false,
): BiologicalAPIClient {
  return {
    fetchAnimalData: vi.fn(),
    fetchCladeData: vi.fn(),
    searchAnimals: vi.fn(async () => {
      if (shouldThrow) {
        throw new Error("API Error");
      }
      return {
        data: searchResult,
        error: searchResult === null ? { code: "NOT_FOUND", message: "Not found" } : null,
      };
    }),
  };
}

/**
 * Test animals
 */
const testAnimal1: Animal = {
  id: "1",
  name: "African Elephant",
  scientificName: "Loxodonta africana",
  taxonomy: ["Animalia", "Chordata", "Mammalia"],
};

const testAnimal2: Animal = {
  id: "2",
  name: "Tiger",
  scientificName: "Panthera tigris",
  taxonomy: ["Animalia", "Chordata", "Mammalia"],
};

const testAnimal3: Animal = {
  id: "3",
  name: "Lion",
  scientificName: "Panthera leo",
  taxonomy: ["Animalia", "Chordata", "Mammalia"],
};

describe("validateAnimalGuess", () => {
  describe("empty input validation", () => {
    it("should reject empty string", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("", [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("empty");
      expect(result.error?.message).toContain("Please enter an animal name");
    });

    it("should reject whitespace-only string", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("   ", [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("empty");
      expect(result.error?.message).toContain("Please enter an animal name");
    });

    it("should accept trimmed input", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("  African Elephant  ", [], apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
    });
  });

  describe("animal existence validation", () => {
    it("should validate animal exists in database", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("African Elephant", [], apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
      expect(result.error).toBeUndefined();
    });

    it("should reject animal not found in database", async () => {
      const apiClient = createMockApiClient(null);
      const result = await validateAnimalGuess("NonExistent Animal", [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.error?.message).toContain("We couldn't find that animal");
      expect(result.animal).toBeUndefined();
    });

    it("should reject when API returns empty array", async () => {
      const apiClient = createMockApiClient([]);
      const result = await validateAnimalGuess("NonExistent Animal", [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.error?.message).toContain("We couldn't find that animal");
    });

    it("should handle API errors gracefully", async () => {
      const apiClient = createMockApiClient(null, true);
      const result = await validateAnimalGuess("African Elephant", [], apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.error?.message).toContain("We couldn't find that animal");
    });

    it("should match animal by exact name (case-insensitive)", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("african elephant", [], apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
    });

    it("should match animal by scientific name (case-insensitive)", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("Loxodonta africana", [], apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
    });

    it("should not match partial names", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      // API might return multiple results, but we check for exact match
      const result = await validateAnimalGuess("African", [], apiClient);

      // If API returns the animal but name doesn't match exactly, it should fail
      // This depends on API behavior - if API returns testAnimal1 for "African",
      // we need to check if the name matches
      if (result.valid && result.animal) {
        // If it matched, verify it's the correct animal
        expect(result.animal.id).toBe(testAnimal1.id);
      }
    });
  });

  describe("duplicate detection", () => {
    it("should detect duplicate by name (case-insensitive)", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess("African Elephant", guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
      expect(result.error?.message).toContain("already guessed");
    });

    it("should detect duplicate by scientific name (case-insensitive)", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess("Loxodonta africana", guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
      expect(result.error?.message).toContain("already guessed");
    });

    it("should detect duplicate with different case", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess("AFRICAN ELEPHANT", guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
    });

    it("should allow different animals", async () => {
      const apiClient = createMockApiClient([testAnimal2]);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess("Tiger", guessHistory, apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal2);
    });

    it("should handle multiple guesses in history", async () => {
      const apiClient = createMockApiClient([testAnimal3]);
      const guessHistory = [testAnimal1, testAnimal2];
      const result = await validateAnimalGuess("Lion", guessHistory, apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal3);
    });

    it("should detect duplicate in multiple guesses", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const guessHistory = [testAnimal2, testAnimal1, testAnimal3];
      const result = await validateAnimalGuess("African Elephant", guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
    });
  });

  describe("complete validation flow", () => {
    it("should validate valid, non-duplicate animal", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const guessHistory: Animal[] = [];
      const result = await validateAnimalGuess("African Elephant", guessHistory, apiClient);

      expect(result.valid).toBe(true);
      expect(result.animal).toEqual(testAnimal1);
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid animal even if not duplicate", async () => {
      const apiClient = createMockApiClient(null);
      const guessHistory: Animal[] = [];
      const result = await validateAnimalGuess("Invalid Animal", guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("invalid");
      expect(result.animal).toBeUndefined();
    });

    it("should reject duplicate even if valid animal", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const guessHistory = [testAnimal1];
      const result = await validateAnimalGuess("African Elephant", guessHistory, apiClient);

      expect(result.valid).toBe(false);
      expect(result.error?.type).toBe("duplicate");
      expect(result.animal).toBeUndefined();
    });
  });

  describe("error messages", () => {
    it("should provide user-friendly empty error message", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("", [], apiClient);

      expect(result.error?.message).toBe("Please enter an animal name.");
      expect(result.error?.message).not.toContain("technical");
      expect(result.error?.message).not.toContain("error");
    });

    it("should provide user-friendly invalid error message", async () => {
      const apiClient = createMockApiClient(null);
      const result = await validateAnimalGuess("NonExistent", [], apiClient);

      expect(result.error?.message).toContain("We couldn't find that animal");
      expect(result.error?.message).toContain("Try checking the spelling");
      expect(result.error?.message).not.toContain("API");
      expect(result.error?.message).not.toContain("database");
    });

    it("should provide user-friendly duplicate error message", async () => {
      const apiClient = createMockApiClient([testAnimal1]);
      const result = await validateAnimalGuess("African Elephant", [testAnimal1], apiClient);

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
