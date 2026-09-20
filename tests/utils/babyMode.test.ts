/**
 * Unit tests for Baby Mode organism list and selectors.
 */

import { describe, expect, it, vi } from "vitest";
import {
  BABY_MODE_DIFFICULTY_PROFILE,
  BABY_MODE_MAX_GUESSES,
  BABY_MODE_ORGANISMS,
  babyModeStickerMap,
  getBabyModeCladeLabel,
  getBabyModeEmoji,
  getBabyModeOrganismById,
  hasBabyModeCladeInCatalog,
  hasBabyModeCladeLabel,
  isBabyModeOrganism,
  resolveBabyModeLCA,
  selectBabyModeTarget,
  selectRandomBabyModeTarget,
  simplifyBabyModeTree,
} from "~/utils/babyMode";
import type { TreeNode } from "~/types/tree";
import type { LCAResult } from "~/utils/lcaCalculator";
import { CURATED_ANIMALS } from "~/utils/puzzleSelector";
import * as puzzleSelector from "~/utils/puzzleSelector";

const BEGINNER_NAME_PATTERN = /^[a-z]+(?: [a-z]+)?$/i;
const ALLOWED_GROUPS = new Set([
  "mammal",
  "bird",
  "reptile",
  "amphibian",
  "fish",
  "insect",
  "arachnid",
  "crustacean",
  "mollusk",
  "cnidarian",
]);
const NUMERIC_ID_PATTERN = /^\d+$/;

