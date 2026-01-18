import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useGameStore } from "~/stores/gameStore";
import type { Animal } from "~/types/animal";

describe("gameStore", () => {
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

  const bear: Animal = {
    id: "5",
    name: "Brown Bear",
    scientificName: "Ursus arctos",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Ursidae", "Ursus", "Ursus arctos"],
  };

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("game initialization", () => {
    it("should initialize game with target animal", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);

      expect(store.target).toEqual(tiger);
      expect(store.status).toBe("playing");
      expect(store.maxGuesses).toBe(6);
      expect(store.guesses).toHaveLength(0);
      expect(store.treeData).not.toBeNull();
    });

    it("should initialize tree with root and target", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);

      expect(store.treeData).not.toBeNull();
      expect(store.treeData?.root).toBeDefined();
      expect(store.treeData?.target).toBeDefined();
      expect(store.treeData?.target.data?.id).toBe(tiger.id);
      expect(store.treeData?.target.isTarget).toBe(true);
    });

    it("should build taxonomy path from root to target", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);

      const root = store.treeData?.root;
      expect(root).toBeDefined();
      expect(root?.children.length).toBeGreaterThan(0);

      // Verify path exists
      let currentNode = root;
      for (const cladeName of tiger.taxonomy) {
        const child = currentNode?.children.find(c => c.name === cladeName);
        expect(child).toBeDefined();
        currentNode = child;
      }

      // Verify target is at the end
      expect(currentNode?.children.some(c => c.isTarget)).toBe(true);
    });

    it("should reset game state", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);
      store.resetGame();

      expect(store.status).toBe("idle");
      expect(store.target).toBeNull();
      expect(store.guesses).toHaveLength(0);
      expect(store.treeData).toBeNull();
    });
  });

  describe("guess processing", () => {
    it("should process a valid guess", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);

      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.animal.id).toBe(wolf.id);
      expect(store.guesses[0]?.lca).toBeDefined();
      expect(store.guesses[0]?.lca.clade).toBe("Carnivora");
    });

    it("should calculate LCA between guess and target", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);

      const guess = store.guesses[0];
      expect(guess?.lca.clade).toBe("Carnivora");
      expect(guess?.lca.rank).toBe("order");
      expect(guess?.lca.depth).toBe(3);
    });

    it("should throw error if game is not active", () => {
      const store = useGameStore();
      expect(() => store.processGuess(wolf)).toThrow("Game is not active");
    });

    it("should throw error if no target is set", () => {
      const store = useGameStore();
      store.status = "playing";
      expect(() => store.processGuess(wolf)).toThrow("No target animal set");
    });

    it("should throw error if duplicate guess", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);
      expect(() => store.processGuess(wolf)).toThrow("Animal already guessed");
    });

    it("should throw error if no guesses remaining", () => {
      const store = useGameStore();
      store.startGame(tiger, 1);
      store.processGuess(wolf);
      // After processing last guess, game status changes to "lost"
      // So next guess attempt should fail with "Game is not active"
      expect(() => store.processGuess(lion)).toThrow("Game is not active");
    });

    it("should win game on correct guess", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(tiger);

      expect(store.status).toBe("won");
      expect(store.isWon).toBe(true);
      expect(store.hasEnded).toBe(true);
    });

    it("should lose game when guesses run out", () => {
      const store = useGameStore();
      store.startGame(tiger, 2);
      store.processGuess(wolf);
      store.processGuess(lion);

      expect(store.status).toBe("lost");
      expect(store.isLost).toBe(true);
      expect(store.hasEnded).toBe(true);
    });
  });

  describe("tree building", () => {
    it("should add guess node to tree", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);

      const guessNode = store.treeData?.nodes.find(n => n.id === `animal-${wolf.id}`);
      expect(guessNode).toBeDefined();
      expect(guessNode?.isGuess).toBe(true);
      expect(guessNode?.data?.id).toBe(wolf.id);
    });

    it("should add LCA node to tree", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);

      const lcaNode = store.treeData?.nodes.find(n => n.name === "Carnivora");
      expect(lcaNode).toBeDefined();
      expect(lcaNode?.isLCA).toBe(true);
      expect(lcaNode?.type).toBe("clade");
    });

    it("should link guess node to LCA node", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);

      const lcaNode = store.treeData?.nodes.find(n => n.name === "Carnivora");
      const guessNode = store.treeData?.nodes.find(n => n.id === `animal-${wolf.id}`);

      expect(lcaNode?.children).toContain(guessNode);
      expect(guessNode?.parent).toBe(lcaNode);
    });

    it("should reuse existing LCA node for multiple guesses", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);
      store.processGuess(bear);

      // Both wolf and bear share Carnivora as LCA with tiger
      const lcaNodes = store.treeData?.nodes.filter(n => n.name === "Carnivora" && n.isLCA);
      expect(lcaNodes).toHaveLength(1);

      // Both guesses should be children of the same LCA
      // (Note: target is also a child, so total children >= 2)
      const lcaNode = lcaNodes?.[0];
      expect(lcaNode?.children.length).toBeGreaterThanOrEqual(2);
      expect(lcaNode?.children.some(c => c.id === `animal-${wolf.id}`)).toBe(true);
      expect(lcaNode?.children.some(c => c.id === `animal-${bear.id}`)).toBe(true);

      // Verify both guesses are present
      const guessChildren = lcaNode?.children.filter(c => c.isGuess);
      expect(guessChildren?.length).toBe(2);
    });

    it("should handle guesses with different LCAs", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf); // LCA: Carnivora
      store.processGuess(eagle); // LCA: Chordata

      const carnivoraNode = store.treeData?.nodes.find(n => n.name === "Carnivora" && n.isLCA);
      const chordataNode = store.treeData?.nodes.find(n => n.name === "Chordata" && n.isLCA);

      expect(carnivoraNode).toBeDefined();
      expect(chordataNode).toBeDefined();
      expect(carnivoraNode).not.toBe(chordataNode);
    });

    it("should update guesses list in tree data", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);
      store.processGuess(lion);

      expect(store.treeData?.guesses).toHaveLength(2);
      expect(store.treeData?.guesses.every(g => g.isGuess)).toBe(true);
    });

    it("should maintain tree structure integrity", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(wolf);
      store.processGuess(lion);
      store.processGuess(eagle);

      // All nodes should have valid structure
      for (const node of store.treeData?.nodes || []) {
        if (node.parent) {
          expect(node.parent.children).toContain(node);
        }
        for (const child of node.children) {
          expect(child.parent).toBe(node);
        }
      }
    });
  });

  describe("getters", () => {
    it("should calculate guesses remaining correctly", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);
      expect(store.guessesRemaining).toBe(6);

      store.processGuess(wolf);
      expect(store.guessesRemaining).toBe(5);

      store.processGuess(lion);
      expect(store.guessesRemaining).toBe(4);
    });

    it("should return correct game status flags", () => {
      const store = useGameStore();
      expect(store.isPlaying).toBe(false);
      expect(store.hasEnded).toBe(false);

      store.startGame(tiger, 6);
      expect(store.isPlaying).toBe(true);
      expect(store.hasEnded).toBe(false);

      store.processGuess(tiger);
      expect(store.isPlaying).toBe(false);
      expect(store.isWon).toBe(true);
      expect(store.hasEnded).toBe(true);
    });
  });

  describe("performance", () => {
    it("should process guess within 1 second", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);

      const startTime = Date.now();
      store.processGuess(wolf);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it("should handle multiple guesses efficiently", () => {
      const store = useGameStore();
      store.startGame(tiger, 6);

      const startTime = Date.now();
      store.processGuess(wolf);
      store.processGuess(lion);
      store.processGuess(eagle);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("edge cases", () => {
    it("should handle animal with empty taxonomy", () => {
      const animalNoTaxonomy: Animal = {
        id: "10",
        name: "Unknown Animal",
        scientificName: "Unknown",
        taxonomy: [],
      };

      const store = useGameStore();
      store.startGame(animalNoTaxonomy, 6);

      expect(store.treeData).not.toBeNull();
      expect(store.treeData?.target).toBeDefined();
    });

    it("should handle guess with empty taxonomy", () => {
      const animalNoTaxonomy: Animal = {
        id: "10",
        name: "Unknown Animal",
        scientificName: "Unknown",
        taxonomy: [],
      };

      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(animalNoTaxonomy);

      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.lca.clade).toBe("Life");
    });

    it("should handle identical animals (same species)", () => {
      const tiger2: Animal = {
        ...tiger,
        id: "1-dup",
      };

      const store = useGameStore();
      store.startGame(tiger, 6);
      store.processGuess(tiger2);

      // LCA should be the species itself
      expect(store.guesses[0]?.lca.clade).toBe("Panthera tigris");
    });
  });
});
