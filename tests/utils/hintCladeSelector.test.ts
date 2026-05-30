import { describe, expect, it } from "vitest";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { HintCladeSelectorInput } from "~/utils/hintCladeSelector";
import { normalizeCladeName, selectHintClade } from "~/utils/hintCladeSelector";
import type { Animal } from "~/types/animal";

describe("selectHintClade", () => {
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

  const bear: Animal = {
    id: "5",
    name: "Brown Bear",
    scientificName: "Ursus arctos",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Ursidae", "Ursus", "Ursus arctos"],
  };

  function input(
    target: Animal,
    overrides: Partial<HintCladeSelectorInput> = {},
  ): HintCladeSelectorInput {
    return {
      target,
      guesses: [],
      previousHintClades: [],
      revealedCladeNames: [normalizeCladeName("Animalia")],
      ...overrides,
    };
  }

  it("reveals Chordata when kingdom is already on the tree (no guesses)", () => {
    const result = selectHintClade(input(lion));

    expect(result).not.toBeNull();
    expect(result!.clade).toBe("Chordata");
    expect(result!.rank).toBe("phylum");
    expect(result!.depth).toBe(1);
  });

  it("reveals Felidae one rank above Carnivora after a bear guess toward lion", () => {
    const bearLca = calculateLCA(bear, lion);
    expect(bearLca.clade).toBe("Carnivora");
    expect(bearLca.depth).toBe(3);

    const result = selectHintClade(input(lion, {
      guesses: [{ lca: bearLca }],
    }));

    expect(result).not.toBeNull();
    expect(result!.clade).toBe("Felidae");
    expect(result!.rank).toBe("family");
    expect(result!.depth).toBe(4);
  });

  it("returns Felidae one rank above Carnivora after Wolf guess toward tiger", () => {
    const wolfLca = calculateLCA(wolf, tiger);

    const result = selectHintClade(input(tiger, {
      guesses: [{ lca: wolfLca }],
    }));

    expect(result!.clade).toBe("Felidae");
    expect(result!.depth).toBe(4);
  });

  it("steps to genus when family was already revealed after Carnivora anchor", () => {
    const wolfLca = calculateLCA(wolf, tiger);

    const result = selectHintClade(input(tiger, {
      guesses: [{ lca: wolfLca }],
      previousHintClades: ["Felidae"],
      revealedCladeNames: [
        normalizeCladeName("Animalia"),
        normalizeCladeName("Felidae"),
      ],
    }));

    expect(result!.clade).toBe("Panthera");
    expect(result!.depth).toBe(5);
  });

  it("returns null when the next rank would be species", () => {
    const lionOnTiger = calculateLCA(lion, tiger);
    expect(lionOnTiger.depth).toBe(5);

    const result = selectHintClade(input(tiger, {
      guesses: [{ lca: lionOnTiger }],
      revealedCladeNames: [
        normalizeCladeName("Animalia"),
        normalizeCladeName("Chordata"),
        normalizeCladeName("Mammalia"),
        normalizeCladeName("Carnivora"),
        normalizeCladeName("Felidae"),
        normalizeCladeName("Panthera"),
      ],
    }));

    expect(result).toBeNull();
  });

  it("second hint is one rank above the previous hint on the target path", () => {
    const wolfLca = calculateLCA(wolf, tiger);

    const first = selectHintClade(input(tiger, { guesses: [{ lca: wolfLca }] }));
    expect(first!.clade).toBe("Felidae");

    const second = selectHintClade(input(tiger, {
      guesses: [{ lca: wolfLca }],
      previousHintClades: [first!.clade],
      revealedCladeNames: [
        normalizeCladeName("Animalia"),
        normalizeCladeName("Felidae"),
      ],
    }));

    expect(second!.clade).toBe("Panthera");
    expect(second!.rank).toBe("genus");
    expect(second!.depth).toBe(5);
  });
});
