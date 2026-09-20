/**
 * Unit tests for Baby Mode static animal bundle.
 */

import { describe, expect, it } from "vitest";
import { BABY_MODE_ORGANISMS } from "~/utils/babyMode";
import {
  BABY_MODE_BUNDLE_VERSION,
  getBabyModeAnimal,
  getBabyModeAnimalsById,
  listBabyModeAnimals,
  loadBabyModeBundle,
} from "~/utils/babyModeBundle";
import { calculateLCA } from "~/utils/lcaCalculator";
import bundleJson from "~/assets/data/baby-mode-bundle.json";

describe("babyModeBundle", () => {
  describe("bundle envelope", () => {
    it("has a version integer in the committed JSON", () => {
      expect(typeof bundleJson.version).toBe("number");
      expect(Number.isInteger(bundleJson.version)).toBe(true);
      expect(bundleJson.version).toBe(BABY_MODE_BUNDLE_VERSION);
    });

    it("loads a validated bundle with matching version", () => {
      const bundle = loadBabyModeBundle();
      expect(bundle.version).toBe(BABY_MODE_BUNDLE_VERSION);
      expect(bundle.generatedAt).toBeTruthy();
    });
  });

  describe("organism coverage", () => {
    it("contains all 45 beginner-mode organism ids", () => {
      const animals = listBabyModeAnimals();
      expect(animals.length).toBe(45);

      const bundleIds = new Set(animals.map(animal => animal.id));
      for (const organism of BABY_MODE_ORGANISMS) {
        expect(bundleIds.has(organism.id)).toBe(true);
      }
    });

    it("uses beginnerName as Animal.name, not iNat preferred_common_name", () => {
      for (const organism of BABY_MODE_ORGANISMS) {
        const animal = getBabyModeAnimal(organism.id);
        expect(animal?.name).toBe(organism.beginnerName);
        expect(animal?.scientificName).toBe(organism.scientificName);
      }
    });

    it("never has empty lineages", () => {
      for (const animal of listBabyModeAnimals()) {
        expect(animal.lineage.length).toBeGreaterThan(0);
        for (const taxon of animal.lineage) {
          expect(taxon.id).toBeTruthy();
          expect(taxon.name).toBeTruthy();
          expect(taxon.rank).toBeTruthy();
        }
      }
    });
  });

  describe("lca contract", () => {
    it("shares a felid taxon id between Cat and Lion", () => {
      const cat = getBabyModeAnimal("118552");
      const lion = getBabyModeAnimal("41964");
      expect(cat).toBeDefined();
      expect(lion).toBeDefined();

      const catIds = new Set(cat!.lineage.map(t => t.id));
      const sharedFelid = lion!.lineage.find(
        t => catIds.has(t.id) && (t.rank === "family" || t.name.includes("Felid") || t.name === "Felidae"),
      );
      expect(sharedFelid).toBeDefined();

      const lca = calculateLCA(cat!, lion!);
      expect(lca.depth).toBeGreaterThan(0);
      expect(lca.rank).not.toBe("species");
    });

    it("finds a shallow LCA for Dog vs Butterfly (not species-level)", () => {
      const dog = getBabyModeAnimal("47144");
      const butterfly = getBabyModeAnimal("48662");
      expect(dog).toBeDefined();
      expect(butterfly).toBeDefined();

      const lca = calculateLCA(dog!, butterfly!);
      expect(lca.rank).not.toBe("species");
      expect(lca.depth).toBeLessThan(dog!.lineage.length - 1);
      expect(lca.depth).toBeLessThan(butterfly!.lineage.length - 1);
    });
  });

  describe("lookup safety", () => {
    it("returns undefined for unknown ids without throwing", () => {
      expect(getBabyModeAnimal("99999999")).toBeUndefined();
      expect(getBabyModeAnimal("")).toBeUndefined();
    });

    it("exposes a map with the same animals as the list", () => {
      const byId = getBabyModeAnimalsById();
      expect(byId.size).toBe(45);
      expect([...byId.keys()].sort()).toEqual(
        BABY_MODE_ORGANISMS.map(o => o.id).sort(),
      );
    });
  });
});
