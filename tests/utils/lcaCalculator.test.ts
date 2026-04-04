import { describe, expect, it } from "vitest";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { Animal } from "~/types/animal";

describe("calculateLCA", () => {
  // Test fixtures
  const tiger: Animal = {
    id: "1",
    name: "Tiger",
    scientificName: "Panthera tigris",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
  };

  const wolf: Animal = {
    id: "2",
    name: "Wolf",
    scientificName: "Canis lupus",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Canidae", "Canis", "Canis lupus"],
  };

  const lion: Animal = {
    id: "3",
    name: "Lion",
    scientificName: "Panthera leo",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera leo"],
  };

  const eagle: Animal = {
    id: "4",
    name: "Bald Eagle",
    scientificName: "Haliaeetus leucocephalus",
    taxonomy: ["Animalia", "Chordata", "Aves", "Accipitriformes", "Accipitridae", "Haliaeetus", "Haliaeetus leucocephalus"],
  };

  const jellyfish: Animal = {
    id: "5",
    name: "Moon Jellyfish",
    scientificName: "Aurelia aurita",
    taxonomy: ["Animalia", "Cnidaria", "Scyphozoa", "Semaeostomeae", "Ulmaridae", "Aurelia", "Aurelia aurita"],
  };

  describe("basic LCA calculation", () => {
    it("should return the animal itself when comparing same animal", () => {
      const result = calculateLCA(tiger, tiger);

      expect(result.clade).toBe("Panthera tigris");
      expect(result.rank).toBe("species");
      expect(result.depth).toBe(6); // Last index in taxonomy array
      expect(result.path).toEqual(["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"]);
    });

    it("should calculate LCA for animals from different families, same order", () => {
      // Tiger (Felidae) vs Wolf (Canidae) → LCA should be Carnivora (order)
      const result = calculateLCA(tiger, wolf);

      expect(result.clade).toBe("Carnivora");
      expect(result.rank).toBe("order");
      expect(result.depth).toBe(3);
      expect(result.path).toEqual(["Animalia", "Chordata", "Mammalia", "Carnivora"]);
    });

    it("should calculate LCA for animals from same genus", () => {
      // Tiger (Panthera tigris) vs Lion (Panthera leo) → LCA should be Panthera (genus)
      const result = calculateLCA(tiger, lion);

      expect(result.clade).toBe("Panthera");
      expect(result.rank).toBe("genus");
      expect(result.depth).toBe(5);
      expect(result.path).toEqual(["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera"]);
    });

    it("should calculate LCA for animals from different classes", () => {
      // Tiger (Mammalia) vs Eagle (Aves) → LCA should be Chordata (phylum)
      const result = calculateLCA(tiger, eagle);

      expect(result.clade).toBe("Chordata");
      expect(result.rank).toBe("phylum");
      expect(result.depth).toBe(1);
      expect(result.path).toEqual(["Animalia", "Chordata"]);
    });

    it("should calculate LCA for African Elephant vs Tiger (both Mammalia)", () => {
      // African Elephant (Mammalia, Proboscidea) vs Tiger (Mammalia, Carnivora) → LCA should be Mammalia (class)
      const africanElephant: Animal = {
        id: "elephant-1",
        name: "African Elephant",
        scientificName: "Loxodonta africana",
        taxonomy: [
          "Animalia",
          "Chordata",
          "Mammalia",
          "Proboscidea",
          "Elephantidae",
          "Loxodonta",
          "Loxodonta africana",
        ],
      };

      const result = calculateLCA(africanElephant, tiger);

      expect(result.clade).toBe("Mammalia");
      expect(result.rank).toBe("class");
      expect(result.depth).toBe(2);
      expect(result.path).toEqual(["Animalia", "Chordata", "Mammalia"]);
    });

    it("should calculate LCA for animals from different phyla", () => {
      // Tiger (Chordata) vs Jellyfish (Cnidaria) → LCA should be Animalia (kingdom)
      const result = calculateLCA(tiger, jellyfish);

      expect(result.clade).toBe("Animalia");
      expect(result.rank).toBe("kingdom");
      expect(result.depth).toBe(0);
      expect(result.path).toEqual(["Animalia"]);
    });
  });

  describe("edge Cases", () => {
    it("should handle animals with no common ancestor", () => {
      const plant: Animal = {
        id: "6",
        name: "Oak Tree",
        scientificName: "Quercus robur",
        taxonomy: ["Plantae", "Tracheophyta", "Magnoliopsida"],
      };

      const result = calculateLCA(tiger, plant);

      // Should return a default LCA (Life or Eukaryota)
      expect(result.clade).toBe("Life");
      expect(result.rank).toBe("root");
      expect(result.depth).toBe(-1);
      expect(result.path).toEqual([]);
    });

    it("should handle empty taxonomy arrays", () => {
      const emptyAnimal: Animal = {
        id: "7",
        name: "Unknown",
        scientificName: "Unknown",
        taxonomy: [],
      };

      const result = calculateLCA(tiger, emptyAnimal);

      expect(result.clade).toBe("Life");
      expect(result.rank).toBe("root");
      expect(result.depth).toBe(-1);
      expect(result.path).toEqual([]);
    });

    it("should handle missing taxonomy data", () => {
      const noTaxonomyAnimal = {
        id: "8",
        name: "Mystery Animal",
        scientificName: "Unknown",
      } as Animal; // Casting to bypass TypeScript for testing

      const result = calculateLCA(tiger, noTaxonomyAnimal);

      expect(result.clade).toBe("Life");
      expect(result.rank).toBe("root");
      expect(result.depth).toBe(-1);
      expect(result.path).toEqual([]);
    });

    it("should handle different length taxonomies", () => {
      const shortTaxonomy: Animal = {
        id: "9",
        name: "Generic Mammal",
        scientificName: "Mammalia sp",
        taxonomy: ["Animalia", "Chordata", "Mammalia"],
      };

      const result = calculateLCA(tiger, shortTaxonomy);

      // Should find LCA at Mammalia (the last common element)
      expect(result.clade).toBe("Mammalia");
      expect(result.rank).toBe("class");
      expect(result.depth).toBe(2);
      expect(result.path).toEqual(["Animalia", "Chordata", "Mammalia"]);
    });

    it("should handle when one taxonomy is a complete subset of another", () => {
      // Parent taxonomy is shorter but identical prefix
      const parent: Animal = {
        id: "10",
        name: "Mammal",
        scientificName: "Mammalia",
        taxonomy: ["Animalia", "Chordata", "Mammalia"],
      };

      const child: Animal = {
        id: "11",
        name: "Cat",
        scientificName: "Felis catus",
        taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Felis", "Felis catus"],
      };

      const result = calculateLCA(parent, child);

      // LCA should be Mammalia (the complete shorter taxonomy)
      expect(result.clade).toBe("Mammalia");
      expect(result.rank).toBe("class");
      expect(result.depth).toBe(2);
      expect(result.path).toEqual(["Animalia", "Chordata", "Mammalia"]);
    });

    it("should handle identical taxonomies with different animals", () => {
      const tigerClone: Animal = {
        id: "13",
        name: "Another Tiger",
        scientificName: "Panthera tigris",
        taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
      };

      const result = calculateLCA(tiger, tigerClone);

      expect(result.clade).toBe("Panthera tigris");
      expect(result.rank).toBe("species");
      expect(result.depth).toBe(6);
    });
  });

  describe("performance Requirements", () => {
    it("should complete calculation in less than 100ms for typical taxonomy depth", () => {
      // Warmup iterations to account for JIT compilation (not measured)
      for (let i = 0; i < 100; i++) {
        calculateLCA(tiger, wolf);
      }

      // Actual measurement
      const startTime = performance.now();

      // Run calculation 1000 times to get average
      for (let i = 0; i < 1000; i++) {
        calculateLCA(tiger, wolf);
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / 1000;

      expect(averageTime).toBeLessThan(100);
    });

    it("should handle deep taxonomies efficiently", () => {
      const deepTaxonomy: Animal = {
        id: "12",
        name: "Deep Species",
        scientificName: "Deep species",
        taxonomy: Array.from({ length: 20 }, (_, i) => `Level${i}`),
      };

      // Warmup (not measured)
      for (let i = 0; i < 10; i++) {
        calculateLCA(tiger, deepTaxonomy);
      }

      // Actual measurement
      const startTime = performance.now();
      calculateLCA(tiger, deepTaxonomy);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe("consistency Requirements", () => {
    it("should produce consistent results for same inputs", () => {
      const result1 = calculateLCA(tiger, wolf);
      const result2 = calculateLCA(tiger, wolf);
      const result3 = calculateLCA(tiger, wolf);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(result1.clade).toBe("Carnivora");
      expect(result1.depth).toBe(3);
    });

    it("should be commutative (order doesn't matter)", () => {
      const result1 = calculateLCA(tiger, wolf);
      const result2 = calculateLCA(wolf, tiger);

      expect(result1).toEqual(result2);
    });

    it("should produce deterministic results across multiple runs", () => {
      const results = Array.from({ length: 100 }, () => calculateLCA(tiger, eagle));

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });
    });
  });
});
