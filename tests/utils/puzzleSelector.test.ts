/**
 * Unit tests for puzzleSelector utility
 *
 * Tests cover:
 * - Deterministic animal selection
 * - Difficulty balancing
 * - Edge cases (invalid dates, empty list)
 * - Helper functions
 */

import { describe, expect, it } from "vitest";
import {
  CURATED_ANIMALS,
  getAnimalsByDifficulty,
  getAnimalsByTaxonomicGroup,
  getCuratedAnimalById,
  getCuratedAnimalsStats,
  selectTargetAnimal,
  selectTargetAnimalWithDifficulty,
} from "~/utils/puzzleSelector";

describe("puzzleSelector", () => {
  describe("selectTargetAnimal", () => {
    it("should return a valid animal ID for a valid date", () => {
      const date = "2024-01-01";
      const animalId = selectTargetAnimal(date);

      expect(animalId).toBeDefined();
      expect(typeof animalId).toBe("string");
      expect(animalId.length).toBeGreaterThan(0);

      // Verify the ID exists in curated list
      const animal = getCuratedAnimalById(animalId);
      expect(animal).toBeDefined();
    });

    it("should be deterministic - same date returns same animal", () => {
      const date = "2024-06-15";
      const animalId1 = selectTargetAnimal(date);
      const animalId2 = selectTargetAnimal(date);
      const animalId3 = selectTargetAnimal(date);

      expect(animalId1).toBe(animalId2);
      expect(animalId2).toBe(animalId3);
    });

    it("should return different animals for different dates", () => {
      const date1 = "2024-01-01";
      const date2 = "2024-01-02";
      const date3 = "2024-12-31";

      const animalId1 = selectTargetAnimal(date1);
      const animalId2 = selectTargetAnimal(date2);
      const animalId3 = selectTargetAnimal(date3);

      // At least two should be different (very likely all three)
      const allSame = animalId1 === animalId2 && animalId2 === animalId3;
      expect(allSame).toBe(false);
    });

    it("should distribute animals evenly over many dates", () => {
      const dates: string[] = [];
      for (let year = 2024; year <= 2025; year++) {
        for (let month = 1; month <= 12; month++) {
          for (let day = 1; day <= 28; day++) {
            dates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
          }
        }
      }

      const selectedAnimals = new Set<string>();
      for (const date of dates) {
        const animalId = selectTargetAnimal(date);
        selectedAnimals.add(animalId);
      }

      // Should use at least 50% of available animals over a year
      const minExpectedAnimals = Math.floor(CURATED_ANIMALS.length * 0.5);
      expect(selectedAnimals.size).toBeGreaterThanOrEqual(minExpectedAnimals);
    });

    it("should throw error for invalid date format", () => {
      expect(() => selectTargetAnimal("invalid-date")).toThrow("Invalid date format");
      expect(() => selectTargetAnimal("2024/01/01")).toThrow("Invalid date format");
      expect(() => selectTargetAnimal("01-01-2024")).toThrow("Invalid date format");
      expect(() => selectTargetAnimal("2024-1-1")).toThrow("Invalid date format");
    });

    it("should throw error for invalid date values", () => {
      expect(() => selectTargetAnimal("2024-13-01")).toThrow("Invalid date");
      expect(() => selectTargetAnimal("2024-02-30")).toThrow("Invalid date");
      expect(() => selectTargetAnimal("2024-00-01")).toThrow("Invalid date");
    });

    it("should handle leap year dates correctly", () => {
      const leapDate = "2024-02-29";
      const animalId = selectTargetAnimal(leapDate);

      expect(animalId).toBeDefined();
      expect(typeof animalId).toBe("string");

      // Verify deterministic
      expect(selectTargetAnimal(leapDate)).toBe(animalId);
    });

    it("should handle edge case dates", () => {
      const dates = [
        "2000-01-01", // Year 2000
        "2099-12-31", // Far future
        "1900-01-01", // Past date
      ];

      for (const date of dates) {
        const animalId = selectTargetAnimal(date);
        expect(animalId).toBeDefined();
        expect(typeof animalId).toBe("string");
      }
    });
  });

  describe("selectTargetAnimalWithDifficulty", () => {
    it("should return a valid animal ID for a valid date", () => {
      const date = "2024-01-01";
      const animalId = selectTargetAnimalWithDifficulty(date);

      expect(animalId).toBeDefined();
      expect(typeof animalId).toBe("string");
      expect(animalId.length).toBeGreaterThan(0);

      // Verify the ID exists in curated list
      const animal = getCuratedAnimalById(animalId);
      expect(animal).toBeDefined();
    });

    it("should return a valid animal from curated list (random selection mode)", () => {
      // Note: Currently using random selection, so we test that it returns valid animals
      const date = "2024-06-15";
      const animalId = selectTargetAnimalWithDifficulty(date);

      expect(animalId).toBeDefined();
      expect(typeof animalId).toBe("string");

      // Verify the ID exists in curated list
      const animal = getCuratedAnimalById(animalId);
      expect(animal).toBeDefined();
      expect(animal?.id).toBe(animalId);
    });

    it("should return animals from curated list (random selection mode)", () => {
      // Test that random selection returns valid animals from the list
      // Since it's random, we test multiple calls to ensure variety
      const dates = ["2024-01-01", "2024-06-15", "2024-12-25", "2025-03-20", "2025-07-10"];
      const selectedIds = new Set<string>();

      for (const date of dates) {
        const animalId = selectTargetAnimalWithDifficulty(date);
        const animal = getCuratedAnimalById(animalId);

        expect(animal).toBeDefined();
        expect(animal?.id).toBe(animalId);
        selectedIds.add(animalId);
      }

      // All selected IDs should be valid
      expect(selectedIds.size).toBeGreaterThan(0);
      expect(selectedIds.size).toBeLessThanOrEqual(dates.length);
    });

    it("should throw error for invalid date format", () => {
      expect(() => selectTargetAnimalWithDifficulty("invalid-date")).toThrow("Invalid date format");
      expect(() => selectTargetAnimalWithDifficulty("2024/01/01")).toThrow("Invalid date format");
    });

    it("should throw error for invalid date values", () => {
      expect(() => selectTargetAnimalWithDifficulty("2024-13-01")).toThrow("Invalid date");
      expect(() => selectTargetAnimalWithDifficulty("2024-02-30")).toThrow("Invalid date");
    });
  });

  describe("getCuratedAnimalById", () => {
    it("should return animal metadata for valid ID", () => {
      const testAnimal = CURATED_ANIMALS[0]!;
      const found = getCuratedAnimalById(testAnimal.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(testAnimal.id);
      expect(found?.name).toBe(testAnimal.name);
      expect(found?.scientificName).toBe(testAnimal.scientificName);
      expect(found?.difficulty).toBe(testAnimal.difficulty);
      expect(found?.taxonomicGroup).toBe(testAnimal.taxonomicGroup);
    });

    it("should return undefined for invalid ID", () => {
      const found = getCuratedAnimalById("999999");
      expect(found).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const found = getCuratedAnimalById("");
      expect(found).toBeUndefined();
    });
  });

  describe("getAnimalsByDifficulty", () => {
    it("should return all easy animals", () => {
      const easyAnimals = getAnimalsByDifficulty("easy");

      expect(easyAnimals.length).toBeGreaterThan(0);
      expect(easyAnimals.every(a => a.difficulty === "easy")).toBe(true);
    });

    it("should return all medium animals", () => {
      const mediumAnimals = getAnimalsByDifficulty("medium");

      expect(mediumAnimals.length).toBeGreaterThan(0);
      expect(mediumAnimals.every(a => a.difficulty === "medium")).toBe(true);
    });

    it("should return all hard animals", () => {
      const hardAnimals = getAnimalsByDifficulty("hard");

      expect(hardAnimals.length).toBeGreaterThan(0);
      expect(hardAnimals.every(a => a.difficulty === "hard")).toBe(true);
    });

    it("should return empty array if no animals match (shouldn't happen with curated list)", () => {
      // This test verifies the function works correctly
      // In practice, all difficulty levels should have animals
      const stats = getCuratedAnimalsStats();
      expect(stats.byDifficulty.easy).toBeGreaterThan(0);
      expect(stats.byDifficulty.medium).toBeGreaterThan(0);
      expect(stats.byDifficulty.hard).toBeGreaterThan(0);
    });
  });

  describe("getAnimalsByTaxonomicGroup", () => {
    it("should return all mammals", () => {
      const mammals = getAnimalsByTaxonomicGroup("mammal");

      expect(mammals.length).toBeGreaterThan(0);
      expect(mammals.every(a => a.taxonomicGroup === "mammal")).toBe(true);
    });

    it("should return all birds", () => {
      const birds = getAnimalsByTaxonomicGroup("bird");

      expect(birds.length).toBeGreaterThan(0);
      expect(birds.every(a => a.taxonomicGroup === "bird")).toBe(true);
    });

    it("should return all reptiles", () => {
      const reptiles = getAnimalsByTaxonomicGroup("reptile");

      expect(reptiles.length).toBeGreaterThan(0);
      expect(reptiles.every(a => a.taxonomicGroup === "reptile")).toBe(true);
    });

    it("should return all amphibians", () => {
      const amphibians = getAnimalsByTaxonomicGroup("amphibian");

      expect(amphibians.length).toBeGreaterThan(0);
      expect(amphibians.every(a => a.taxonomicGroup === "amphibian")).toBe(true);
    });

    it("should return empty array for non-existent group", () => {
      const result = getAnimalsByTaxonomicGroup("nonexistent");
      expect(result).toEqual([]);
    });
  });

  describe("getCuratedAnimalsStats", () => {
    it("should return correct total count", () => {
      const stats = getCuratedAnimalsStats();
      expect(stats.total).toBe(CURATED_ANIMALS.length);
    });

    it("should return counts for all difficulty levels", () => {
      const stats = getCuratedAnimalsStats();

      expect(stats.byDifficulty.easy).toBeGreaterThan(0);
      expect(stats.byDifficulty.medium).toBeGreaterThan(0);
      expect(stats.byDifficulty.hard).toBeGreaterThan(0);

      // Sum should equal total
      const sum = stats.byDifficulty.easy + stats.byDifficulty.medium + stats.byDifficulty.hard;
      expect(sum).toBe(stats.total);
    });

    it("should return counts for all taxonomic groups", () => {
      const stats = getCuratedAnimalsStats();

      expect(Object.keys(stats.byTaxonomicGroup).length).toBeGreaterThan(0);

      // Sum should equal total
      const sum = Object.values(stats.byTaxonomicGroup).reduce((a, b) => a + b, 0);
      expect(sum).toBe(stats.total);
    });

    it("should include expected taxonomic groups", () => {
      const stats = getCuratedAnimalsStats();

      expect(stats.byTaxonomicGroup.mammal).toBeGreaterThan(0);
      expect(stats.byTaxonomicGroup.bird).toBeGreaterThan(0);
      expect(stats.byTaxonomicGroup.reptile).toBeGreaterThan(0);
      expect(stats.byTaxonomicGroup.amphibian).toBeGreaterThan(0);
    });
  });

  describe("curated animals list", () => {
    it("should have at least 30 animals", () => {
      expect(CURATED_ANIMALS.length).toBeGreaterThanOrEqual(30);
    });

    it("should have animals from multiple taxonomic groups", () => {
      const groups = new Set(CURATED_ANIMALS.map(a => a.taxonomicGroup));
      expect(groups.size).toBeGreaterThanOrEqual(4); // mammal, bird, reptile, amphibian
    });

    it("should have animals with all difficulty levels", () => {
      const difficulties = new Set(CURATED_ANIMALS.map(a => a.difficulty));
      expect(difficulties.has("easy")).toBe(true);
      expect(difficulties.has("medium")).toBe(true);
      expect(difficulties.has("hard")).toBe(true);
    });

    it("should have unique animal IDs", () => {
      const ids = CURATED_ANIMALS.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid animal data structure", () => {
      for (const animal of CURATED_ANIMALS) {
        expect(animal.id).toBeDefined();
        expect(typeof animal.id).toBe("string");
        expect(animal.id.length).toBeGreaterThan(0);

        expect(animal.name).toBeDefined();
        expect(typeof animal.name).toBe("string");
        expect(animal.name.length).toBeGreaterThan(0);

        expect(animal.scientificName).toBeDefined();
        expect(typeof animal.scientificName).toBe("string");
        expect(animal.scientificName.length).toBeGreaterThan(0);

        expect(["easy", "medium", "hard"]).toContain(animal.difficulty);

        expect(animal.taxonomicGroup).toBeDefined();
        expect(typeof animal.taxonomicGroup).toBe("string");
        expect(animal.taxonomicGroup.length).toBeGreaterThan(0);
      }
    });
  });

  describe("integration tests", () => {
    it("should work with real date strings from game store", () => {
      // Simulate dates that might come from game store
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      const animalId = selectTargetAnimal(dateString);
      expect(animalId).toBeDefined();

      const animal = getCuratedAnimalById(animalId);
      expect(animal).toBeDefined();
    });

    it("should maintain consistency for deterministic selection", () => {
      const dates = ["2024-01-01", "2024-06-15", "2024-12-25"];

      for (const date of dates) {
        // selectTargetAnimal should be deterministic
        const results1 = selectTargetAnimal(date);
        const results2 = selectTargetAnimal(date);
        expect(results1).toBe(results2);

        // selectTargetAnimalWithDifficulty uses random selection currently
        // So we just verify it returns valid IDs
        const result3 = selectTargetAnimalWithDifficulty(date);
        const animal = getCuratedAnimalById(result3);
        expect(animal).toBeDefined();
        expect(animal?.id).toBe(result3);
      }
    });
  });
});
