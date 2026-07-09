import { describe, expect, it } from "vitest";
import { calculateLCA } from "~/utils/lcaCalculator";
import { buildShareableText, calculatePhylogeneticMetrics } from "~/utils/sharingFormatter";
import type { GameStatus, GuessEntry } from "~/stores/gameStore";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import {
  lion as lionFixture,
  TIGER_LINEAGE,
  tiger as tigerFixture,
  wolf as wolfFixture,
} from "#test/helpers/animalFixtures";

describe("calculatePhylogeneticMetrics", () => {
  const tiger = tigerFixture();
  const wolf = wolfFixture();
  const lion = lionFixture();
  const targetMax = TIGER_LINEAGE.length - 1;
  const carnivoraDepth = TIGER_LINEAGE.findIndex(t => t.name === "Carnivora");
  const pantheraDepth = TIGER_LINEAGE.findIndex(t => t.name === "Panthera");
  const speciesDepth = targetMax;

  function guessEntry(animal: Animal, target: Animal, timestamp: number): GuessEntry {
    return {
      animal,
      lca: calculateLCA(animal, target),
      timestamp,
    };
  }

  function leafNode(id: string, depth: number): TreeNode {
    return {
      id,
      type: "animal",
      name: id,
      children: [],
      depth,
    };
  }

  function makeTreeData(guessDepths: number[]): TreeData {
    const guesses = guessDepths.map((d, i) => leafNode(`g${i}`, d));
    return {
      root: leafNode("root", 0),
      target: leafNode("t", 6),
      nodes: [],
      guesses,
    };
  }

  it("returns null when status is not won or lost", () => {
    const statuses: GameStatus[] = ["idle", "playing"];
    for (const status of statuses) {
      const metrics = calculatePhylogeneticMetrics(
        makeTreeData([2]),
        [guessEntry(wolf, tiger, 0)],
        tiger,
        status,
      );
      expect(metrics).toBeNull();
    }
  });

  it("returns null when guesses are empty", () => {
    expect(calculatePhylogeneticMetrics(makeTreeData([1]), [], tiger, "won")).toBeNull();
  });

  it("returns null when target is null", () => {
    expect(
      calculatePhylogeneticMetrics(makeTreeData([1]), [guessEntry(wolf, tiger, 0)], null, "won"),
    ).toBeNull();
  });

  it("uses max depth from treeData.guesses when any guess node has numeric depth", () => {
    const treeData = makeTreeData([2, 5, 3]);
    const guesses = [guessEntry(wolf, tiger, 1)];
    const result = calculatePhylogeneticMetrics(treeData, guesses, tiger, "won");
    expect(result).not.toBeNull();
    expect(result!.treeDepth).toBe(5);
  });

  it("falls back to LCA-based tree depth when treeData is null", () => {
    const guesses = [guessEntry(wolf, tiger, 1)];
    const result = calculatePhylogeneticMetrics(null, guesses, tiger, "lost");
    expect(result).not.toBeNull();
    expect(result!.treeDepth).toBe(carnivoraDepth + 1);
  });

  it("uses tree depth fallback when treeData exists but guess nodes lack numeric depth", () => {
    const treeWithoutDepths: TreeData = {
      root: leafNode("root", 0),
      target: leafNode("t", 6),
      nodes: [],
      guesses: [{ id: "g0", type: "animal", name: "g0", children: [] }],
    };
    const guesses = [guessEntry(wolf, tiger, 1)];
    const result = calculatePhylogeneticMetrics(treeWithoutDepths, guesses, tiger, "won");
    expect(result).not.toBeNull();
    expect(result!.treeDepth).toBe(carnivoraDepth + 1);
  });

  it("winning guess yields evolutionary distance 0 and matches fixed fixture on repeat", () => {
    const treeData = makeTreeData([speciesDepth]);
    const guesses = [guessEntry(tiger, tiger, 1)];
    const a = calculatePhylogeneticMetrics(treeData, guesses, tiger, "won");
    const b = calculatePhylogeneticMetrics(treeData, guesses, tiger, "won");
    expect(a).toEqual(b);
    expect(a!.evolutionaryDistance).toBe(0);
    expect(a!.furthestEvolutionaryDistance).toBe(0);
  });

  it("loss path: evolutionary distance is min ranks remaining across guesses", () => {
    const guesses = [guessEntry(wolf, tiger, 1), guessEntry(lion, tiger, 2)];
    const result = calculatePhylogeneticMetrics(null, guesses, tiger, "lost");
    expect(result).not.toBeNull();
    // Wolf: LCA depth 3 → 6 - 3 = 3; Lion: depth 5 → 6 - 5 = 1
    expect(result!.evolutionaryDistance).toBe(targetMax - pantheraDepth);
    expect(result!.furthestEvolutionaryDistance).toBe(targetMax - carnivoraDepth);
  });

  it("treats empty target taxonomy as targetMax 0 for evolutionary distance", () => {
    const bare: Animal = {
      id: "x",
      name: "X",
      scientificName: "X sp",
      lineage: [],
    };
    const badGuess: GuessEntry = {
      animal: wolf,
      lca: { clade: "Life", rank: "root", depth: -1, path: [] },
      timestamp: 1,
    };
    const result = calculatePhylogeneticMetrics(null, [badGuess], bare, "won");
    expect(result).not.toBeNull();
    expect(result!.evolutionaryDistance).toBe(1);
    expect(result!.furthestEvolutionaryDistance).toBe(1);
  });

  it("when every guess has lca.depth === -1, tree depth is 0 and evolutionary distance is targetMax + 1", () => {
    const invalid = (a: Animal): GuessEntry => ({
      animal: a,
      lca: { clade: "Life", rank: "root", depth: -1, path: [] },
      timestamp: 0,
    });
    const guesses = [invalid(wolf), invalid(lion)];
    const result = calculatePhylogeneticMetrics(null, guesses, tiger, "lost");
    expect(result).not.toBeNull();
    expect(result!.treeDepth).toBe(0);
    expect(result!.evolutionaryDistance).toBe(targetMax + 1);
    expect(result!.furthestEvolutionaryDistance).toBe(targetMax + 1);
  });

  it("when every guess has lca.depth < 0 but treeData has depths, tree depth still uses tree", () => {
    const guesses = [
      {
        animal: wolf,
        lca: { clade: "Life", rank: "root", depth: -1, path: [] },
        timestamp: 1,
      } satisfies GuessEntry,
    ];
    const treeData = makeTreeData([4]);
    const result = calculatePhylogeneticMetrics(treeData, guesses, tiger, "won");
    expect(result!.treeDepth).toBe(4);
    expect(result!.evolutionaryDistance).toBe(targetMax + 1);
  });
});