describe("babyMode", () => {
  describe("baby mode difficulty profile", () => {
    it("uses a smaller guess budget than standard daily mode", () => {
      expect(BABY_MODE_MAX_GUESSES).toBe(20);
      expect(BABY_MODE_MAX_GUESSES).toBeLessThan(25);
    });

    it("records the locked product decisions for later stories", () => {
      expect(BABY_MODE_DIFFICULTY_PROFILE.id).toBe("baby");
      expect(BABY_MODE_DIFFICULTY_PROFILE.guessPool).toBe("closed-subset");
      expect(BABY_MODE_DIFFICULTY_PROFILE.dailyRelation).toBe("independent-date-seeded");
      expect(BABY_MODE_DIFFICULTY_PROFILE.minCount).toBe(30);
      expect(BABY_MODE_DIFFICULTY_PROFILE.maxCount).toBe(50);
      expect(BABY_MODE_DIFFICULTY_PROFILE.minTaxonomicGroups).toBe(6);
    });

    it("keeps the organism list within the documented size bounds", () => {
      const { minCount, maxCount } = BABY_MODE_DIFFICULTY_PROFILE;
      expect(BABY_MODE_ORGANISMS.length).toBeGreaterThanOrEqual(minCount);
      expect(BABY_MODE_ORGANISMS.length).toBeLessThanOrEqual(maxCount);
    });
  });

  describe("baby mode clade labels", () => {
    const lookup = (key: string) => {
      const map: Record<string, string> = {
        "babyMode.clades.Mammalia": "Mammals",
        "babyMode.clades.Laurasiatheria": "Hoofed & meat eaters",
      };
      return map[key] ?? key;
    };
    const hasKey = (key: string) => key in {
      "babyMode.clades.Mammalia": true,
      "babyMode.clades.Laurasiatheria": true,
    };

    it("uses explicit clade translations when available", () => {
      expect(getBabyModeCladeLabel("Mammalia", lookup, hasKey)).toBe("Mammals");
      expect(hasBabyModeCladeLabel("Mammalia", hasKey)).toBe(true);
    });

    it("returns null for clades without a common name", () => {
      expect(getBabyModeCladeLabel("Laurasiatheria", lookup, () => false)).toBeNull();
      expect(hasBabyModeCladeLabel("Laurasiatheria", () => false)).toBe(false);
      expect(hasBabyModeCladeInCatalog("Laurasiatheria")).toBe(false);
      expect(hasBabyModeCladeInCatalog("Mammalia")).toBe(true);
    });
  });

  describe("resolveBabyModeLCA", () => {
    const mammalPath = [
      "Animalia",
      "Chordata",
      "Vertebrata",
      "Mammalia",
      "Laurasiatheria",
      "Carnivora",
    ];

    const referenceAnimal = {
      id: "47144",
      name: "Dog",
      scientificName: "Canis familiaris",
      lineage: mammalPath.map((name, index) => ({
        id: String(index),
        name,
        rank: index === 3 ? "class" : "order",
      })),
    };

    it("promotes an unlabeled LCA to the nearest labeled ancestor", () => {
      const lca: LCAResult = {
        clade: "Laurasiatheria",
        rank: "superorder",
        depth: 4,
        path: mammalPath.slice(0, 5),
      };

      expect(resolveBabyModeLCA(lca, referenceAnimal).clade).toBe("Mammalia");
    });

    it("keeps a labeled LCA unchanged", () => {
      const lca: LCAResult = {
        clade: "Carnivora",
        rank: "order",
        depth: 5,
        path: mammalPath,
      };

      expect(resolveBabyModeLCA(lca, referenceAnimal).clade).toBe("Carnivora");
    });
  });

  describe("simplifyBabyModeTree", () => {
    function clade(id: string, name: string, children: TreeNode[] = []): TreeNode {
      return {
        id,
        type: "clade",
        name,
        children,
        cladeData: { name, rank: "order" },
      };
    }

    function animal(id: string, name: string): TreeNode {
      return { id, type: "animal", name, children: [], isGuess: true };
    }

    it("removes clade nodes that have no kid-friendly label", () => {
      const mammalPath = [
        "Animalia",
        "Chordata",
        "Vertebrata",
        "Mammalia",
        "Laurasiatheria",
        "Carnivora",
      ];

      const target = animal("target", "Dog");
      const guess = animal("guess", "Cat");
      const carnivora = clade("carnivora", "Carnivora", [guess, target]);
      carnivora.taxonomyPath = mammalPath;
      const laurasiatheria = clade("laurasiatheria", "Laurasiatheria", [carnivora]);
      laurasiatheria.taxonomyPath = mammalPath.slice(0, 5);
      const mammalia = clade("mammalia", "Mammalia", [laurasiatheria]);
      mammalia.taxonomyPath = mammalPath.slice(0, 4);
      const root = clade("animalia", "Animalia", [mammalia]);
      root.taxonomyPath = ["Animalia"];

      guess.parent = carnivora;
      target.parent = carnivora;
      carnivora.parent = laurasiatheria;
      laurasiatheria.parent = mammalia;
      mammalia.parent = root;

      const treeData = {
        root,
        target,
        nodes: [root, mammalia, laurasiatheria, carnivora, target, guess],
        guesses: [guess],
      };

      const hasLabel = (name: string) => ["Animalia", "Mammalia", "Carnivora"].includes(name);
      const simplified = simplifyBabyModeTree(treeData, hasLabel);

      const cladeNames = simplified.nodes
        .filter(node => node.type === "clade")
        .map(node => node.name);

      expect(cladeNames).toContain("Animalia");
      expect(cladeNames).toContain("Mammalia");
      expect(cladeNames).toContain("Carnivora");
      expect(cladeNames).not.toContain("Laurasiatheria");

      const mammaliaNode = simplified.nodes.find(node => node.name === "Mammalia");
      expect(mammaliaNode?.children.some(child => child.name === "Carnivora")).toBe(true);
    });

    it("anchors guesses under the nearest labeled ancestor when intermediate clades are missing", () => {
      const mammalPath = [
        "Animalia",
        "Chordata",
        "Vertebrata",
        "Mammalia",
        "Laurasiatheria",
      ];
      const guess = animal("guess", "Cow");
      const laurasiatheria = clade("laurasiatheria", "Laurasiatheria", [guess]);
      laurasiatheria.taxonomyPath = mammalPath;
      guess.taxonomyPath = mammalPath;
      const root = clade("animalia", "Animalia", [laurasiatheria]);
      guess.parent = laurasiatheria;
      laurasiatheria.parent = root;

      const target = animal("target", "Dog");
      root.children.push(target);
      target.parent = root;

      const treeData = {
        root,
        target,
        nodes: [root, laurasiatheria, guess, target],
        guesses: [guess],
      };

      const hasLabel = (name: string) => ["Animalia", "Mammalia"].includes(name);
      const simplified = simplifyBabyModeTree(treeData, hasLabel);

      const mammaliaNode = simplified.nodes.find(node => node.name === "Mammalia");
      expect(mammaliaNode).toBeDefined();
      expect(mammaliaNode!.children.some(child => child.id === "guess")).toBe(true);
      expect(simplified.nodes.some(node => node.name === "Laurasiatheria")).toBe(false);
    });
  });

  describe("baby mode organism list", () => {
    it("has exactly 45 organisms", () => {
      expect(BABY_MODE_ORGANISMS.length).toBe(45);
    });

    it("has unique numeric-string ids", () => {
      const ids = BABY_MODE_ORGANISMS.map(organism => organism.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(NUMERIC_ID_PATTERN);
      }
    });

    it("uses 1-2 word beginner names", () => {
      for (const organism of BABY_MODE_ORGANISMS) {
        expect(organism.beginnerName).toMatch(BEGINNER_NAME_PATTERN);
      }
    });

    it("includes the Felidae sibling pair Cat and Lion", () => {
      const ids = new Set(BABY_MODE_ORGANISMS.map(organism => organism.id));
      expect(ids.has("118552")).toBe(true);
      expect(ids.has("41964")).toBe(true);
      expect(getBabyModeOrganismById("118552")?.beginnerName).toBe("Cat");
      expect(getBabyModeOrganismById("41964")?.beginnerName).toBe("Lion");
    });

    it("reuses standard-list ids when the species matches", () => {
      expect(getBabyModeOrganismById("41964")?.scientificName).toBe("Panthera leo");
      expect(getBabyModeOrganismById("43580")?.beginnerName).toBe("Gorilla");
      expect(getBabyModeOrganismById("6921")?.beginnerName).toBe("Swan");
      expect(getBabyModeOrganismById("43335")?.beginnerName).toBe("Zebra");
    });

    it("has at least 4 taxonomic groups from the allowed set", () => {
      const groups = new Set(BABY_MODE_ORGANISMS.map(organism => organism.taxonomicGroup));
      expect(groups.size).toBeGreaterThanOrEqual(BABY_MODE_DIFFICULTY_PROFILE.minTaxonomicGroups);
      for (const group of groups) {
        expect(ALLOWED_GROUPS.has(group)).toBe(true);
      }
    });

    it("is not a filter of CURATED_ANIMALS easy animals", () => {
      const easyIds = new Set(
        CURATED_ANIMALS.filter(animal => animal.difficulty === "easy").map(animal => animal.id),
      );
      const babyIds = BABY_MODE_ORGANISMS.map(organism => organism.id);
      expect(babyIds.every(id => easyIds.has(id))).toBe(false);
    });

    it("has a non-empty emoji on every organism", () => {
      for (const organism of BABY_MODE_ORGANISMS) {
        expect(organism.emoji).toBeTruthy();
        expect(organism.emoji.length).toBeGreaterThan(0);
      }
    });
  });

  describe("emoji helpers", () => {
    it("exports a complete 45-id sticker map", () => {
      const map = babyModeStickerMap();
      expect(Object.keys(map).length).toBe(45);
      for (const organism of BABY_MODE_ORGANISMS) {
        expect(map[organism.id]).toBe(organism.emoji);
      }
    });

    it("returns emoji for baby mode ids and undefined for others", () => {
      expect(getBabyModeEmoji("118552")).toBe("🐈");
      expect(getBabyModeEmoji("42155")).toBeUndefined();
    });
  });

  describe("isBabyModeOrganism and getBabyModeOrganismById", () => {
    it("returns true for organisms in the baby set", () => {
      expect(isBabyModeOrganism("47144")).toBe(true);
      expect(getBabyModeOrganismById("47144")?.beginnerName).toBe("Dog");
    });

    it("returns false for a hard CURATED_ANIMALS id that is not in the baby set", () => {
      expect(isBabyModeOrganism("42155")).toBe(false);
      expect(getBabyModeOrganismById("42155")).toBeUndefined();
      expect(CURATED_ANIMALS.some(animal => animal.id === "42155")).toBe(true);
    });
  });

  describe("selectBabyModeTarget", () => {
    it("is deterministic for the same date", () => {
      const date = "2024-06-15";
      expect(selectBabyModeTarget(date)).toBe(selectBabyModeTarget(date));
    });

    it("can return different organisms for different dates", () => {
      const ids = [
        selectBabyModeTarget("2024-01-01"),
        selectBabyModeTarget("2024-01-02"),
        selectBabyModeTarget("2024-12-31"),
      ];
      expect(new Set(ids).size).toBeGreaterThan(1);
    });

    it("always returns an id from the baby set", () => {
      const babyIds = new Set(BABY_MODE_ORGANISMS.map(organism => organism.id));
      for (let day = 1; day <= 28; day++) {
        const date = `2026-03-${String(day).padStart(2, "0")}`;
        expect(babyIds.has(selectBabyModeTarget(date))).toBe(true);
      }
    });

    it("does not call the standard daily selector", () => {
      const withDifficulty = vi.spyOn(puzzleSelector, "selectTargetAnimalWithDifficulty");
      const withoutDifficulty = vi.spyOn(puzzleSelector, "selectTargetAnimal");

      selectBabyModeTarget("2024-06-15");

      expect(withDifficulty).not.toHaveBeenCalled();
      expect(withoutDifficulty).not.toHaveBeenCalled();

      withDifficulty.mockRestore();
      withoutDifficulty.mockRestore();
    });

    it("throws the same class of errors as selectTargetAnimal for invalid dates", () => {
      expect(() => selectBabyModeTarget("invalid-date")).toThrow("Invalid date format");
      expect(() => selectBabyModeTarget("2024/01/01")).toThrow("Invalid date format");
      expect(() => selectBabyModeTarget("01-01-2024")).toThrow("Invalid date format");
      expect(() => selectBabyModeTarget("2024-1-1")).toThrow("Invalid date format");
      expect(() => selectBabyModeTarget("2024-13-01")).toThrow("Invalid date");
      expect(() => selectBabyModeTarget("2024-02-30")).toThrow("Invalid date");
      expect(() => selectBabyModeTarget("2024-00-01")).toThrow("Invalid date");
    });
  });

  describe("selectRandomBabyModeTarget", () => {
    it("returns an id from the baby set", () => {
      const babyIds = new Set(BABY_MODE_ORGANISMS.map(organism => organism.id));
      for (let i = 0; i < 20; i++) {
        expect(babyIds.has(selectRandomBabyModeTarget())).toBe(true);
      }
    });

    it("is non-deterministic across multiple calls", () => {
      const results = new Set<string>();
      for (let i = 0; i < 20; i++) {
        results.add(selectRandomBabyModeTarget());
      }
      expect(results.size).toBeGreaterThanOrEqual(2);
    });
  });
});
