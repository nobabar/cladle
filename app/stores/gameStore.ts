import { defineStore } from "pinia";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { LCAResult } from "~/utils/lcaCalculator";

/**
 * Game State
 */
export type GameStatus = "idle" | "playing" | "won" | "lost";

/**
 * Guess Entry
 * Represents a single guess with its LCA result
 */
export interface GuessEntry {
  /** The guessed animal */
  animal: Animal;
  /** LCA result between guess and target */
  lca: LCAResult;
  /** Timestamp when guess was made */
  timestamp: number;
}

/**
 * Game Store State
 */
interface GameState {
  /** Current game status */
  status: GameStatus;
  /** Target animal to guess */
  target: Animal | null;
  /** History of guesses */
  guesses: GuessEntry[];
  /** Maximum number of guesses allowed */
  maxGuesses: number;
  /** Tree data structure */
  treeData: TreeData | null;
  /** Map of node IDs to nodes for efficient lookup */
  nodeMap: Map<string, TreeNode>;
  /** Map of clade names to nodes for LCA lookup */
  cladeMap: Map<string, TreeNode>;
}

/**
 * Game Store
 *
 * Manages game state, guess processing, and tree building logic.
 * Implements progressive tree building with each guess.
 */
export const useGameStore = defineStore("game", {
  state: (): GameState => ({
    status: "idle",
    target: null,
    guesses: [],
    maxGuesses: 6,
    treeData: null,
    nodeMap: new Map(),
    cladeMap: new Map(),
  }),

  getters: {
    /**
     * @returns Number of guesses remaining
     */
    guessesRemaining(): number {
      return Math.max(0, this.maxGuesses - this.guesses.length);
    },

    /**
     * @returns Whether the game is active (playing)
     */
    isPlaying(): boolean {
      return this.status === "playing";
    },

    /**
     * @returns Whether the game is won
     */
    isWon(): boolean {
      return this.status === "won";
    },

    /**
     * @returns Whether the game is lost
     */
    isLost(): boolean {
      return this.status === "lost";
    },

    /**
     * @returns Whether the game has ended (won or lost)
     */
    hasEnded(): boolean {
      return this.status === "won" || this.status === "lost";
    },
  },

  actions: {
    /**
     * Initialize a new game with a target animal
     * @param target - The target animal to guess
     * @param maxGuesses - Maximum number of guesses (default: 6)
     */
    startGame(target: Animal, maxGuesses: number = 6): void {
      this.target = target;
      this.guesses = [];
      this.status = "playing";
      this.maxGuesses = maxGuesses;
      this.nodeMap = new Map();
      this.cladeMap = new Map();

      // Initialize tree with root and target
      this.treeData = this.initializeTree(target);
    },

    /**
     * Initialize tree structure with root and target
     * Only shows Animalia as root and the target animal
     * @param target - The target animal
     * @returns Initial tree data
     */
    initializeTree(target: Animal): TreeData {
      // Create root node (Animalia)
      const rootNode: TreeNode = {
        id: "root",
        type: "clade",
        name: "Animalia",
        cladeData: {
          name: "Animalia",
          rank: "kingdom",
        },
        children: [],
        depth: 0,
      };

      // Create target node
      const targetNode: TreeNode = {
        id: `animal-${target.id}`,
        type: "animal",
        name: target.name,
        data: target,
        children: [],
        isTarget: true,
        depth: 1,
      };

      // Simply connect Animalia directly to target (no intermediate taxonomy)
      rootNode.children.push(targetNode);
      targetNode.parent = rootNode;

      // Add to clade map
      this.cladeMap.set("Animalia", rootNode);

      // Build node map
      this.buildNodeMap(rootNode);

      // Build tree data
      const allNodes = Array.from(this.nodeMap.values());
      const guessNodes = allNodes.filter(node => node.isGuess);

      return {
        root: rootNode,
        target: targetNode,
        nodes: allNodes,
        guesses: guessNodes,
      };
    },

    /**
     * Process a guess and update the tree
     * @param guess - The guessed animal
     * @throws Error if game is not active or guess is invalid
     */
    processGuess(guess: Animal): void {
      if (this.status !== "playing") {
        throw new Error("Game is not active");
      }

      if (!this.target) {
        throw new Error("No target animal set");
      }

      if (this.guessesRemaining <= 0) {
        throw new Error("No guesses remaining");
      }

      // Check for duplicate guess
      if (this.guesses.some(g => g.animal.id === guess.id)) {
        throw new Error("Animal already guessed");
      }

      // Calculate LCA between guess and target
      const lcaResult = calculateLCA(guess, this.target);

      // Create guess entry
      const guessEntry: GuessEntry = {
        animal: guess,
        lca: lcaResult,
        timestamp: Date.now(),
      };

      // Add guess to history
      this.guesses.push(guessEntry);

      // Update tree structure
      this.updateTreeWithGuess(guess, lcaResult);

      // Check win condition (exact match)
      if (guess.id === this.target.id) {
        this.status = "won";
      } else if (this.guessesRemaining <= 0) {
        this.status = "lost";
      }
    },

    /**
     * Update tree structure with a new guess
     * Only adds the guessed animal and the LCA clade (not the full path)
     * Moves target animal under LCA if it's not already there
     * @param guess - The guessed animal
     * @param lcaResult - LCA result between guess and target
     */
    updateTreeWithGuess(guess: Animal, lcaResult: LCAResult): void {
      if (!this.treeData) {
        throw new Error("Tree not initialized");
      }

      // Create guess node
      const guessNode: TreeNode = {
        id: `animal-${guess.id}`,
        type: "animal",
        name: guess.name,
        data: guess,
        children: [],
        isGuess: true,
        depth: 2, // LCA depth + 1 (LCA is depth 1, guess is depth 2)
      };

      // Find or create LCA node
      let lcaNode = this.cladeMap.get(lcaResult.clade);

      if (!lcaNode) {
        // Create new LCA node
        const lcaId = `clade-${lcaResult.clade.toLowerCase().replace(/\s+/g, "-")}`;
        lcaNode = {
          id: lcaId,
          type: "clade",
          name: lcaResult.clade,
          cladeData: {
            name: lcaResult.clade,
            rank: lcaResult.rank,
          },
          children: [],
          isLCA: true,
          depth: 1, // Will be updated based on parent
        };

        // Find the appropriate parent for the LCA node
        // Check if the LCA has a parent clade in its taxonomy path
        let parentNode: TreeNode = this.treeData.root;
        lcaNode.depth = 1;

        if (lcaResult.path && lcaResult.path.length > 1 && lcaResult.depth > 0) {
          // The parent is the clade before the LCA in the path
          const parentCladeName = lcaResult.path[lcaResult.depth - 1];
          if (parentCladeName && parentCladeName !== "Animalia") {
            const foundParent = this.cladeMap.get(parentCladeName);
            if (foundParent) {
              parentNode = foundParent;
              // Depth is parent's depth + 1
              lcaNode.depth = (parentNode.depth || 0) + 1;
            }
          }
        }

        // Add LCA node to its parent
        parentNode.children.push(lcaNode);
        lcaNode.parent = parentNode;

        this.cladeMap.set(lcaResult.clade, lcaNode);
      } else {
        // Mark existing node as LCA if not already marked
        lcaNode.isLCA = true;
      }

      // Move target animal to LCA node if it's not already there
      const targetNode = this.treeData.target;
      if (targetNode && targetNode.parent) {
        // Check if target is already a child of the LCA
        const isTargetUnderLCA = targetNode.parent.id === lcaNode.id;

        if (!isTargetUnderLCA) {
          // Remove target from its current parent
          const currentParent = targetNode.parent;
          const targetIndex = currentParent.children.findIndex(
            child => child.id === targetNode.id,
          );
          if (targetIndex !== -1) {
            currentParent.children.splice(targetIndex, 1);
          }

          // Add target to LCA node
          lcaNode.children.push(targetNode);
          targetNode.parent = lcaNode;
        }
      } else if (targetNode && !targetNode.parent) {
        // Target has no parent (shouldn't happen, but handle it)
        lcaNode.children.push(targetNode);
        targetNode.parent = lcaNode;
      }

      // Add guess node to LCA node
      lcaNode.children.push(guessNode);
      guessNode.parent = lcaNode;

      // Rebuild node map and tree data
      this.buildNodeMap(this.treeData.root);

      // Update tree data
      const allNodes = Array.from(this.nodeMap.values());
      const guessNodes = allNodes.filter(node => node.isGuess);

      this.treeData = {
        root: this.treeData.root,
        target: this.treeData.target,
        nodes: allNodes,
        guesses: guessNodes,
      };
    },

    /**
     * Build node map recursively from root
     * @param node - Starting node
     */
    buildNodeMap(node: TreeNode): void {
      this.nodeMap.set(node.id, node);

      // Also add to clade map if it's a clade
      if (node.type === "clade" && node.name) {
        this.cladeMap.set(node.name, node);
      }

      for (const child of node.children) {
        this.buildNodeMap(child);
      }
    },

    /**
     * Get taxonomic rank for a given depth
     * @param depth - Depth in taxonomy (0-based)
     * @returns Rank name
     */
    getRankForDepth(depth: number): string {
      const ranks: Record<number, string> = {
        0: "kingdom",
        1: "phylum",
        2: "class",
        3: "order",
        4: "family",
        5: "genus",
        6: "species",
      };
      return ranks[depth] || "unknown";
    },

    /**
     * Reset game state
     */
    resetGame(): void {
      this.status = "idle";
      this.target = null;
      this.guesses = [];
      this.treeData = null;
      this.nodeMap = new Map();
      this.cladeMap = new Map();
    },
  },
});