describe("buildShareableText", () => {
  const tiger = tigerFixture();
  const wolf = wolfFixture();
  const lion = lionFixture();
  const targetMax = TIGER_LINEAGE.length - 1;

  function guessEntry(animal: Animal, target: Animal, timestamp: number): GuessEntry {
    return {
      animal,
      lca: calculateLCA(animal, target),
      timestamp,
    };
  }

  function leafNode(id: string, depth: number): TreeNode {
    return {
      id,
      type: "animal",
      name: id,
      children: [],
      depth,
    };
  }

  function makeTreeData(guessDepths: number[]): TreeData {
    const guesses = guessDepths.map((d, i) => leafNode(`g${i}`, d));
    return {
      root: leafNode("root", 0),
      target: leafNode("t", 6),
      nodes: [],
      guesses,
    };
  }

  it("builds spoiler-safe won text for daily puzzles (exact template)", () => {
    const text = buildShareableText({
      status: "won",
      target: tiger,
      guesses: [guessEntry(tiger, tiger, 1)],
      treeData: makeTreeData([targetMax]),
      gameMode: "daily",
      puzzleDate: "2026-03-25",
      maxGuesses: 20,
    });

    expect(text).not.toBeNull();
    expect(text).toBe(
      [
        "Cladle",
        "Daily puzzle: 2026-03-25",
        "Tree depth: 11",
        "Evolutionary distance: 0",
        "Furthest evolutionary distance: 0",
        "Outcome: Solved in 1 guesses.",
      ].join("\n"),
    );

    const forbidden = [tiger.name, tiger.scientificName, wolf.name, wolf.scientificName];
    for (const s of forbidden) {
      expect(text).not.toContain(s);
    }
  });

  it("builds spoiler-safe lost text for free-play puzzles (no daily line)", () => {
    const text = buildShareableText({
      status: "lost",
      target: tiger,
      guesses: [guessEntry(wolf, tiger, 1), guessEntry(lion, tiger, 2)],
      treeData: makeTreeData([2, 5]),
      gameMode: "free-play",
      puzzleDate: "2026-03-25",
      maxGuesses: 20,
    });

    expect(text).not.toBeNull();
    expect(text).toBe(
      [
        "Cladle",
        "Tree depth: 5",
        "Evolutionary distance: 1",
        "Furthest evolutionary distance: 4",
        "Outcome: Did not solve in 2 guesses.",
      ].join("\n"),
    );

    const forbidden = [
      tiger.name,
      tiger.scientificName,
      wolf.name,
      wolf.scientificName,
      lion.name,
      lion.scientificName,
    ];
    for (const s of forbidden) {
      expect(text).not.toContain(s);
    }
  });

  it("returns null when puzzle is not completed", () => {
    const text = buildShareableText({
      status: "playing",
      target: tiger,
      guesses: [guessEntry(tiger, tiger, 1)],
      treeData: makeTreeData([targetMax]),
      gameMode: "daily",
      puzzleDate: "2026-03-25",
      maxGuesses: 20,
    });
    expect(text).toBeNull();
  });
});
