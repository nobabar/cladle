import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { getGameStore } from "#test/helpers/gameStore";
import {
  beginSealedTestGame,
  registerTestAnimals,
  resetMockGameApi,
} from "#test/helpers/mockGameApiClient";
import { HINT_GUESS_COST } from "~/types/hint";
import type { Animal } from "~/types/animal";
import type { TreeNode } from "~/types/tree";
import {
  bear as bearFixture,
  lineageFromNames,
  lion as lionFixture,
  TIGER_LINEAGE,
  tiger as tigerFixture,
  wolf as wolfFixture,
} from "#test/helpers/animalFixtures";

vi.mock("~/services/gameApiClient", async () => {
  const { createMockGameApiClientExports } = await import("#test/helpers/mockGameApiClient");
  return createMockGameApiClientExports();
});

describe("gameStore", () => {
  const tiger = tigerFixture();
  const wolf = wolfFixture();
  const lion = lionFixture();

  const eagle: Animal = {
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

  const bear = bearFixture();

  const shoebill: Animal = {
    id: "100",
    name: "Shoebill",
    scientificName: "Balaeniceps rex",
    lineage: lineageFromNames(
      [
        "Animalia",
        "Chordata",
        "Aves",
        "Pelecaniformes",
        "Balaenicipitidae",
        "Balaeniceps",
        "Balaeniceps rex",
      ],
      {
        ids: ["48460", "1", "aves", "pelecaniformes", "balaenicipitidae", "balaeniceps", "balaeniceps-rex"],
      },
    ),
  };

  const greatBlueHeron: Animal = {
    id: "101",
    name: "Great Blue Heron",
    scientificName: "Ardea herodias",
    lineage: lineageFromNames(
      [
        "Animalia",
        "Chordata",
        "Aves",
        "Pelecaniformes",
        "Ardeidae",
        "Ardea",
        "Ardea herodias",
      ],
      {
        ids: ["48460", "1", "aves", "pelecaniformes", "ardeidae", "ardea", "ardea-herodias"],
      },
    ),
  };

  const greyHeron: Animal = {
    id: "102",
    name: "Grey Heron",
    scientificName: "Ardea cinerea",
    lineage: lineageFromNames(
      [
        "Animalia",
        "Chordata",
        "Aves",
        "Pelecaniformes",
        "Ardeidae",
        "Ardea",
        "Ardea cinerea",
      ],
      {
        ids: ["48460", "1", "aves", "pelecaniformes", "ardeidae", "ardea", "ardea-cinerea"],
      },
    ),
  };

  const greenHeron: Animal = {
    id: "103",
    name: "Green Heron",
    scientificName: "Butorides virescens",
    lineage: lineageFromNames(
      [
        "Animalia",
        "Chordata",
        "Aves",
        "Pelecaniformes",
        "Ardeidae",
        "Butorides",
        "Butorides virescens",
      ],
      {
        ids: ["48460", "1", "aves", "pelecaniformes", "ardeidae", "butorides", "butorides-virescens"],
      },
    ),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    resetMockGameApi();
    registerTestAnimals(tiger, wolf, lion, eagle, bear, shoebill, greatBlueHeron, greyHeron, greenHeron);
  });

  describe("loading and error state management", () => {
    it("should initialize with loading and error states as false/null", () => {
      const store = getGameStore();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.isRenderingTree).toBe(false);
    });

    it("should set loading state", () => {
      const store = getGameStore();
      store.setLoading(true);
      expect(store.isLoading).toBe(true);
      store.setLoading(false);
      expect(store.isLoading).toBe(false);
    });

    it("should set tree rendering state", () => {
      const store = getGameStore();
      store.setRenderingTree(true);
      expect(store.isRenderingTree).toBe(true);
      store.setRenderingTree(false);
      expect(store.isRenderingTree).toBe(false);
    });

    it("should set and clear error", () => {
      const store = getGameStore();
      const error = {
        message: "Test error",
        code: "TEST_ERROR",
        type: "ui" as const,
      };
      store.setError(error);
      expect(store.error).toEqual(error);
      store.clearError();
      expect(store.error).toBeNull();
    });

    it("should reset loading and error states on resetGame", () => {
      const store = getGameStore();
      store.setLoading(true);
      store.setError({
        message: "Test error",
        code: "TEST_ERROR",
        type: "ui",
      });
      store.setRenderingTree(true);
      store.resetGame();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.isRenderingTree).toBe(false);
    });
  });

  describe("game initialization", () => {
    it("should initialize game with target animal", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, undefined, undefined, true);

      expect(store.target).toEqual(tiger);
      expect(store.status).toBe("playing");
      expect(store.maxGuesses).toBe(6);
      expect(store.guesses).toHaveLength(0);
      expect(store.treeData).not.toBeNull();
    });

    it("should initialize tree with root and target", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, undefined, undefined, true);

      expect(store.treeData).not.toBeNull();
      expect(store.treeData?.root).toBeDefined();
      expect(store.treeData?.target).toBeDefined();
      expect(store.treeData?.target.data?.id).toBe(tiger.id);
      expect(store.treeData?.target.isTarget).toBe(true);
    });

    it("should build simple tree with only Animalia and target", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, undefined, undefined, true);

      const root = store.treeData?.root;
      expect(root).toBeDefined();
      expect(root?.name).toBe("Animalia"); // Root should be Animalia, not Life
      expect(root?.children.length).toBe(1); // Should only have target as child

      // Verify target is direct child of Animalia
      const target = root?.children.find((c: TreeNode) => c.isTarget);
      expect(target).toBeDefined();
      expect(target?.data?.id).toBe(tiger.id);
    });

    it("should reset game state", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);
      store.resetGame();

      expect(store.status).toBe("idle");
      expect(store.target).toBeNull();
      expect(store.guesses).toHaveLength(0);
      expect(store.treeData).toBeNull();
    });
  });

  describe("guess processing", () => {
    it("should process a valid guess", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);

      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.animal.id).toBe(wolf.id);
      expect(store.guesses[0]?.lca).toBeDefined();
      expect(store.guesses[0]?.lca.clade).toBe("Carnivora");
    });

    it("should calculate LCA between guess and target", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);

      const guess = store.guesses[0];
      expect(guess?.lca.clade).toBe("Carnivora");
      expect(guess?.lca.rank).toBe("order");
      expect(guess?.lca.depth).toBe(TIGER_LINEAGE.findIndex(t => t.name === "Carnivora"));
    });

    it("should throw error if game is not active", async () => {
      const store = getGameStore();
      await expect(store.processGuess(wolf)).rejects.toThrow("Game is not active");
    });

    it("should throw error if no sealed game token", async () => {
      const store = getGameStore();
      store.status = "playing";
      await expect(store.processGuess(wolf)).rejects.toThrow("No sealed game token");
    });

    it("should throw error if duplicate guess", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);
      await expect(store.processGuess(wolf)).rejects.toThrow("Animal already guessed");
    });

    it("should throw error if no guesses remaining", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 1);
      await store.processGuess(wolf);
      // After processing last guess, game status changes to "lost"
      // So next guess attempt should fail with "Game is not active"
      await expect(store.processGuess(lion)).rejects.toThrow("Game is not active");
    });

    it("should win game on correct guess", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(tiger);

      expect(store.status).toBe("won");
      expect(store.isWon).toBe(true);
      expect(store.hasEnded).toBe(true);
      expect(store.target?.id).toBe(tiger.id);
    });

    it("should lose game when guesses run out", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 2);
      await store.processGuess(wolf);
      await store.processGuess(lion);

      expect(store.status).toBe("lost");
      expect(store.isLost).toBe(true);
      expect(store.hasEnded).toBe(true);
      expect(store.target?.id).toBe(tiger.id);
    });

    it("leaves state unchanged when the guess API rejects", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      const tokenBefore = store.gameToken;
      const nodeCountBefore = store.nodeMap.size;

      const unknownAnimal: Animal = { ...eagle, id: "not-registered" };
      await expect(store.processGuess(unknownAnimal)).rejects.toThrow("Unknown animal");

      expect(store.guesses).toHaveLength(0);
      expect(store.guessesRemaining).toBe(6);
      expect(store.gameToken).toBe(tokenBefore);
      expect(store.nodeMap.size).toBe(nodeCountBefore);
      expect(store.status).toBe("playing");
    });

    it("stores the rotated token returned by each guess", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6, "daily", [wolf, lion]);
      const first = store.gameToken;
      await store.processGuess(wolf);
      const second = store.gameToken;
      await store.processGuess(lion);

      expect(second).not.toBe(first);
      expect(store.gameToken).not.toBe(second);
      expect(store.guesses).toHaveLength(2);
    });

    it("wins a sealed baby-mode game and reveals the target", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, lion, 20, "baby", [bear]);
      await store.processGuess(bear);
      expect(store.status).toBe("playing");
      expect(store.target).toBeNull();

      await store.processGuess(lion);
      expect(store.status).toBe("won");
      expect(store.target?.id).toBe(lion.id);
    });

    it("rejects a non-baby organism in baby mode without recording it", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, lion, 20, "baby", [wolf]);

      await expect(store.processGuess(wolf)).rejects.toThrow("Animal not in Baby Mode set");
      expect(store.guesses).toHaveLength(0);
    });
  });

  describe("tree building", () => {
    it("should add guess node to tree", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);

      const guessNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${wolf.id}`);
      expect(guessNode).toBeDefined();
      expect(guessNode?.isGuess).toBe(true);
      expect(guessNode?.data?.id).toBe(wolf.id);
    });

    it("should add LCA node to tree", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);

      const lcaNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Carnivora");
      expect(lcaNode).toBeDefined();
      expect(lcaNode?.isLCA).toBe(true);
      expect(lcaNode?.type).toBe("clade");
    });

    it("should link guess node under path-fill clade beneath the LCA", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);

      const lcaNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Carnivora");
      const pathFillNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Canidae");
      const guessNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${wolf.id}`);

      expect(pathFillNode).toBeDefined();
      expect(pathFillNode?.parent).toBe(lcaNode);
      expect(guessNode?.parent).toBe(pathFillNode);
      expect(lcaNode?.children).toContain(pathFillNode);
    });

    it("should move target animal under LCA node when guess is made", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);

      // Initially, target should be direct child of Animalia
      expect(store.treeData?.root.children).toContain(store.treeData?.target);
      expect(store.treeData?.target?.parent).toBe(store.treeData?.root);

      // Process guess (wolf - LCA with tiger is Carnivora)
      await store.processGuess(wolf);

      const lcaNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Carnivora");
      const targetNode = store.treeData?.target;

      // Target should now be under LCA node, not directly under root
      expect(lcaNode?.children).toContain(targetNode);
      expect(targetNode?.parent).toBe(lcaNode);
      expect(store.treeData?.root.children).not.toContain(targetNode);
    });

    it("should reuse existing LCA node for multiple guesses", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);
      await store.processGuess(bear);

      // Both wolf and bear share Carnivora as LCA with tiger
      const lcaNodes = store.treeData?.nodes.filter((n: TreeNode) => n.name === "Carnivora" && n.isLCA);
      expect(lcaNodes).toHaveLength(1);

      const lcaNode = lcaNodes?.[0];
      const wolfNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${wolf.id}`);
      const bearNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${bear.id}`);

      // Path-fill places each guess under its next clade (Canidae / Ursidae) beneath Carnivora
      expect(wolfNode?.parent?.name).toBe("Canidae");
      expect(bearNode?.parent?.name).toBe("Ursidae");
      expect(wolfNode?.parent?.parent).toBe(lcaNode);
      expect(bearNode?.parent?.parent).toBe(lcaNode);
    });

    it("should handle guesses with different LCAs", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf); // LCA: Carnivora
      await store.processGuess(eagle); // LCA: Chordata

      const carnivoraNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Carnivora" && n.isLCA);
      const chordataNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Chordata" && n.isLCA);

      expect(carnivoraNode).toBeDefined();
      expect(chordataNode).toBeDefined();
      expect(carnivoraNode).not.toBe(chordataNode);
    });

    it("should update guesses list in tree data", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);
      await store.processGuess(lion);

      expect(store.treeData?.guesses).toHaveLength(2);
      expect(store.treeData?.guesses.every((g: TreeNode) => g.isGuess)).toBe(true);
    });

    it("should maintain tree structure integrity", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.processGuess(wolf);
      await store.processGuess(lion);
      await store.processGuess(eagle);

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

    it("places guess-guess LCAs under the correct taxonomic parent (not a broader sibling)", async () => {
      const easternBeardedDragon: Animal = {
        id: "31419",
        name: "Agame barbu de l'Est",
        scientificName: "Pogona barbata",
        lineage: lineageFromNames(
          ["Animalia", "Chordata", "Reptilia", "Squamata", "Agamidae", "Pogona", "Pogona barbata"],
          { ids: ["48460", "1", "reptilia", "squamata", "agamidae", "pogona", "pogona-barbata"] },
        ),
      };

      const californiaSeaLion: Animal = {
        id: "41740",
        name: "California Sea Lion",
        scientificName: "Zalophus californianus",
        lineage: lineageFromNames(
          [
            "Animalia",
            "Chordata",
            "Mammalia",
            "Carnivora",
            "Otariidae",
            "Zalophus",
            "Zalophus californianus",
          ],
          { ids: ["48460", "1", "2", "3", "otariidae", "zalophus", "zalophus-cal"] },
        ),
      };

      const mountainLion: Animal = {
        id: "42007",
        name: "Mountain Lion",
        scientificName: "Puma concolor",
        lineage: lineageFromNames(
          ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Puma", "Puma concolor"],
          { ids: ["48460", "1", "2", "3", "4", "puma", "puma-concolor"] },
        ),
      };

      const africanLion: Animal = {
        id: "41964",
        name: "Lion",
        scientificName: "Panthera leo",
        lineage: lineageFromNames(
          ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera leo"],
          { ids: ["48460", "1", "2", "3", "4", "5", "10"] },
        ),
      };

      const southernLion: Animal = {
        id: "557401",
        name: "Southern Lion",
        scientificName: "Neofelis diardi",
        lineage: lineageFromNames(
          [
            "Animalia",
            "Chordata",
            "Mammalia",
            "Carnivora",
            "Felidae",
            "Neofelis",
            "Neofelis diardi",
          ],
          { ids: ["48460", "1", "2", "3", "4", "neofelis", "neofelis-diardi"] },
        ),
      };

      const maroonLeggedLionFly: Animal = {
        id: "55773",
        name: "Maroon-legged Lion Fly",
        scientificName: "Neoscatella grisea",
        lineage: lineageFromNames(
          [
            "Animalia",
            "Arthropoda",
            "Insecta",
            "Diptera",
            "Scatopsidae",
            "Neoscatella",
            "Neoscatella grisea",
          ],
          { ids: ["48460", "arthropoda", "insecta", "diptera", "scatopsidae", "neoscatella", "neoscatella-grisea"] },
        ),
      };

      const store = getGameStore();
      beginSealedTestGame(store, easternBeardedDragon, 20, "daily", [
        californiaSeaLion,
        africanLion,
        mountainLion,
        southernLion,
        maroonLeggedLionFly,
      ]);

      await store.processGuess(californiaSeaLion);
      await store.processGuess(africanLion);
      await store.processGuess(mountainLion);
      await store.processGuess(southernLion);
      await store.processGuess(maroonLeggedLionFly);

      const chordataNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Chordata" && n.isLCA);
      const mammaliaNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Mammalia" && n.isLCA);
      const carnivoraNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Carnivora" && n.isLCA);
      const felidaeNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Felidae" && n.isLCA);
      const targetNode = store.treeData?.target;

      expect(chordataNode).toBeDefined();
      expect(mammaliaNode).toBeDefined();
      expect(carnivoraNode).toBeDefined();
      expect(felidaeNode).toBeDefined();

      expect(targetNode?.parent?.id).toBe(chordataNode?.id);
      expect(felidaeNode?.parent?.id).toBe(carnivoraNode?.id);
      // Path-fill inserts Mammalia under Chordata; pairwise Carnivora nests under it
      expect(mammaliaNode?.parent?.id).toBe(chordataNode?.id);
      expect(carnivoraNode?.parent?.id).toBe(mammaliaNode?.id);
    });

    it("keeps deeper guess clades connected when a broader clade is added later", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, shoebill, 10);

      // First create Ardea from two Ardea species guesses
      await store.processGuess(greatBlueHeron);
      await store.processGuess(greyHeron);

      // Then add a non-Ardea heron, which introduces Ardeidae
      await store.processGuess(greenHeron);

      const ardeaNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Ardea" && n.isLCA);
      const ardeidaeNode = store.treeData?.nodes.find((n: TreeNode) => n.name === "Ardeidae" && n.isLCA);

      const greatBlueNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${greatBlueHeron.id}`);
      const greyNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${greyHeron.id}`);
      const greenNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${greenHeron.id}`);

      expect(ardeaNode).toBeDefined();
      expect(ardeidaeNode).toBeDefined();

      // Ardea should keep its species instead of becoming orphaned
      expect(ardeaNode?.children.some((c: TreeNode) => c.id === greatBlueNode?.id)).toBe(true);
      expect(ardeaNode?.children.some((c: TreeNode) => c.id === greyNode?.id)).toBe(true);

      // The newly added non-Ardea species should be under Ardeidae
      expect(greenNode?.parent?.id).toBe(ardeidaeNode?.id);
    });

    describe("path filling (guess-side intermediate clade)", () => {
      const birdMystery: Animal = {
        id: "bird-mystery",
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
            ids: [
              "1",
              "2",
              "355675",
              "aves",
              "accip",
              "accip-fam",
              "haliaeetus",
              "haliaeetus-leuco",
            ],
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

      it("adds Mammalia under Vertebrata and keeps ??? off Mammalia for a mammal guess vs bird", async () => {
        const store = getGameStore();
        beginSealedTestGame(store, birdMystery, 10, "daily", [lion]);
        await store.processGuess(lion);

        const vertebrata = store.treeData?.nodes.find(
          (n: TreeNode) => n.name === "Vertebrata" && n.isLCA,
        );
        const mammalia = store.treeData?.nodes.find(
          (n: TreeNode) => n.name === "Mammalia" && n.isLCA,
        );
        const lionNode = store.treeData?.nodes.find(
          (n: TreeNode) => n.id === `animal-${lion.id}`,
        );
        const targetNode = store.treeData?.target;

        expect(vertebrata).toBeDefined();
        expect(mammalia).toBeDefined();
        expect(mammalia?.parent).toBe(vertebrata);
        expect(lionNode?.parent).toBe(mammalia);
        expect(targetNode?.parent).toBe(vertebrata);
        expect(mammalia?.children).not.toContain(targetNode);
      });

      it("attaches the animal directly under the LCA when no intermediate exists", async () => {
        const store = getGameStore();
        beginSealedTestGame(store, tiger, 10);
        await store.processGuess(lion);

        // Lion∩Tiger LCA is Panthera; next step is species → no path-fill
        const panthera = store.treeData?.nodes.find(
          (n: TreeNode) => n.name === "Panthera" && n.isLCA,
        );
        const lionNode = store.treeData?.nodes.find(
          (n: TreeNode) => n.id === `animal-${lion.id}`,
        );

        expect(panthera).toBeDefined();
        expect(lionNode?.parent).toBe(panthera);
        expect(
          store.treeData?.nodes.some(
            (n: TreeNode) => n.name === "Panthera leo" && n.type === "clade",
          ),
        ).toBe(false);
      });

      it("reuses a single path-fill clade for a second mammal under the same LCA", async () => {
        const store = getGameStore();
        beginSealedTestGame(store, birdMystery, 10, "daily", [lion, tiger]);
        await store.processGuess(lion);
        await store.processGuess(tiger);

        const mammaliaNodes = store.treeData?.nodes.filter(
          (n: TreeNode) => n.name === "Mammalia" && n.isLCA,
        );
        const lionNode = store.treeData?.nodes.find(
          (n: TreeNode) => n.id === `animal-${lion.id}`,
        );
        const tigerNode = store.treeData?.nodes.find(
          (n: TreeNode) => n.id === `animal-${tiger.id}`,
        );

        expect(mammaliaNodes).toHaveLength(1);
        // Pairwise may nest lions under Panthera beneath Mammalia; both remain under the reused Mammalia
        expect(lionNode?.parent?.name === "Mammalia"
          || lionNode?.parent?.parent?.name === "Mammalia").toBe(true);
        expect(tigerNode?.parent?.name === "Mammalia"
          || tigerNode?.parent?.parent?.name === "Mammalia").toBe(true);
      });

      it("skips path filling in baby mode", async () => {
        const store = getGameStore();
        beginSealedTestGame(store, birdMystery, 10, "baby", [lion]);
        await store.processGuess(lion);

        const mammalia = store.treeData?.nodes.find(
          (n: TreeNode) => n.name === "Mammalia" && n.isLCA,
        );
        const lionNode = store.treeData?.nodes.find(
          (n: TreeNode) => n.id === `animal-${lion.id}`,
        );

        // Baby mode skips guess-side path-fill (Mammalia would appear otherwise)
        expect(mammalia).toBeUndefined();
        expect(lionNode?.parent?.isLCA).toBe(true);
        expect(lionNode?.parent?.name).not.toBe("Mammalia");
      });

      it("reproduces path-fill when replaying guesses through updateTreeWithGuess", async () => {
        setActivePinia(createPinia());
        const live = getGameStore();
        beginSealedTestGame(live, birdMystery, 10, "daily", [lion, wolf]);
        await live.processGuess(lion);
        await live.processGuess(wolf);

        const liveMammaliaParent = live.treeData?.nodes.find(
          (n: TreeNode) => n.name === "Mammalia" && n.isLCA,
        )?.parent?.name;
        const liveLionParent = live.treeData?.nodes.find(
          (n: TreeNode) => n.id === `animal-${lion.id}`,
        )?.parent?.name;
        const liveWolfParent = live.treeData?.nodes.find(
          (n: TreeNode) => n.id === `animal-${wolf.id}`,
        )?.parent?.name;
        const animals = live.guesses.map((g: { animal: Animal }) => g.animal);

        setActivePinia(createPinia());
        const replay = getGameStore();
        beginSealedTestGame(replay, birdMystery, 10, "daily", animals);
        for (const animal of animals) {
          await replay.processGuess(animal);
        }

        const replayMammalia = replay.treeData?.nodes.find(
          (n: TreeNode) => n.name === "Mammalia" && n.isLCA,
        );
        expect(replayMammalia).toBeDefined();
        expect(replayMammalia?.parent?.name).toBe(liveMammaliaParent);
        expect(
          replay.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${lion.id}`)?.parent?.name,
        ).toBe(liveLionParent);
        expect(
          replay.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${wolf.id}`)?.parent?.name,
        ).toBe(liveWolfParent);
      });
    });
  });

  describe("getters", () => {
    it("should calculate guesses remaining correctly", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      expect(store.guessesRemaining).toBe(6);

      await store.processGuess(wolf);
      expect(store.guessesRemaining).toBe(5);

      await store.processGuess(lion);
      expect(store.guessesRemaining).toBe(4);
    });

    it("should return correct game status flags", async () => {
      const store = getGameStore();
      expect(store.isPlaying).toBe(false);
      expect(store.hasEnded).toBe(false);

      beginSealedTestGame(store, tiger, 6);
      expect(store.isPlaying).toBe(true);
      expect(store.hasEnded).toBe(false);

      await store.processGuess(tiger);
      expect(store.isPlaying).toBe(false);
      expect(store.isWon).toBe(true);
      expect(store.hasEnded).toBe(true);
    });
  });

  describe("performance", () => {
    it("should process guess within 1 second", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);

      const startTime = Date.now();
      await store.processGuess(wolf);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it("should handle multiple guesses efficiently", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);

      const startTime = Date.now();
      await store.processGuess(wolf);
      await store.processGuess(lion);
      await store.processGuess(eagle);
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
        lineage: [],
      };

      const store = getGameStore();
      store.initializeGame(animalNoTaxonomy, 6, undefined, undefined, true);

      expect(store.treeData).not.toBeNull();
      expect(store.treeData?.target).toBeDefined();
    });

    it("should handle guess with empty taxonomy", async () => {
      const animalNoTaxonomy: Animal = {
        id: "10",
        name: "Unknown Animal",
        scientificName: "Unknown",
        lineage: [],
      };

      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6, "daily", [animalNoTaxonomy]);
      await store.processGuess(animalNoTaxonomy);

      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.lca.clade).toBe("Life");
    });

    it("should handle identical animals (same species)", async () => {
      const tiger2: Animal = {
        ...tiger,
        id: "1-dup",
      };

      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6, "daily", [tiger2]);
      await store.processGuess(tiger2);

      // LCA should be the species itself
      expect(store.guesses[0]?.lca.clade).toBe("Panthera tigris");
    });
  });

  describe("action naming conventions", () => {
    it("should initialize game with initializeGame method", () => {
      const store = getGameStore();
      const puzzleDate = "2026-01-11";
      store.initializeGame(tiger, 6, puzzleDate);

      expect(store.target).toEqual(tiger);
      expect(store.status).toBe("playing");
      expect(store.maxGuesses).toBe(6);
      expect(store.puzzleDate).toBe(puzzleDate);
      expect(store.treeData).not.toBeNull();
    });

    it("should set puzzle date to current date if not provided", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6);

      expect(store.puzzleDate).toBeTruthy();
      expect(store.puzzleDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should set target animal with setTargetAnimal", () => {
      const store = getGameStore();
      store.setTargetAnimal(tiger);

      expect(store.target).toEqual(tiger);
    });

    it("should apply localized target and update tree leaf", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, undefined, undefined, true);
      const localized = {
        ...tiger,
        name: "Tigre",
        description: "<p>Le tigre est un grand felin.</p>",
        wikipediaUrl: "https://fr.wikipedia.org/wiki/Tigre",
      };

      store.applyLocalizedTarget(localized);

      expect(store.target?.name).toBe("Tigre");
      expect(store.target?.description).toContain("tigre");
      expect(store.treeData?.target?.name).toBe("Tigre");
      expect(store.treeData?.target?.data).toEqual(localized);
    });

    it("should enrich baby mode target media without replacing beginner name", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 8, undefined, "baby", true);
      const localized = {
        ...tiger,
        name: "Tigre",
        imageUrl: "https://example.com/tiger.jpg",
        description: "<p>Le tigre est un grand felin.</p>",
        wikipediaUrl: "https://fr.wikipedia.org/wiki/Tigre",
      };

      store.applyLocalizedTarget(localized);

      expect(store.target?.name).toBe(tiger.name);
      expect(store.target?.imageUrl).toBe("https://example.com/tiger.jpg");
      expect(store.target?.description).toContain("tigre");
      expect(store.target?.wikipediaUrl).toContain("wikipedia");
      expect(store.treeData?.target?.name).toBe(tiger.name);
      expect(store.treeData?.target?.data?.imageUrl).toBe("https://example.com/tiger.jpg");
    });

    it("should keep baby bundle media when localized fields are empty strings", () => {
      const store = getGameStore();
      const bundled = {
        ...tiger,
        imageUrl: "https://example.com/bundle-tiger.jpg",
        description: "<p>Bundle copy.</p>",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Panthera%20tigris",
      };
      store.initializeGame(bundled, 8, undefined, "baby", true);

      store.applyLocalizedTarget({
        ...tiger,
        name: "Tigre",
        imageUrl: "",
        description: "   ",
        wikipediaUrl: "",
      });

      expect(store.target?.imageUrl).toBe("https://example.com/bundle-tiger.jpg");
      expect(store.target?.description).toBe("<p>Bundle copy.</p>");
      expect(store.target?.wikipediaUrl).toBe("https://en.wikipedia.org/wiki/Panthera%20tigris");
    });

    it("should clear baby description ahead of a non-English locale sync", () => {
      const store = getGameStore();
      store.initializeGame({
        ...tiger,
        description: "<p>English flash.</p>",
      }, 8, undefined, "baby", true);

      store.clearTargetDescriptionForLocaleSync();

      expect(store.target?.description).toBeUndefined();
      expect(store.treeData?.target?.data?.description).toBeUndefined();
    });

    it("should ignore applyLocalizedTarget when id does not match", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, undefined, undefined, true);
      store.applyLocalizedTarget({ ...wolf, id: wolf.id });

      expect(store.target?.name).toBe(tiger.name);
    });

    it("should add guess with addGuess method", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);
      await store.addGuess(wolf);

      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.animal.id).toBe(wolf.id);
    });

    it("should set completion status with setCompletionStatus", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, undefined, undefined, true);
      store.setCompletionStatus("won");

      expect(store.status).toBe("won");
      expect(store.completionStatus).toBe("won");
    });

    it("should update tree state with updateTreeState", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, undefined, undefined, true);
      const originalTree = store.treeData;

      // Create a new tree structure
      const newTree = {
        ...originalTree!,
        nodes: [...(originalTree?.nodes || [])],
      };

      store.updateTreeState(newTree);

      expect(store.treeData).toStrictEqual(newTree);
      expect(store.nodeMap.size).toBeGreaterThan(0);
    });
  });

  describe("additional getters", () => {
    it("should check if animal has been guessed with hasGuessed", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);

      expect(store.hasGuessed(wolf)).toBe(false);
      await store.processGuess(wolf);
      expect(store.hasGuessed(wolf)).toBe(true);
      expect(store.hasGuessed(lion)).toBe(false);
    });

    it("should check if game is complete with isComplete", async () => {
      const store = getGameStore();
      expect(store.isComplete).toBe(false);

      beginSealedTestGame(store, tiger, 6);
      expect(store.isComplete).toBe(false);

      await store.processGuess(tiger);
      expect(store.isComplete).toBe(true);
    });

    it("should check if can guess with canGuess", async () => {
      const store = getGameStore();
      expect(store.canGuess).toBe(false);

      beginSealedTestGame(store, tiger, 6);
      expect(store.canGuess).toBe(true);

      await store.processGuess(tiger);
      expect(store.canGuess).toBe(false);
    });

    it("should get guess count with guessCount", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6);

      expect(store.guessCount).toBe(0);
      await store.processGuess(wolf);
      expect(store.guessCount).toBe(1);
      await store.processGuess(lion);
      expect(store.guessCount).toBe(2);
    });

    it("should get completion status with completionStatus", () => {
      const store = getGameStore();
      expect(store.completionStatus).toBe("playing");

      beginSealedTestGame(store, tiger, 6);
      expect(store.completionStatus).toBe("playing");

      store.setCompletionStatus("won");
      expect(store.completionStatus).toBe("won");

      store.setCompletionStatus("lost");
      expect(store.completionStatus).toBe("lost");
    });
  });

  describe("puzzle date tracking", () => {
    it("should initialize with empty puzzle date", () => {
      const store = getGameStore();
      expect(store.puzzleDate).toBe("");
    });

    it("should set puzzle date when initializing game", () => {
      const store = getGameStore();
      const puzzleDate = "2026-01-11";
      store.initializeGame(tiger, 6, puzzleDate);

      expect(store.puzzleDate).toBe(puzzleDate);
    });

    it("should reset puzzle date when resetting game", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, "2026-01-11");
      expect(store.puzzleDate).toBe("2026-01-11");

      store.resetGame();
      expect(store.puzzleDate).toBe("");
    });
  });

  describe("midnight reset (daily puzzle)", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shouldResetForNewDay returns false when not in daily mode", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, "2026-02-10");
      store.gameMode = "free-play";
      store.puzzleDate = "2026-02-10";
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 12, 0, 0)));
      expect(store.shouldResetForNewDay()).toBe(false);
    });

    it("shouldResetForNewDay returns false when puzzle date is today UTC", () => {
      const store = getGameStore();
      store.gameMode = "daily";
      store.puzzleDate = "2026-02-11";
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 12, 0, 0)));
      expect(store.shouldResetForNewDay()).toBe(false);
    });

    it("shouldResetForNewDay returns true when midnight UTC has passed", () => {
      const store = getGameStore();
      store.gameMode = "daily";
      store.puzzleDate = "2026-02-10";
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2026, 1, 11, 0, 1, 0)));
      expect(store.shouldResetForNewDay()).toBe(true);
    });

    it("resetForNewDay clears daily state and puzzle date", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, "2026-02-10", "daily");
      expect(store.gameMode).toBe("daily");
      expect(store.puzzleDate).toBe("2026-02-10");
      expect(store.target).not.toBeNull();

      store.resetForNewDay();

      expect(store.status).toBe("idle");
      expect(store.target).toBeNull();
      expect(store.guesses).toHaveLength(0);
      expect(store.puzzleDate).toBe("");
      expect(store.dailyState).toBeNull();
    });

    it("resetForNewDay is no-op when not in daily mode", () => {
      const store = getGameStore();
      store.initializeGame(tiger, 6, "", "free-play");
      store.gameMode = "free-play";
      store.resetForNewDay();
      expect(store.target).not.toBeNull();
    });
  });

  describe("restoreModeState (persisted snapshots)", () => {
    it("resets to safe defaults when daily snapshot is missing", () => {
      const store = getGameStore();
      store.gameMode = "daily";
      store.dailyState = null;
      store.restoreModeState("daily");
      expect(store.status).toBe("idle");
      expect(store.target).toBeNull();
      expect(store.guesses).toHaveLength(0);
      expect(store.treeData).toBeNull();
      expect(store.nodeMap.size).toBe(0);
      expect(store.puzzleDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("resets to safe defaults when free-play snapshot is missing", () => {
      const store = getGameStore();
      store.gameMode = "free-play";
      store.freePlayState = null;
      store.restoreModeState("free-play");
      expect(store.status).toBe("idle");
      expect(store.target).toBeNull();
      expect(store.puzzleDate).toBe("");
    });

    it("restores live state from dailyState and rebuilds nodeMap after simulated cold load", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20, "daily", [lion, wolf], "2026-03-20");
      await store.processGuess(lion);
      expect(store.guesses.length).toBeGreaterThan(0);
      store.saveModeState("daily");
      expect(store.dailyState).not.toBeNull();
      const savedToken = store.gameToken;

      store.$patch({
        status: "idle",
        target: null,
        gameToken: null,
        guesses: [],
        treeData: null,
        nodeMap: new Map(),
        cladeMap: new Map(),
      });

      store.restoreModeState("daily");

      expect(store.status).toBe("playing");
      expect(store.target).toBeNull();
      expect(store.gameToken).toBe(savedToken);
      expect(store.puzzleDate).toBe("2026-03-20");
      expect(store.guesses.length).toBeGreaterThan(0);
      expect(store.treeData).not.toBeNull();
      expect(store.nodeMap.size).toBeGreaterThan(0);

      // The restored token must still be accepted by the API.
      await store.processGuess(wolf);
      expect(store.guesses).toHaveLength(2);
    });

    it("restores from freePlayState when mode is free-play", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, wolf, 12, "free-play", [tiger], "");
      await store.processGuess(tiger);
      store.saveModeState("free-play");
      const savedToken = store.gameToken;
      store.$patch({
        status: "idle",
        target: null,
        gameToken: null,
        guesses: [],
        treeData: null,
        nodeMap: new Map(),
        cladeMap: new Map(),
      });
      store.restoreModeState("free-play");
      expect(store.target).toBeNull();
      expect(store.gameToken).toBe(savedToken);
      expect(store.status).toBe("playing");
      expect(store.guesses.length).toBeGreaterThan(0);
    });
  });

  describe("hint mechanics", () => {
    it("starts with empty hints and canRequestHint when playing", () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20);
      expect(store.hints).toHaveLength(0);
      expect(store.hintCount).toBe(0);
      expect(store.canRequestHint).toBe(true);
    });

    it("requestHint reduces guesses remaining by HINT_GUESS_COST", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20);
      await store.requestHint();
      expect(store.hints).toHaveLength(1);
      expect(store.hints[0]!.cost).toBe(HINT_GUESS_COST);
      // Animalia is the visible tree root, so the first paid hint goes one rank deeper.
      expect(store.hints[0]!.revealedClade).toBe("Chordata");
      expect(store.hints[0]!.rank).toBe("phylum");
      expect(store.hints[0]!.depth).toBe(1);
      expect(store.guessesRemaining).toBe(20 - HINT_GUESS_COST);
    });

    it("requestHint reveals Felidae on tree after Wolf guess", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20);
      await store.processGuess(wolf);
      await store.requestHint();
      expect(store.hints[0]!.revealedClade).toBe("Felidae");
      expect(store.cladeMap.has("felidae")).toBe(true);
    });

    it("requestHint throws when no hint available and does not charge", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20);
      await store.processGuess(lion);
      expect(store.hasHintAvailable).toBe(false);
      await expect(store.requestHint()).rejects.toThrow(/no hint available/i);
      expect(store.hints).toHaveLength(0);
      expect(store.guessesRemaining).toBe(19);
    });

    it("requestHint throws when not enough guesses remain and leaves state unchanged", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 2);
      await expect(store.requestHint()).rejects.toThrow(/not enough guesses/i);
      expect(store.hints).toHaveLength(0);
      expect(store.guessesRemaining).toBe(2);
    });

    it("does not allow hint when only HINT_GUESS_COST guesses remain", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, HINT_GUESS_COST);
      expect(store.canRequestHint).toBe(false);
      await expect(store.requestHint()).rejects.toThrow(/not enough guesses/i);
      expect(store.hints).toHaveLength(0);
      expect(store.status).toBe("playing");
    });

    it("requestHint throws when game is not playing", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20);
      await store.processGuess(tiger);
      expect(store.status).toBe("won");
      await expect(store.requestHint()).rejects.toThrow(/not active/i);
      expect(store.hints).toHaveLength(0);
    });

    it("requestHint throws in replay mode", async () => {
      const store = getGameStore();
      store.loadReplayFromHistory({
        puzzleDate: "2026-02-14",
        targetAnimal: tiger,
        completionStatus: "won",
        guesses: [],
        treeData: null,
        completedAt: Date.now(),
      });
      await expect(store.requestHint()).rejects.toThrow(/replay/i);
    });

    it("allows hint when more than HINT_GUESS_COST guesses remain and leaves a buffer", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, HINT_GUESS_COST + 1);
      expect(store.canRequestHint).toBe(true);
      await store.requestHint();
      expect(store.guessesRemaining).toBe(1);
      expect(store.status).toBe("playing");
    });

    it("combines animal guesses and hint costs for guessesRemaining", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 10);
      await store.processGuess(wolf);
      await store.requestHint();
      expect(store.guessesRemaining).toBe(10 - 1 - HINT_GUESS_COST);
    });

    it("saveModeState and restoreModeState preserve hints", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20, "daily", [wolf], "2026-03-20");
      await store.requestHint();
      store.saveModeState("daily");
      const savedToken = store.gameToken;
      store.$patch({
        hints: [],
        status: "idle",
        target: null,
        gameToken: null,
      });
      store.restoreModeState("daily");
      expect(store.hints).toHaveLength(1);
      expect(store.guessesRemaining).toBe(20 - HINT_GUESS_COST);
      expect(store.gameToken).toBe(savedToken);
      expect(store.target).toBeNull();

      // The restored token still carries the hint: the next guess is charged on top of it.
      await store.processGuess(wolf);
      expect(store.guessesRemaining).toBe(20 - HINT_GUESS_COST - 1);
    });
  });

  describe("mode isolation (daily <-> baby <-> free-play)", () => {
    it("preserves daily guesses when switching daily -> baby -> daily", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20, "daily", [lion], "2026-08-29");
      await store.processGuess(lion);
      expect(store.guesses).toHaveLength(1);
      const dailyToken = store.gameToken;

      store.switchGameMode("baby");
      expect(store.guesses).toHaveLength(0);

      store.switchGameMode("daily");
      expect(store.guesses).toHaveLength(1);
      expect(store.target).toBeNull();
      expect(store.gameToken).toBe(dailyToken);
      expect(store.dailyState?.guesses).toHaveLength(1);
    });

    it("keeps baby and free-play snapshots isolated", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20, "daily", [lion], "2026-08-29");
      await store.processGuess(lion);
      store.switchGameMode("baby");
      beginSealedTestGame(store, wolf, 20, "baby", [bear], "2026-08-29");
      await store.processGuess(bear);
      store.switchGameMode("free-play");
      beginSealedTestGame(store, eagle, 20, "free-play", [shoebill], "");
      await store.processGuess(shoebill);

      store.switchGameMode("baby");
      expect(store.target).toBeNull();
      expect(store.gameToken).toBeTruthy();
      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.animal.id).toBe(bear.id);

      store.switchGameMode("daily");
      expect(store.target).toBeNull();
      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.animal.id).toBe(lion.id);

      store.switchGameMode("free-play");
      expect(store.target).toBeNull();
      expect(store.guesses).toHaveLength(1);
      expect(store.guesses[0]?.animal.id).toBe(shoebill.id);
    });

    it("resetBabyForNewDay clears only baby snapshot", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 20, "daily", [], "2026-02-10");
      store.saveModeState("daily");
      beginSealedTestGame(store, wolf, 20, "baby", [lion], "2026-02-10");
      await store.processGuess(lion);

      store.resetBabyForNewDay();

      expect(store.babyModeState).toBeNull();
      expect(store.dailyState).not.toBeNull();
    });
  });

  describe("puzzle history replay", () => {
    it("loadReplayFromHistory sets state from entry and isReplayMode true", () => {
      const store = getGameStore();
      const entry = {
        puzzleDate: "2026-02-14",
        targetAnimal: tiger,
        completionStatus: "won" as const,
        guesses: [],
        treeData: null,
        completedAt: Date.now(),
      };
      store.loadReplayFromHistory(entry);
      expect(store.isReplayMode).toBe(true);
      expect(store.puzzleDate).toBe("2026-02-14");
      expect(store.target?.id).toBe(tiger.id);
      expect(store.status).toBe("won");
      expect(store.guesses).toHaveLength(0);
    });

    it("exitReplay restores daily state and clears isReplayMode", async () => {
      const store = getGameStore();
      beginSealedTestGame(store, tiger, 6, "daily", [lion], "2026-02-15");
      await store.processGuess(lion);
      store.saveModeState("daily");
      const savedToken = store.gameToken;
      const entry = {
        puzzleDate: "2026-02-14",
        targetAnimal: wolf,
        completionStatus: "lost" as const,
        guesses: [],
        treeData: null,
        completedAt: Date.now(),
      };
      store.loadReplayFromHistory(entry);
      expect(store.isReplayMode).toBe(true);
      expect(store.target?.id).toBe(wolf.id);
      store.exitReplay();
      expect(store.isReplayMode).toBe(false);
      expect(store.target).toBeNull();
      expect(store.gameToken).toBe(savedToken);
      expect(store.guesses).toHaveLength(1);
      expect(store.puzzleDate).toBe("2026-02-15");
    });
  });
});
