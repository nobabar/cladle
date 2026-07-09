import { describe, expect, it } from "vitest";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { HintCladeSelectorInput } from "~/utils/hintCladeSelector";
import { normalizeCladeName, selectHintClade } from "~/utils/hintCladeSelector";
import {
  bear,
  LION_LINEAGE,
  lion as lionFixture,
  TIGER_LINEAGE,
  tiger as tigerFixture,
  wolf as wolfFixture,
} from "#test/helpers/animalFixtures";

describe("selectHintClade", () => {
  const tiger = tigerFixture();
  const wolf = wolfFixture();
  const lion = lionFixture();

  const carnivoraDepth = LION_LINEAGE.findIndex(t => t.name === "Carnivora");
  const felidaeDepth = LION_LINEAGE.findIndex(t => t.name === "Felidae");
  const pantherinaeDepth = TIGER_LINEAGE.findIndex(t => t.name === "Pantherinae");

  function input(
    target: typeof tiger,
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
    const bearLca = calculateLCA(bear(), lion);
    expect(bearLca.clade).toBe("Carnivora");
    expect(bearLca.depth).toBe(carnivoraDepth);

    const result = selectHintClade(input(lion, {
      guesses: [{ lca: bearLca }],
    }));

    expect(result).not.toBeNull();
    expect(result!.clade).toBe("Felidae");
    expect(result!.rank).toBe("family");
    expect(result!.depth).toBe(felidaeDepth);
  });

  it("returns Felidae one rank above Carnivora after Wolf guess toward tiger", () => {
    const wolfLca = calculateLCA(wolf, tiger);

    const result = selectHintClade(input(tiger, {
      guesses: [{ lca: wolfLca }],
    }));

    expect(result!.clade).toBe("Felidae");
    expect(result!.depth).toBe(felidaeDepth);
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

    expect(result!.clade).toBe("Pantherinae");
    expect(result!.depth).toBe(pantherinaeDepth);
  });

  it("returns null when the next rank would be species", () => {
    const lionOnTiger = calculateLCA(lion, tiger);
    expect(lionOnTiger.depth).toBe(TIGER_LINEAGE.findIndex(t => t.name === "Panthera"));

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

    expect(second!.clade).toBe("Pantherinae");
    expect(second!.rank).toBe("subfamily");
    expect(second!.depth).toBe(pantherinaeDepth);
  });
});
