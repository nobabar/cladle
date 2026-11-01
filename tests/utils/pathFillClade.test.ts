import { describe, expect, it } from "vitest";
import { calculateLCA } from "~/utils/lcaCalculator";
import { selectPathFillClade } from "~/utils/pathFillClade";
import {
  LION_LINEAGE,
  lion as lionFixture,
  TIGER_LINEAGE,
  tiger as tigerFixture,
  wolf as wolfFixture,
} from "#test/helpers/animalFixtures";
import { lineageFromNames } from "~/utils/taxonLineage";
import type { Animal } from "~/types/animal";

describe("selectPathFillClade", () => {
  const tiger = tigerFixture();
  const lion = lionFixture();
  const wolf = wolfFixture();

  const birdWithVertebrata: Animal = {
    id: "bird-vert",
    name: "Bald Eagle",
    scientificName: "Haliaeetus leucocephalus",
    lineage: lineageFromNames(
      [
        "Animalia",
        "Chordata",
        "Vertebrata",
        "Aves",
        "Accipitriformes",
        "Accipitridae",
        "Haliaeetus",
        "Haliaeetus leucocephalus",
      ],
      {
        ids: ["1", "2", "355675", "aves", "accip", "accip-fam", "haliaeetus", "haliaeetus-leuco"],
        ranks: [
          "kingdom",
          "phylum",
          "subphylum",
          "class",
          "order",
          "family",
          "genus",
          "species",
        ],
        rankLevels: [70, 60, 57, 50, 40, 30, 20, 10],
      },
    ),
  };

  it("selects Mammalia after Vertebrata LCA for a mammal guess vs bird mystery", () => {
    const lca = calculateLCA(lion, birdWithVertebrata);
    expect(lca.clade).toBe("Vertebrata");

    const pathFill = selectPathFillClade(lion, lca, birdWithVertebrata);

    expect(pathFill).not.toBeNull();
    expect(pathFill!.clade).toBe("Mammalia");
    expect(pathFill!.rank).toBe("class");
    expect(pathFill!.depth).toBe(LION_LINEAGE.findIndex(t => t.name === "Mammalia"));
  });

  it("selects Canidae after Carnivora LCA for wolf vs tiger", () => {
    const lca = calculateLCA(wolf, tiger);
    expect(lca.clade).toBe("Carnivora");

    const pathFill = selectPathFillClade(wolf, lca, tiger);

    expect(pathFill).not.toBeNull();
    expect(pathFill!.clade).toBe("Canidae");
    expect(pathFill!.rank).toBe("family");
  });

  it("returns null when the next lineage step is species", () => {
    const pantheraDepth = TIGER_LINEAGE.findIndex(t => t.name === "Panthera");
    const lca = calculateLCA(lion, tiger);
    expect(lca.depth).toBe(pantheraDepth);

    const pathFill = selectPathFillClade(lion, lca, tiger);

    expect(pathFill).toBeNull();
  });

  it("returns null for Life-root / invalid depth", () => {
    const pathFill = selectPathFillClade(lion, {
      clade: "Life",
      rank: "root",
      depth: -1,
      path: [],
    }, tiger);

    expect(pathFill).toBeNull();
  });

  it("returns null when guess lineage is empty", () => {
    const emptyGuess: Animal = {
      id: "empty",
      name: "Empty",
      scientificName: "Empty empty",
      lineage: [],
    };
    const lca = calculateLCA(lion, tiger);

    expect(selectPathFillClade(emptyGuess, lca, tiger)).toBeNull();
  });

  it("falls back to clade name match when target is omitted", () => {
    const lca = calculateLCA(wolf, tiger);
    const pathFill = selectPathFillClade(wolf, lca);

    expect(pathFill?.clade).toBe("Canidae");
  });

  it("returns only the first eligible step (not deeper family/genus chain)", () => {
    const lca = calculateLCA(lion, birdWithVertebrata);
    const pathFill = selectPathFillClade(lion, lca, birdWithVertebrata);

    expect(pathFill?.clade).toBe("Mammalia");
    expect(pathFill?.clade).not.toBe("Theria");
    expect(pathFill?.clade).not.toBe("Carnivora");
  });
});
