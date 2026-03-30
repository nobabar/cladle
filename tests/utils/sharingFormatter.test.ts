import { describe, expect, it } from "vitest";
import { calculateLCA } from "~/utils/lcaCalculator";
import { buildShareableText, calculatePhylogeneticMetrics } from "~/utils/sharingFormatter";
import type { GameStatus, GuessEntry } from "~/stores/gameStore";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";

describe("calculatePhylogeneticMetrics", () => {
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
    // Wolf vs tiger LCA Carnivora at depth 3 → depth + 1 = 4
    expect(result!.treeDepth).toBe(4);
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
    expect(result!.treeDepth).toBe(4);
  });

  it("winning guess yields evolutionary distance 0 and matches fixed fixture on repeat", () => {
    const treeData = makeTreeData([6]);
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
    expect(result!.evolutionaryDistance).toBe(1);
    expect(result!.furthestEvolutionaryDistance).toBe(3);
  });

  it("treats empty target taxonomy as targetMax 0 for evolutionary distance", () => {
    const bare: Animal = {
      id: "x",
      name: "X",
      scientificName: "X sp",
      taxonomy: [],
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
    expect(result!.evolutionaryDistance).toBe(7);
    expect(result!.furthestEvolutionaryDistance).toBe(7);
  });

  it("when every guess has lca.depth < 0 but treeData provides depths, tree depth still uses tree", () => {
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
    expect(result!.evolutionaryDistance).toBe(7);
  });
});

describe("buildShareableText", () => {
  const tiger: Animal = {
    id: "1",
    name: "Tiger",
    scientificName: "Panthera tigris",
    taxonomy: [
      "Animalia",
      "Chordata",
      "Mammalia",
      "Carnivora",
      "Felidae",
      "Panthera",
      "Panthera tigris",
    ],
  };

  const wolf: Animal = {
    id: "2",
    name: "Wolf",
    scientificName: "Canis lupus",
    taxonomy: [
      "Animalia",
      "Chordata",
      "Mammalia",
      "Carnivora",
      "Canidae",
      "Canis",
      "Canis lupus",
    ],
  };

  const lion: Animal = {
    id: "3",
    name: "Lion",
    scientificName: "Panthera leo",
    taxonomy: [
      "Animalia",
      "Chordata",
      "Mammalia",
      "Carnivora",
      "Felidae",
      "Panthera",
      "Panthera leo",
    ],
  };

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
      treeData: makeTreeData([6]),
      gameMode: "daily",
      puzzleDate: "2026-03-25",
      maxGuesses: 20,
    });

    expect(text).not.toBeNull();
    expect(text).toBe(
      [
        "Cladle",
        "Daily puzzle: 2026-03-25",
        "Tree depth: 6",
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
        "Furthest evolutionary distance: 3",
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
      treeData: makeTreeData([6]),
      gameMode: "daily",
      puzzleDate: "2026-03-25",
      maxGuesses: 20,
    });
    expect(text).toBeNull();
  });
});
