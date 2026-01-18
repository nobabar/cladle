/**
 * Data Validation Tests
 *
 * Comprehensive test suite for data validation utilities.
 * Tests cover:
 * - Valid data validation
 * - Invalid data validation
 * - Missing required fields
 * - Invalid field types
 * - Edge cases and graceful degradation
 */

import { describe, expect, it, vi } from "vitest";
import {
  isValidTaxonomy,
  validateAnimalData,
  validateCladeData,
} from "~/utils/dataValidation";

describe("validateAnimalData", () => {
  it("should validate complete animal data", () => {
    const validData = {
      id: "123",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
      imageUrl: "https://example.com/tiger.jpg",
      description: "A large cat species",
      url: "https://example.com/tiger",
      wikipediaUrl: "https://en.wikipedia.org/wiki/Tiger",
    };

    const result = validateAnimalData(validData);

    expect(result.valid).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.data?.id).toBe("123");
    expect(result.data?.name).toBe("Tiger");
    expect(result.data?.scientificName).toBe("Panthera tigris");
    expect(result.data?.taxonomy).toEqual(["Animalia", "Chordata", "Mammalia"]);
    expect(result.data?.imageUrl).toBe("https://example.com/tiger.jpg");
    expect(result.data?.description).toBe("A large cat species");
  });

  it("should handle missing optional fields", () => {
    const minimalData = {
      id: "123",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    };

    const result = validateAnimalData(minimalData);

    expect(result.valid).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.imageUrl).toBeUndefined();
    expect(result.data?.description).toBeUndefined();
    expect(result.data?.url).toBeUndefined();
    expect(result.data?.wikipediaUrl).toBeUndefined();
  });

  it("should accept numeric ID and convert to string", () => {
    const dataWithNumericId = {
      id: 123,
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    };

    const result = validateAnimalData(dataWithNumericId);

    expect(result.valid).toBe(true);
    expect(result.data?.id).toBe("123");
  });

  it("should accept ID of 0", () => {
    const dataWithZeroId = {
      id: 0,
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    };

    const result = validateAnimalData(dataWithZeroId);

    expect(result.valid).toBe(true);
    expect(result.data?.id).toBe("0");
  });

  it("should use scientificName as name if name is missing", () => {
    const dataWithOnlyScientificName = {
      id: "123",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    };

    const result = validateAnimalData(dataWithOnlyScientificName);

    expect(result.valid).toBe(true);
    expect(result.data?.name).toBe("Panthera tigris");
    expect(result.data?.scientificName).toBe("Panthera tigris");
  });

  it("should use name as scientificName if scientificName is missing", () => {
    const dataWithOnlyName = {
      id: "123",
      name: "Tiger",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    };

    const result = validateAnimalData(dataWithOnlyName);

    expect(result.valid).toBe(true);
    expect(result.data?.name).toBe("Tiger");
    expect(result.data?.scientificName).toBe("Tiger");
  });

  it("should trim whitespace from string fields", () => {
    const dataWithWhitespace = {
      id: "  123  ",
      name: "  Tiger  ",
      scientificName: "  Panthera tigris  ",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
      description: "  A large cat  ",
    };

    const result = validateAnimalData(dataWithWhitespace);

    expect(result.valid).toBe(true);
    expect(result.data?.id).toBe("123");
    expect(result.data?.name).toBe("Tiger");
    expect(result.data?.scientificName).toBe("Panthera tigris");
    expect(result.data?.description).toBe("A large cat");
  });

  it("should filter out empty taxonomy terms", () => {
    const dataWithEmptyTaxonomyTerms = {
      id: "123",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "", "Mammalia", "   ", "Carnivora"],
    };

    const result = validateAnimalData(dataWithEmptyTaxonomyTerms);

    expect(result.valid).toBe(true);
    expect(result.data?.taxonomy).toEqual(["Animalia", "Mammalia", "Carnivora"]);
  });

  it("should fail validation for missing ID", () => {
    const invalidData = {
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    };

    const result = validateAnimalData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain("Missing animal ID");
  });

  it("should fail validation for missing name and scientificName", () => {
    const invalidData = {
      id: "123",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    };

    const result = validateAnimalData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Missing animal name (name or scientificName required)");
  });

  it("should fail validation for missing taxonomy", () => {
    const invalidData = {
      id: "123",
      name: "Tiger",
      scientificName: "Panthera tigris",
    };

    const result = validateAnimalData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Missing taxonomy");
  });

  it("should fail validation for invalid taxonomy format", () => {
    const invalidData = {
      id: "123",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: "not-an-array",
    };

    const result = validateAnimalData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Invalid taxonomy format");
  });

  it("should handle empty taxonomy array with fallback", () => {
    const dataWithEmptyTaxonomy = {
      id: "123",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: [],
    };

    const result = validateAnimalData(dataWithEmptyTaxonomy);

    // Empty taxonomy is allowed for graceful degradation, fallback to ["Animalia"]
    expect(result.valid).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.taxonomy).toEqual(["Animalia"]);
  });

  it("should fail validation for non-object data", () => {
    const invalidData = "not-an-object";

    const result = validateAnimalData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Data must be an object");
  });

  it("should fail validation for null data", () => {
    const result = validateAnimalData(null);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Data must be an object");
  });

  it("should not include empty string optional fields", () => {
    const dataWithEmptyStrings = {
      id: "123",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
      imageUrl: "",
      description: "   ",
      url: "",
    };

    const result = validateAnimalData(dataWithEmptyStrings);

    expect(result.valid).toBe(true);
    expect(result.data?.imageUrl).toBeUndefined();
    expect(result.data?.description).toBeUndefined();
    expect(result.data?.url).toBeUndefined();
  });
});

