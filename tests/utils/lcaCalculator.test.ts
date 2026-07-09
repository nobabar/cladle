import { describe, expect, it } from "vitest";
import {
  calculateLCA,
  isLCAMoreSpecificOnTarget,
  lcaDepthOnTarget,
} from "~/utils/lcaCalculator";
import {
  lion,
  tiger,
  TIGER_LINEAGE,
  tigerLineageThroughCarnivora,
  wolf,
} from "#test/helpers/animalFixtures";
import { lineageFromNames, lineageNames } from "~/utils/taxonLineage";

describe("calculateLCA", () => {
  const carnivoraDepth = TIGER_LINEAGE.findIndex(t => t.name === "Carnivora");
  const pantheraDepth = TIGER_LINEAGE.findIndex(t => t.name === "Panthera");
  const speciesDepth = TIGER_LINEAGE.length - 1;

  const eagle = {
    id: "4",
    name: "Bald Eagle",
    scientificName: "Haliaeetus leucocephalus",
    lineage: lineageFromNames(
      [
        "Animalia",
        "Chordata",
        "Aves",
        "Accipitriformes",
        "Accipitridae",
        "Haliaeetus",
        "Haliaeetus leucocephalus",
      ],
      { ids: ["1", "2", "aves", "accip", "accip-fam", "haliaeetus", "haliaeetus-leuco"] },
    ),
  };

  const jellyfish = {
    id: "5",
    name: "Moon Jellyfish",
    scientificName: "Aurelia aurita",
    lineage: lineageFromNames([
      "Animalia",
      "Cnidaria",
      "Scyphozoa",
      "Semaeostomeae",
      "Ulmaridae",
      "Aurelia",
      "Aurelia aurita",
    ]),
  };

  describe("basic LCA calculation", () => {
    it("should return the animal itself when comparing same animal", () => {
      const result = calculateLCA(tiger(), tiger());

      expect(result.clade).toBe("Panthera tigris");
      expect(result.rank).toBe("species");
      expect(result.depth).toBe(speciesDepth);
      expect(result.path).toEqual(lineageNames(TIGER_LINEAGE));
    });

    it("should calculate LCA for animals from different families, same order", () => {
      const result = calculateLCA(tiger(), wolf());

      expect(result.clade).toBe("Carnivora");
      expect(result.rank).toBe("order");
      expect(result.depth).toBe(carnivoraDepth);
      expect(result.path).toEqual(lineageNames(TIGER_LINEAGE.slice(0, carnivoraDepth + 1)));
    });

    it("should calculate LCA for animals from same genus", () => {
      const result = calculateLCA(tiger(), lion());

      expect(result.clade).toBe("Panthera");
      expect(result.rank).toBe("genus");
      expect(result.depth).toBe(pantheraDepth);
      expect(result.path).toEqual(lineageNames(TIGER_LINEAGE.slice(0, pantheraDepth + 1)));
    });

    it("should calculate LCA for animals from different classes", () => {
      const result = calculateLCA(tiger(), eagle);

      expect(result.clade).toBe("Chordata");
      expect(result.rank).toBe("phylum");
      expect(result.depth).toBe(1);
      expect(result.path).toEqual(["Animalia", "Chordata"]);
    });

    it("should calculate LCA for African Elephant vs Tiger (both Mammalia)", () => {
      const mammaliaDepth = TIGER_LINEAGE.findIndex(t => t.name === "Mammalia");
      const africanElephant = {
        id: "elephant-1",
        name: "African Elephant",
        scientificName: "Loxodonta africana",
        lineage: lineageFromNames(
          [
            "Animalia",
            "Chordata",
            "Mammalia",
            "Proboscidea",
            "Elephantidae",
            "Loxodonta",
            "Loxodonta africana",
          ],
          { ids: ["1", "2", "40151", "proboscidea", "elephantidae", "loxodonta", "loxodonta-af"] },
        ),
      };

      const result = calculateLCA(africanElephant, tiger());

      expect(result.clade).toBe("Mammalia");
      expect(result.rank).toBe("class");
      expect(result.depth).toBe(mammaliaDepth);
    });

    it("should return Life when lineages share no taxon ids", () => {
      const result = calculateLCA(tiger(), jellyfish);

      expect(result.clade).toBe("Life");
      expect(result.rank).toBe("root");
      expect(result.depth).toBe(-1);
      expect(result.path).toEqual([]);
    });
  });

  describe("misaligned lineage paths (identity-based LCA)", () => {
    it("finds Carnivora on target path when guess lacks Theria / Placentalia / Laurasiatheria", () => {
      const target = tiger();
      const guess = {
        ...tiger(),
        lineage: tigerLineageThroughCarnivora(),
      };

      const result = calculateLCA(guess, target);

      expect(result.clade).toBe("Carnivora");
      expect(result.depth).toBe(carnivoraDepth);
      expect(result.rank).toBe("order");
    });
  });

  describe("edge cases", () => {
    it("should handle empty lineage arrays", () => {
      const empty = {
        id: "empty",
        name: "Unknown",
        scientificName: "Unknown sp.",
        lineage: [],
      };

      const result = calculateLCA(empty, tiger());
      expect(result.clade).toBe("Life");
      expect(result.depth).toBe(-1);
    });

    it("should be symmetric in clade identity for standard fixtures", () => {
      const a = calculateLCA(tiger(), wolf());
      const b = calculateLCA(wolf(), tiger());
      expect(a.clade).toBe(b.clade);
      expect(a.depth).toBe(b.depth);
    });
  });

  describe("target-normalized LCA comparison", () => {
    it("maps an LCA from a reference animal onto the target lineage by taxon id", () => {
      const target = tiger();
      const shortenedWolf = {
        ...wolf(),
        lineage: [
          { id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 },
          { id: "2", name: "Chordata", rank: "phylum", rankLevel: 60 },
          { id: "40151", name: "Mammalia", rank: "class", rankLevel: 50 },
          { id: "41573", name: "Carnivora", rank: "order", rankLevel: 40 },
        ],
      };
      const guessTargetLca = calculateLCA(shortenedWolf, target);
      const relatedLca = calculateLCA(shortenedWolf, wolf());

      expect(guessTargetLca.clade).toBe("Carnivora");
      expect(guessTargetLca.depth).toBe(carnivoraDepth);
      expect(relatedLca.depth).toBe(carnivoraDepth);
      expect(lcaDepthOnTarget(relatedLca, wolf(), target)).toBe(carnivoraDepth);
      expect(
        isLCAMoreSpecificOnTarget(relatedLca, wolf(), guessTargetLca, target),
      ).toBe(false);
    });

    it("detects a pairwise LCA more specific than guess∩target via rankLevel fallback", () => {
      const target = tiger();
      const owl = {
        id: "owl-1",
        name: "Great Horned Owl",
        scientificName: "Bubo virginianus",
        lineage: [
          { id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 },
          { id: "2", name: "Chordata", rank: "phylum", rankLevel: 60 },
          { id: "aves", name: "Aves", rank: "class", rankLevel: 50 },
        ],
      };
      const owl2 = {
        id: "owl-2",
        name: "Snowy Owl",
        scientificName: "Bubo scandiacus",
        lineage: [
          { id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 },
          { id: "2", name: "Chordata", rank: "phylum", rankLevel: 60 },
          { id: "aves", name: "Aves", rank: "class", rankLevel: 50 },
          { id: "strig", name: "Strigiformes", rank: "order", rankLevel: 40 },
          { id: "owl-sp", name: "Bubo scandiacus", rank: "species", rankLevel: 10 },
        ],
      };

      const guessTargetLca = calculateLCA(owl2, target);
      const pairwiseLca = calculateLCA(owl2, owl);

      expect(guessTargetLca.clade).toBe("Chordata");
      expect(pairwiseLca.clade).toBe("Aves");
      expect(
        isLCAMoreSpecificOnTarget(pairwiseLca, owl, guessTargetLca, target),
      ).toBe(true);
    });
  });
});
