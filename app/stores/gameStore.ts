import { defineStore } from "pinia";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { LCAResult } from "~/utils/lcaCalculator";
import type { GameError } from "~/utils/errorMessages";

/**
 * Game State
 */
export type GameStatus = "idle" | "playing" | "won" | "lost";

/**
 * Completion Status (for story requirements)
 */
export type CompletionStatus = "playing" | "won" | "lost";

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
  /** Current puzzle date (YYYY-MM-DD format) */
  puzzleDate: string;
  /** Loading state for global operations (API calls, data loading) */
  isLoading: boolean;
  /** Store-level error (API/data errors) */
  error: GameError | null;
  /** Loading state for tree rendering */
  isRenderingTree: boolean;
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
    puzzleDate: "",
    isLoading: false,
    error: null,
    isRenderingTree: false,
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

    /**
     * Returns a function to check if an animal has been guessed
     * @returns Function that takes an animal and returns whether it has been guessed
     */
    hasGuessed(): (animal: Animal) => boolean {
      return (animal: Animal) => this.guesses.some(g => g.animal.id === animal.id);
    },

    /**
     * @returns Whether the game is complete (won or lost)
     */
    isComplete(): boolean {
      return this.status === "won" || this.status === "lost";
    },

    /**
     * @returns Whether more guesses are allowed
     */
    canGuess(): boolean {
      return this.status === "playing" && this.guessesRemaining > 0;
    },

    /**
     * @returns Number of guesses made
     */
    guessCount(): number {
      return this.guesses.length;
    },

    /**
     * @returns Current completion status (playing | won | lost)
     */
    completionStatus(): CompletionStatus {
      if (this.status === "idle") {
        return "playing";
      }
      return this.status as CompletionStatus;
    },
  },

  actions: {
    /**
     * Normalize clade name for consistent map lookups
     * @param name - Clade name to normalize
     * @returns Normalized name (lowercase, trimmed)
     */
    normalizeCladeName(name: string): string {
      return name.trim().toLowerCase();
    },

    /**
     * Update depth recursively for a node and all its descendants
     * @param node - Starting node
     * @param baseDepth - Base depth for the starting node
     */
    updateDepthRecursive(node: TreeNode, baseDepth: number): void {
      node.depth = baseDepth;
      for (const child of node.children) {
        this.updateDepthRecursive(child, baseDepth + 1);
      }
    },

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
     * Initialize a new game with a target animal (story requirement: initializeGame)
     * @param target - The target animal to guess
     * @param maxGuesses - Maximum number of guesses (default: 6)
     * @param puzzleDate - Current puzzle date (YYYY-MM-DD format, optional)
     */
    initializeGame(target: Animal, maxGuesses: number = 6, puzzleDate: string = ""): void {
      this.setTargetAnimal(target);
      this.guesses = [];
      this.status = "playing";
      this.maxGuesses = maxGuesses;
      this.nodeMap = new Map();
      this.cladeMap = new Map();
      this.puzzleDate = puzzleDate || this.getCurrentDate();

      // Initialize tree with root and target
      this.treeData = this.initializeTree(target);
    },

    /**
     * Set target animal for puzzle (story requirement: setTargetAnimal)
     * @param animal - The target animal to guess
     */
    setTargetAnimal(animal: Animal): void {
      this.target = animal;
    },

    /**
     * Add a guess to the history (story requirement: addGuess)
     * This is a wrapper around processGuess for naming convention compliance
     * @param guess - The guessed animal
     */
    addGuess(guess: Animal): void {
      this.processGuess(guess);
    },

    /**
     * Set completion status (story requirement: setCompletionStatus)
     * @param status - The completion status (playing | won | lost)
     */
    setCompletionStatus(status: CompletionStatus): void {
      this.status = status;
    },

    /**
     * Update tree state (story requirement: updateTreeState)
     * @param treeData - The tree data structure
     */
    updateTreeState(treeData: TreeData): void {
      this.treeData = treeData;
      // Rebuild node map and clade map from new tree data
      this.nodeMap = new Map();
      this.cladeMap = new Map();
      this.buildNodeMap(treeData.root);
    },

    /**
     * Decrement guesses remaining (story requirement: decrementGuessesRemaining)
     * Note: This is automatically handled by processGuess, but provided for explicit control
     */
    decrementGuessesRemaining(): void {
      // Guesses remaining is computed, so this is a no-op
      // The actual decrement happens when a guess is added
      // This method exists for API compliance with story requirements
    },

    /**
     * Get current date in YYYY-MM-DD format
     * @returns Current date string
     */
    getCurrentDate(): string {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
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

      // Add to clade map with normalized key
      this.cladeMap.set(this.normalizeCladeName("Animalia"), rootNode);

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
     * Moves target animal under LCA only if the new LCA is more specific than current
     * Also computes LCA with previous guesses that share the same LCA with target
     * @param guess - The guessed animal
     * @param lcaResult - LCA result between guess and target
     */
    updateTreeWithGuess(guess: Animal, lcaResult: LCAResult): void {
      if (!this.treeData) {
        throw new Error("Tree not initialized");
      }

      // Rebuild node map first to ensure all existing nodes are accessible
      // This is needed for computeLCAWithRelatedGuesses to find previous guess nodes
      this.buildNodeMap(this.treeData.root);

      // Find or create LCA node for guess-target LCA
      // If LCA is species-level, find the most specific clade-level ancestor instead
      let lcaNode = this.findOrCreateLCANode(lcaResult);

      // If LCA is species-level (null), find the parent clade from the path
      if (!lcaNode && lcaResult.path && lcaResult.path.length > 1) {
        // Find the most specific clade-level ancestor (not species)
        for (let i = lcaResult.depth - 1; i >= 0; i--) {
          const ancestorClade = lcaResult.path[i];
          if (ancestorClade && ancestorClade !== "Animalia") {
            const normalizedName = this.normalizeCladeName(ancestorClade);
            const ancestorNode = this.cladeMap.get(normalizedName);
            if (ancestorNode) {
              lcaNode = ancestorNode;
              break;
            }
          }
        }
        // If still no node found, use root
        if (!lcaNode) {
          lcaNode = this.treeData.root;
        }
      }

      // If we still don't have an LCA node, something went wrong
      if (!lcaNode) {
        lcaNode = this.treeData.root;
      }

      // Create guess node with correct depth based on LCA node
      const guessNode: TreeNode = {
        id: `animal-${guess.id}`,
        type: "animal",
        name: guess.name,
        data: guess,
        children: [],
        isGuess: true,
        depth: (lcaNode.depth ?? 0) + 1,
      };

      // Compute LCA with previous guesses that share the same LCA with target
      // This handles cases like Rat + Hamster (both rodents)
      this.computeLCAWithRelatedGuesses(guess, lcaResult, guessNode);

      // Move target animal to LCA node only if new LCA is more specific (deeper)
      const targetNode = this.treeData.target;
      if (targetNode && lcaNode) {
        const currentLCADepth = this.getCurrentTargetLCADepth(targetNode);
        const newLCADepth = lcaResult.depth;

        // Only move target if new LCA is more specific (deeper) than current
        // Deeper means higher depth number (e.g., depth 4 is deeper than depth 2)
        // Also verify that the new LCA is actually an ancestor of the target
        if (newLCADepth > currentLCADepth && this.isAncestorOfTarget(lcaResult)) {
          this.moveTargetToLCANode(targetNode, lcaNode);
        }
      }

      // Add guess node to LCA node only if it wasn't already moved by computeLCAWithRelatedGuesses
      // (i.e., if it doesn't have a parent yet)
      if (!guessNode.parent && lcaNode) {
        lcaNode.children.push(guessNode);
        guessNode.parent = lcaNode;
        // Update depth based on parent
        guessNode.depth = (lcaNode.depth ?? 0) + 1;
      }

      // Rebuild node map and tree data once at the end
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
     * Find or create an LCA node in the tree
     * Filters out species-level LCAs (only creates nodes for clade-level ranks)
     * @param lcaResult - LCA result to find or create
     * @returns The LCA node, or null if species-level
     */
    findOrCreateLCANode(lcaResult: LCAResult): TreeNode | null {
      if (!this.treeData) {
        throw new Error("Tree not initialized");
      }

      // Filter out species-level LCAs - we don't want to create clade nodes for species
      // Species names like "Panthera leo" or "Bubo virginianus" should not be clades
      if (lcaResult.rank === "species" || lcaResult.depth === 6) {
        return null;
      }

      // Use normalized name for lookup
      const normalizedName = this.normalizeCladeName(lcaResult.clade);
      let lcaNode = this.cladeMap.get(normalizedName);

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
        // When adding a less specific LCA, we need to restructure the tree
        // so that more specific LCAs become children of the less specific one
        const parentNode = this.findParentForLCANode(lcaResult, lcaNode);

        // Add LCA node to its parent
        parentNode.children.push(lcaNode);
        lcaNode.parent = parentNode;

        // Update depth based on parent
        lcaNode.depth = (parentNode.depth || 0) + 1;

        // Move any existing LCA nodes that are more specific (deeper) to be children of this new LCA
        this.restructureTreeForNewLCA(lcaNode, lcaResult);

        // Store with normalized key
        this.cladeMap.set(normalizedName, lcaNode);
      } else {
        // Mark existing node as LCA if not already marked
        lcaNode.isLCA = true;
      }

      return lcaNode;
    },

    /**
     * Find the appropriate parent node for a new LCA node
     * @param lcaResult - LCA result
     * @param lcaNode - The LCA node being created
     * @returns The parent node
     */
    findParentForLCANode(lcaResult: LCAResult, lcaNode: TreeNode): TreeNode {
      if (!this.treeData) {
        throw new Error("Tree not initialized");
      }

      // Start with root as default parent
      let parentNode: TreeNode = this.treeData.root;
      lcaNode.depth = 1;

      // Check if there's an existing LCA node that is less specific (shallower) than this one
      // This new LCA should be a child of the less specific one
      const existingLCAs = Array.from(this.cladeMap.values())
        .filter(node => node.isLCA && node.id !== lcaNode.id)
        .map((node) => {
          // Find the guess entry that created this LCA to get its depth
          // Use normalized comparison for robustness
          const guessEntry = this.guesses.find(
            entry => this.normalizeCladeName(entry.lca.clade) === this.normalizeCladeName(node.name || ""),
          );
          return {
            node,
            depth: guessEntry?.lca.depth ?? node.depth ?? 0,
            lcaResult: guessEntry?.lca,
          };
        })
        .filter(({ depth, lcaResult: existingLCA }) => {
          // Less specific means shallower taxonomic depth
          if (depth >= lcaResult.depth) {
            return false;
          }
          // Verify that the existing LCA is actually an ancestor of the new LCA
          if (existingLCA?.path && lcaResult.path) {
            // Check if existing LCA appears in new LCA's path at the correct depth
            if (depth >= 0 && depth < lcaResult.path.length) {
              const ancestorAtDepth = lcaResult.path[depth];
              return !!(
                ancestorAtDepth
                && this.normalizeCladeName(ancestorAtDepth)
                === this.normalizeCladeName(existingLCA.clade)
              );
            }
          }
          return true; // If we can't verify, include it anyway
        })
        .sort((a, b) => b.depth - a.depth); // Sort by depth descending (most specific first)

      // Use the most specific (deepest) less-specific LCA as parent
      if (existingLCAs.length > 0) {
        parentNode = existingLCAs[0]!.node;
        lcaNode.depth = (parentNode.depth || 0) + 1;
        return parentNode;
      }

      // Otherwise, check if the LCA has a parent clade in its taxonomy path
      if (lcaResult.path && lcaResult.path.length > 1 && lcaResult.depth > 0) {
        // The parent is the clade before the LCA in the path
        const parentCladeName = lcaResult.path[lcaResult.depth - 1];
        if (parentCladeName && parentCladeName !== "Animalia") {
          const normalizedParentName = this.normalizeCladeName(parentCladeName);
          const foundParent = this.cladeMap.get(normalizedParentName);
          if (foundParent) {
            parentNode = foundParent;
            // Depth is parent's depth + 1
            lcaNode.depth = (parentNode.depth || 0) + 1;
          }
        }
      }

      return parentNode;
    },

    /**
     * Restructure the tree when a new, less specific LCA is added
     * Moves more specific LCA nodes to be children of the new LCA
     * Only moves LCAs that are direct children of nodes less specific than the new LCA
     * @param newLCANode - The new LCA node (less specific)
     * @param lcaResult - The LCA result for the new node
     */
    restructureTreeForNewLCA(newLCANode: TreeNode, lcaResult: LCAResult): void {
      if (!this.treeData) {
        return;
      }

      // Find all existing LCA nodes that are more specific (deeper) than this new one
      // and should be moved to be children of the new LCA
      const existingLCAs = Array.from(this.cladeMap.values())
        .filter(
          node =>
            node.isLCA
            && node.id !== newLCANode.id
            && node.parent?.id !== newLCANode.id,
        )
        .map((node) => {
          // Find the guess entry that created this LCA to get its depth
          // Use normalized comparison
          const guessEntry = this.guesses.find(
            entry => this.normalizeCladeName(entry.lca.clade) === this.normalizeCladeName(node.name || ""),
          );
          return {
            node,
            depth: guessEntry?.lca.depth ?? node.depth ?? 0,
            lcaResult: guessEntry?.lca,
          };
        })
        .filter(({ depth, lcaResult: existingLCA, node }) => {
          // Check if this existing LCA is more specific (deeper) than the new LCA
          if (depth <= lcaResult.depth) {
            return false;
          }

          // Check if the new LCA is an ancestor of the existing LCA
          // by checking if it appears in the existing LCA's path at the correct depth
          if (
            existingLCA?.path
            && lcaResult.depth >= 0
            && lcaResult.depth < existingLCA.path.length
          ) {
            const ancestorAtDepth = existingLCA.path[lcaResult.depth];
            const isAncestor = !!(
              ancestorAtDepth
              && this.normalizeCladeName(ancestorAtDepth)
              === this.normalizeCladeName(lcaResult.clade)
            );

            if (!isAncestor) {
              return false;
            }

            // Only move if the current parent is less specific than the new LCA
            // This prevents moving nodes that are already correctly positioned
            // under a more specific intermediate LCA (e.g., don't move Panthera
            // from under Carnivora when adding Mammalia)
            const currentParent = node.parent;
            if (currentParent && currentParent.isLCA && currentParent.name) {
              // Find the parent's LCA depth
              const parentGuessEntry = this.guesses.find(
                entry => this.normalizeCladeName(entry.lca.clade) === this.normalizeCladeName(currentParent.name || ""),
              );
              const parentDepth = parentGuessEntry?.lca.depth ?? currentParent.depth ?? 0;

              // Only move if parent is less specific (shallower) than new LCA
              // If parent is more specific (deeper), keep the node where it is
              if (parentDepth > lcaResult.depth) {
                return false; // Parent is more specific, don't move
              }
            }

            return true;
          }

          return false;
        });

      // Move each more specific LCA to be a child of the new LCA
      for (const { node: existingLCANode } of existingLCAs) {
        // Remove from current parent
        if (existingLCANode.parent) {
          const currentParent = existingLCANode.parent;
          const index = currentParent.children.findIndex(
            child => child.id === existingLCANode.id,
          );
          if (index !== -1) {
            currentParent.children.splice(index, 1);
          }
        }

        // Add to new LCA as child
        newLCANode.children.push(existingLCANode);
        existingLCANode.parent = newLCANode;

        // Update depth recursively for the moved node and all its descendants
        this.updateDepthRecursive(existingLCANode, (newLCANode.depth || 0) + 1);
      }
    },

    /**
     * Compute LCA between new guess and all previous guesses
     * Groups guesses that share a more specific LCA than their individual LCAs with target
     * This handles cases like: two owls (both LCA with Tiger = Chordata, but LCA with each other = Aves)
     * @param guess - The new guess
     * @param guessTargetLCA - LCA between guess and target
     * @param guessNode - The guess node to potentially move
     */
    computeLCAWithRelatedGuesses(
      guess: Animal,
      guessTargetLCA: LCAResult,
      guessNode: TreeNode,
    ): void {
      if (!this.treeData) {
        return;
      }

      // Compute LCA between new guess and ALL previous guesses
      // This allows grouping guesses that share a more specific LCA even if they don't
      // share the same LCA with the target (e.g., two owls both under Chordata with Tiger,
      // but Aves with each other)
      const guessLCAs = this.guesses.map((entry) => {
        const relatedLCA = calculateLCA(guess, entry.animal);
        return {
          previousGuess: entry.animal,
          previousGuessEntry: entry,
          lca: relatedLCA,
        };
      });

      // Filter to only LCAs that are more specific than the guess-target LCA
      // and not species-level
      const moreSpecificLCAs = guessLCAs.filter(
        ({ lca }) => lca.depth > guessTargetLCA.depth && lca.rank !== "species",
      );

      if (moreSpecificLCAs.length === 0) {
        return;
      }

      // Sort by LCA depth (deeper = more specific = higher priority)
      moreSpecificLCAs.sort((a, b) => b.lca.depth - a.lca.depth);

      // Use the most specific LCA found
      const mostSpecific = moreSpecificLCAs[0]!;
      const { lca: relatedLCA } = mostSpecific;

      const relatedLCANode = this.findOrCreateLCANode(relatedLCA);
      if (!relatedLCANode) {
        return;
      }

      // Move guess node to the more specific LCA
      this.moveNodeToLCANode(guessNode, relatedLCANode);

      // Find all guesses that should be grouped under this LCA
      // These are guesses that share this same LCA (or a more specific one) with the new guess
      const guessesToGroup = moreSpecificLCAs
        .filter(({ lca }) => {
          // Same LCA clade (normalized comparison)
          const lcaNormalized = this.normalizeCladeName(lca.clade);
          const relatedLCANormalized = this.normalizeCladeName(relatedLCA.clade);
          return lcaNormalized === relatedLCANormalized;
        })
        .map(({ previousGuess }) => previousGuess);

      // Move all related guesses to this more specific LCA
      // This ensures all related guesses are grouped together (e.g., both owls under Aves)
      for (const otherGuess of guessesToGroup) {
        const relatedGuessNode = this.nodeMap.get(`animal-${otherGuess.id}`);

        // Move the related guess to the more specific LCA if we found the node
        // Only move if it's not already under this LCA
        if (relatedGuessNode && relatedGuessNode.parent?.id !== relatedLCANode.id) {
          this.moveNodeToLCANode(relatedGuessNode, relatedLCANode);
        }
      }
    },

    /**
     * Get the depth of the current LCA that the target is under
     * @param targetNode - The target node
     * @returns Depth of current LCA, or -1 if target is directly under root
     */
    getCurrentTargetLCADepth(targetNode: TreeNode): number {
      if (!targetNode.parent) {
        return -1;
      }

      // If parent is root, return -1
      if (targetNode.parent.id === "root") {
        return -1;
      }

      // If parent is an LCA node, get its depth from the clade map
      // We need to find the LCA result that corresponds to this clade
      if (targetNode.parent.isLCA && targetNode.parent.name) {
        // Find the guess entry that has this LCA (use normalized comparison)
        const matchingGuess = this.guesses.find(
          entry => this.normalizeCladeName(entry.lca.clade) === this.normalizeCladeName(targetNode.parent!.name || ""),
        );

        if (matchingGuess) {
          return matchingGuess.lca.depth;
        }

        // Fallback: try to infer depth from parent's depth property
        // This is less accurate but better than nothing
        return targetNode.parent.depth || 0;
      }

      return -1;
    },

    /**
     * Check if an LCA result represents an ancestor of the target animal
     * @param lcaResult - LCA result to check
     * @returns True if LCA is an ancestor of target
     */
    isAncestorOfTarget(lcaResult: LCAResult): boolean {
      if (!this.target || !lcaResult.path) {
        return false;
      }

      // Check if the LCA clade appears in the target's taxonomy at the correct depth
      if (lcaResult.depth >= 0 && lcaResult.depth < this.target.taxonomy.length) {
        const targetCladeAtDepth = this.target.taxonomy[lcaResult.depth];
        const targetCladeNormalized = targetCladeAtDepth
          ? this.normalizeCladeName(targetCladeAtDepth)
          : "";
        const lcaCladeNormalized = this.normalizeCladeName(lcaResult.clade);
        return targetCladeNormalized === lcaCladeNormalized;
      }

      return false;
    },

    /**
     * Move a node to an LCA node (helper function)
     * @param node - The node to move
     * @param lcaNode - The LCA node to move to
     */
    moveNodeToLCANode(node: TreeNode, lcaNode: TreeNode): void {
      // Check if node is already a child of the LCA
      if (node.parent?.id === lcaNode.id) {
        return;
      }

      // Remove node from its current parent
      if (node.parent) {
        const currentParent = node.parent;
        const nodeIndex = currentParent.children.findIndex(
          child => child.id === node.id,
        );
        if (nodeIndex !== -1) {
          currentParent.children.splice(nodeIndex, 1);
        }
      }

      // Add node to LCA node
      lcaNode.children.push(node);
      node.parent = lcaNode;

      // Update depth recursively for the moved node and all its descendants
      this.updateDepthRecursive(node, (lcaNode.depth || 0) + 1);
    },

    /**
     * Move target node to an LCA node
     * @param targetNode - The target node
     * @param lcaNode - The LCA node to move target to
     */
    moveTargetToLCANode(targetNode: TreeNode, lcaNode: TreeNode): void {
      this.moveNodeToLCANode(targetNode, lcaNode);
    },

    /**
     * Build node map recursively from root
     * @param node - Starting node
     */
    buildNodeMap(node: TreeNode): void {
      this.nodeMap.set(node.id, node);

      // Also add to clade map if it's a clade (use normalized key)
      if (node.type === "clade" && node.name) {
        const normalizedName = this.normalizeCladeName(node.name);
        this.cladeMap.set(normalizedName, node);
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
     * Set loading state (for global operations)
     * @param loading - Whether loading is active
     */
    setLoading(loading: boolean): void {
      this.isLoading = loading;
    },

    /**
     * Set tree rendering state
     * @param rendering - Whether tree is being rendered
     */
    setRenderingTree(rendering: boolean): void {
      this.isRenderingTree = rendering;
    },

    /**
     * Set store-level error (for API/data errors)
     * @param error - GameError or null to clear
     */
    setError(error: GameError | null): void {
      this.error = error;
    },

    /**
     * Clear error state
     */
    clearError(): void {
      this.error = null;
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
      this.puzzleDate = "";
      this.isLoading = false;
      this.error = null;
      this.isRenderingTree = false;
    },
  },
});