describe("validateCladeData", () => {
  it("should validate complete clade data", () => {
    const validData = {
      name: "Mammalia",
      rank: "class",
      description: "Mammals are warm-blooded vertebrates",
      imageUrl: "https://example.com/mammal.jpg",
      url: "https://example.com/mammalia",
      wikipediaUrl: "https://en.wikipedia.org/wiki/Mammal",
    };

    const result = validateCladeData(validData);

    expect(result.valid).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.data?.name).toBe("Mammalia");
    expect(result.data?.rank).toBe("class");
    expect(result.data?.description).toBe("Mammals are warm-blooded vertebrates");
  });

  it("should handle missing optional fields", () => {
    const minimalData = {
      name: "Mammalia",
      rank: "class",
    };

    const result = validateCladeData(minimalData);

    expect(result.valid).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data?.description).toBeUndefined();
    expect(result.data?.imageUrl).toBeUndefined();
  });

  it("should trim whitespace from string fields", () => {
    const dataWithWhitespace = {
      name: "  Mammalia  ",
      rank: "  class  ",
      description: "  Mammals  ",
    };

    const result = validateCladeData(dataWithWhitespace);

    expect(result.valid).toBe(true);
    expect(result.data?.name).toBe("Mammalia");
    expect(result.data?.rank).toBe("class");
    expect(result.data?.description).toBe("Mammals");
  });

  it("should accept standard taxonomic ranks", () => {
    const standardRanks = [
      "kingdom",
      "phylum",
      "class",
      "order",
      "family",
      "genus",
      "species",
    ];

    for (const rank of standardRanks) {
      const data = {
        name: "Test",
        rank,
      };

      const result = validateCladeData(data);
      expect(result.valid).toBe(true);
      expect(result.data?.rank).toBe(rank);
    }
  });

  it("should accept non-standard ranks with warning", () => {
    const data = {
      name: "Test",
      rank: "custom-rank",
    };

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = validateCladeData(data);

    expect(result.valid).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should fail validation for missing name", () => {
    const invalidData = {
      rank: "class",
    };

    const result = validateCladeData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Missing or invalid clade name");
  });

  it("should fail validation for missing rank", () => {
    const invalidData = {
      name: "Mammalia",
    };

    const result = validateCladeData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Missing or invalid clade rank");
  });

  it("should fail validation for empty name", () => {
    const invalidData = {
      name: "",
      rank: "class",
    };

    const result = validateCladeData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Missing or invalid clade name");
  });

  it("should fail validation for empty rank", () => {
    const invalidData = {
      name: "Mammalia",
      rank: "",
    };

    const result = validateCladeData(invalidData);

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Missing or invalid clade rank");
  });

  it("should fail validation for non-object data", () => {
    const result = validateCladeData("not-an-object");

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toContain("Data must be an object");
  });

  it("should not include empty string optional fields", () => {
    const dataWithEmptyStrings = {
      name: "Mammalia",
      rank: "class",
      description: "",
      imageUrl: "   ",
    };

    const result = validateCladeData(dataWithEmptyStrings);

    expect(result.valid).toBe(true);
    expect(result.data?.description).toBeUndefined();
    expect(result.data?.imageUrl).toBeUndefined();
  });
});

describe("isValidTaxonomy", () => {
  it("should validate correct taxonomy array", () => {
    expect(isValidTaxonomy(["Animalia", "Chordata", "Mammalia"])).toBe(true);
  });

  it("should reject empty array", () => {
    expect(isValidTaxonomy([])).toBe(false);
  });

  it("should reject non-array", () => {
    expect(isValidTaxonomy("not-an-array")).toBe(false);
    expect(isValidTaxonomy(123)).toBe(false);
    expect(isValidTaxonomy(null)).toBe(false);
    expect(isValidTaxonomy(undefined)).toBe(false);
    expect(isValidTaxonomy({})).toBe(false);
  });

  it("should reject array with empty strings", () => {
    expect(isValidTaxonomy(["Animalia", "", "Mammalia"])).toBe(false);
    expect(isValidTaxonomy(["Animalia", "   ", "Mammalia"])).toBe(false);
  });

  it("should reject array with non-strings", () => {
    expect(isValidTaxonomy(["Animalia", 123, "Mammalia"])).toBe(false);
    expect(isValidTaxonomy(["Animalia", null, "Mammalia"])).toBe(false);
    expect(isValidTaxonomy(["Animalia", {}, "Mammalia"])).toBe(false);
  });

  it("should accept single-element array", () => {
    expect(isValidTaxonomy(["Animalia"])).toBe(true);
  });

  it("should accept long taxonomy arrays", () => {
    const longTaxonomy = [
      "Animalia",
      "Chordata",
      "Mammalia",
      "Carnivora",
      "Felidae",
      "Panthera",
      "Panthera tigris",
    ];
    expect(isValidTaxonomy(longTaxonomy)).toBe(true);
  });
});
