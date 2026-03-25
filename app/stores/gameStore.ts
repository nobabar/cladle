import { defineStore } from "pinia";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import { calculateLCA } from "~/utils/lcaCalculator";
import type { LCAResult } from "~/utils/lcaCalculator";
import type { GameError } from "~/utils/errorMessages";
import { getCurrentDateUTC, isMidnightPassed } from "~/utils/dateUtils";
import type { PuzzleHistoryEntry } from "~/types/puzzleHistory";
import { gameStorePersistSerializer } from "~/utils/piniaGameStorePersistence";
import { createSafeLocalStorageForPinia } from "~/utils/storageSafe";

/**
 * Default maximum number of guesses allowed per game
 */
export const DEFAULT_MAX_GUESSES = 20;

/**
 * Game State
 */
export type GameStatus = "idle" | "playing" | "won" | "lost";

/**
 * Completion Status
 */
export type CompletionStatus = "playing" | "won" | "lost";

/**
 * Game Mode
 */
export type GameMode = "daily" | "free-play";

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
 * Mode-specific game state snapshot
 */
interface ModeGameState {
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
}

/**
 * Game Store State
 */
interface GameState {
  /** Current game mode (daily or free-play) */
  gameMode: GameMode | null;
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
  /** Stored state for daily puzzle mode */
  dailyState: ModeGameState | null;
  /** Stored state for free-play mode */
  freePlayState: ModeGameState | null;
  /** True when viewing a past puzzle from history (read-only replay) */
  isReplayMode: boolean;
}

/**
 * Game Store
 *
 * Manages game state, guess processing, and tree building logic.
 * Implements progressive tree building with each guess.
 */
export const useGameStore = defineStore("game", {
  state: (): GameState => ({
    gameMode: null,
    status: "idle",
    target: null,
    guesses: [],
    maxGuesses: DEFAULT_MAX_GUESSES,
    treeData: null,
    nodeMap: new Map(),
    cladeMap: new Map(),
    puzzleDate: "",
    isLoading: false,
    error: null,
    isRenderingTree: false,
    dailyState: null,
    freePlayState: null,
    isReplayMode: false,
  }),

  persist: {
    key: "cladle-game-store",
    storage: createSafeLocalStorageForPinia(),
    serializer: gameStorePersistSerializer,
    // Only persist the game mode and mode-specific state snapshots
    // The root-level state (status, target, guesses, etc.) is restored from
    // dailyState or freePlayState when the app loads, so we don't need to persist it
    pick: [
      "gameMode",
      "dailyState",
      "freePlayState",
    ],
  },

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
     * Rebuild Maps from treeData (called after state is restored from localStorage)
     */
    rebuildMapsFromTree(): void {
      // Clear existing maps
      this.nodeMap = new Map();
      this.cladeMap = new Map();

      // Rebuild maps from treeData if it exists
      if (this.treeData && this.treeData.root) {
        // Clear parent references first
        this.clearParentReferences(this.treeData.root);
        // Rebuild maps and parent references
        this.buildNodeMap(this.treeData.root);
        // Clean up tree structure
        this.cleanupChildrenArrays(this.treeData.root);
      }
    },

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
     * Save current game state to mode-specific storage
     * @param mode - The game mode to save state for
     */
    saveModeState(mode: GameMode): void {
      // Deep clone tree data (handle circular references by storing minimal data)
      let savedTreeData: TreeData | null = null;
      if (this.treeData) {
        // Store tree data - we'll rebuild maps from tree when restoring
        savedTreeData = JSON.parse(JSON.stringify(this.treeData, (key, value) => {
          // Skip parent references to avoid circular references
          if (key === "parent") {
            return undefined;
          }
          return value;
        }));
      }

      // Deep clone target animal
      const savedTarget = this.target ? JSON.parse(JSON.stringify(this.target)) : null;

      // Deep clone guesses
      const savedGuesses = this.guesses.map(guess => JSON.parse(JSON.stringify(guess)));

      const state: ModeGameState = {
        status: this.status,
        target: savedTarget,
        guesses: savedGuesses,
        maxGuesses: this.maxGuesses,
        treeData: savedTreeData,
        // Store maps as empty - we'll rebuild them from tree when restoring
        nodeMap: new Map(),
        cladeMap: new Map(),
        puzzleDate: this.puzzleDate,
      };

      // Deep clone the entire state object to avoid any reference sharing
      // Note: Maps will be empty, but that's fine - we rebuild them from tree
      const clonedState = JSON.parse(JSON.stringify(state, (key, value) => {
        // Skip Maps - they'll be empty anyway and we rebuild from tree
        if (value instanceof Map) {
          return {};
        }
        return value;
      }));

      // Reconstruct the state object properly
      const finalState: ModeGameState = {
        status: clonedState.status,
        target: clonedState.target,
        guesses: clonedState.guesses,
        maxGuesses: clonedState.maxGuesses,
        treeData: clonedState.treeData,
        nodeMap: new Map(),
        cladeMap: new Map(),
        puzzleDate: clonedState.puzzleDate,
      };

      if (mode === "daily") {
        this.dailyState = finalState;
      } else {
        this.freePlayState = finalState;
      }
    },

    /**
     * Restore game state from mode-specific storage
     * @param mode - The game mode to restore state for
     */
    restoreModeState(mode: GameMode): void {
      const savedState = mode === "daily" ? this.dailyState : this.freePlayState;

      if (savedState) {
        // Deep clone everything to avoid reference sharing
        const state = JSON.parse(JSON.stringify(savedState));

        this.status = state.status;
        this.target = state.target;
        this.guesses = state.guesses;
        this.maxGuesses = state.maxGuesses;
        this.puzzleDate = state.puzzleDate;

        // Restore tree data and rebuild maps with parent references
        if (state.treeData) {
          this.treeData = state.treeData;
          // Rebuild node map and clade map from tree, restoring parent references
          this.nodeMap = new Map();
          this.cladeMap = new Map();
          if (this.treeData && this.treeData.root) {
            // Clear any existing parent references first
            this.clearParentReferences(this.treeData.root);
            // Rebuild maps and parent references based on children arrays
            this.buildNodeMap(this.treeData.root);
            // Clean up children arrays to remove nodes where parent doesn't match
            this.cleanupChildrenArrays(this.treeData.root);
          }
        } else {
          this.treeData = null;
          this.nodeMap = new Map();
          this.cladeMap = new Map();
        }
      } else {
        // No saved state, reset to initial
        this.status = "idle";
        this.target = null;
        this.guesses = [];
        this.maxGuesses = DEFAULT_MAX_GUESSES;
        this.treeData = null;
        this.nodeMap = new Map();
        this.cladeMap = new Map();
        this.puzzleDate = mode === "daily" ? this.getCurrentDate() : "";
      }
    },

    /**
     * Load a past puzzle from history for replay (read-only view).
     * Does not overwrite dailyState; use exitReplay() to return to today's puzzle.
     * @param entry - History entry from puzzle history storage
     */
    loadReplayFromHistory(entry: PuzzleHistoryEntry): void {
      this.isReplayMode = true;
      this.gameMode = "daily";
      this.status = entry.completionStatus as GameStatus;
      this.target = entry.targetAnimal;
      this.guesses = entry.guesses as GuessEntry[];
      this.maxGuesses = DEFAULT_MAX_GUESSES;
      this.puzzleDate = entry.puzzleDate;
      if (entry.treeData) {
        this.treeData = entry.treeData as unknown as TreeData;
        this.nodeMap = new Map();
        this.cladeMap = new Map();
        if (this.treeData.root) {
          this.clearParentReferences(this.treeData.root);
          this.buildNodeMap(this.treeData.root);
          this.cleanupChildrenArrays(this.treeData.root);
        }
      } else {
        this.treeData = null;
        this.nodeMap = new Map();
        this.cladeMap = new Map();
      }
    },

    /**
     * Exit replay mode and restore the current daily puzzle state.
     */
    exitReplay(): void {
      if (!this.isReplayMode) return;
      this.isReplayMode = false;
      this.restoreModeState("daily");
    },

    /**
     * Switch to a different game mode, saving current state and restoring the other mode's state
     * @param newMode - The game mode to switch to
     */
    switchGameMode(newMode: GameMode): void {
      // Save current state if we're in a mode
      if (this.gameMode) {
        this.saveModeState(this.gameMode);
      }

      // Switch to new mode
      this.gameMode = newMode;

      // Restore state for new mode
      this.restoreModeState(newMode);
    },

    /**
     * Initialize a new game with a target animal
     * @param target - The target animal to guess
     * @param maxGuesses - Maximum number of guesses (default: DEFAULT_MAX_GUESSES)
     */
    startGame(target: Animal, maxGuesses: number = DEFAULT_MAX_GUESSES): void {
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
     * Initialize a new game with a target animal
     * @param target - The target animal to guess
     * @param maxGuesses - Maximum number of guesses (default: DEFAULT_MAX_GUESSES)
     * @param puzzleDate - Current puzzle date (YYYY-MM-DD format, optional)
     *                    If empty string, indicates free play mode (no daily puzzle date)
     *                    If not provided (undefined), uses current date for daily puzzle
     * @param gameMode - The game mode (daily or free-play)
     * @param forceNew - Force initialization of a new game even if state exists (for reset functionality)
     */
    initializeGame(
      target: Animal,
      maxGuesses: number = DEFAULT_MAX_GUESSES,
      puzzleDate?: string,
      gameMode?: GameMode,
      forceNew: boolean = false,
    ): void {
      // Determine game mode from puzzleDate if not provided
      const mode: GameMode = gameMode || (puzzleDate === "" ? "free-play" : "daily");

      // If switching modes, save current state and restore the other mode's state
      if (this.gameMode && this.gameMode !== mode) {
        this.switchGameMode(mode);
        // After switching modes and restoring state, check if we have valid restored state
        // If we do, and we're not forcing a new game, don't initialize a new game
        if (!forceNew && this.target && this.status !== "idle") {
          // We have valid restored state, don't overwrite it
          return;
        }
      } else if (!this.gameMode) {
        // First time initializing, set the mode
        this.gameMode = mode;
        // Try to restore any saved state for this mode
        this.restoreModeState(mode);
        // If we have valid restored state, don't initialize a new game unless forced
        if (!forceNew && this.target && this.status !== "idle") {
          // We have valid restored state, don't overwrite it
          return;
        }
      }

      // Determine expected puzzle date for comparison
      const expectedPuzzleDate = puzzleDate !== undefined ? puzzleDate : (mode === "daily" ? this.getCurrentDate() : "");

      // Check if we should initialize a new game:
      // 1. forceNew is true (explicit reset)
      // 2. We don't have a target (no restored state)
      // 3. For daily mode: puzzle date changed (new day)
      // 4. For free play: if we're calling with empty string and no target, it's a new game
      const hasValidState = this.target !== null && this.target !== undefined;
      const isNewDay = mode === "daily" && this.puzzleDate !== expectedPuzzleDate;
      const isFreePlayNewGame = mode === "free-play" && puzzleDate === "" && !hasValidState;

      const shouldInitializeNew = forceNew || !hasValidState || isNewDay || isFreePlayNewGame;

      if (shouldInitializeNew) {
        this.setTargetAnimal(target);
        this.guesses = [];
        this.status = "playing";
        this.maxGuesses = maxGuesses;
        this.nodeMap = new Map();
        this.cladeMap = new Map();
        // Only use current date if puzzleDate is not provided (undefined)
        // Empty string explicitly means free play mode (no puzzle date)
        this.puzzleDate = expectedPuzzleDate;

        // Initialize tree with root and target
        this.treeData = this.initializeTree(target);

        // Rebuild maps from tree
        if (this.treeData && this.treeData.root) {
          this.buildNodeMap(this.treeData.root);
        }

        // Save state after initializing new game
        if (this.gameMode) {
          this.saveModeState(this.gameMode);
        }
      }
    },

    /**
     * Set target animal for puzzle
     * @param animal - The target animal to guess
     */
    setTargetAnimal(animal: Animal): void {
      this.target = animal;
    },

    /**
     * Add a guess to the history
     * This is a wrapper around processGuess for naming convention compliance
     * @param guess - The guessed animal
     */
    addGuess(guess: Animal): void {
      this.processGuess(guess);
    },

    /**
     * Set completion status
     * @param status - The completion status (playing | won | lost)
     */
    setCompletionStatus(status: CompletionStatus): void {
      this.status = status;
    },

    /**
     * Update tree state
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
     * Get current date in YYYY-MM-DD format (UTC).
     * Uses UTC for consistency across time zones (NFR37) for daily puzzle.
     * @returns Current date string in UTC
     */
    getCurrentDate(): string {
      return getCurrentDateUTC();
    },

    /**
     * Check if the stored puzzle date is stale (midnight UTC has passed).
     * Used to trigger reset and load new daily puzzle.
     * @returns true if puzzle should be reset for a new day
     */
    shouldResetForNewDay(): boolean {
      if (this.gameMode !== "daily" || !this.puzzleDate) {
        return false;
      }
      return isMidnightPassed(this.puzzleDate);
    },

    /**
     * Reset game state for a new daily puzzle (midnight passed).
     * Clears guesses, tree, completion status and clears persisted daily state
     * so the next initialization loads the new puzzle for the current date.
     */
    resetForNewDay(): void {
      if (this.gameMode !== "daily") {
        return;
      }
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
      this.dailyState = null;
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

      // Auto-save state for current mode after each guess
      // Use setTimeout to ensure state is fully updated before saving
      if (this.gameMode) {
        setTimeout(() => {
          this.saveModeState(this.gameMode!);
        }, 0);
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

      // Clean up tree structure to remove any duplicate node references
      // This ensures the tree is in a clean state before processing the new guess
      this.cleanupChildrenArrays(this.treeData.root);

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
            // Check if existing LCA's path is a proper prefix of the new LCA's path
            // This ensures the existing LCA is actually a taxonomic ancestor
            if (depth >= 0 && depth < lcaResult.path.length && depth < existingLCA.path.length) {
              // Verify that all path elements up to the existing LCA's depth match
              for (let i = 0; i <= depth; i++) {
                const existingPathElement = existingLCA.path[i];
                const newPathElement = lcaResult.path[i];
                if (
                  !existingPathElement
                  || !newPathElement
                  || this.normalizeCladeName(existingPathElement)
                  !== this.normalizeCladeName(newPathElement)
                ) {
                  return false; // Paths don't match, not an ancestor
                }
              }
              // Also verify that the clade name at the depth matches
              const ancestorAtDepth = lcaResult.path[depth];
              if (
                ancestorAtDepth
                && this.normalizeCladeName(ancestorAtDepth)
                === this.normalizeCladeName(existingLCA.clade)
              ) {
                return true; // Verified ancestor relationship
              }
            }
          }
          return false; // If we can't verify, exclude it to prevent incorrect placement
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
        // Even if parent reference is correct, ensure it's not duplicated elsewhere
        this.removeNodeFromAllParents(node, lcaNode);
        return;
      }

      // Remove node from ALL possible parent locations (handles restore corruption)
      this.removeNodeFromAllParents(node, lcaNode);

      // Add node to LCA node (only if not already there)
      if (!lcaNode.children.some(child => child.id === node.id)) {
        lcaNode.children.push(node);
      }
      node.parent = lcaNode;

      // Update depth recursively for the moved node and all its descendants
      this.updateDepthRecursive(node, (lcaNode.depth || 0) + 1);
    },

    /**
     * Remove a node from all possible parent locations in the tree
     * This handles cases where a node might appear in multiple children arrays after restore
     * @param node - The node to remove
     * @param exceptParent - Parent to keep the node in (optional)
     */
    removeNodeFromAllParents(node: TreeNode, exceptParent?: TreeNode): void {
      if (!this.treeData || !this.treeData.root) {
        return;
      }

      // Recursively search and remove node from all children arrays
      const removeFromNode = (parentNode: TreeNode): void => {
        // Remove node from this parent's children array (if it's not the exception)
        if (parentNode !== exceptParent) {
          const nodeIndex = parentNode.children.findIndex(
            child => child.id === node.id,
          );
          if (nodeIndex !== -1) {
            parentNode.children.splice(nodeIndex, 1);
          }
        }

        // Recursively check all children
        for (const child of parentNode.children) {
          removeFromNode(child);
        }
      };

      removeFromNode(this.treeData.root);
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
     * Clear parent references recursively (used before restoring tree)
     * @param node - Starting node
     */
    clearParentReferences(node: TreeNode): void {
      node.parent = undefined;
      for (const child of node.children) {
        this.clearParentReferences(child);
      }
    },

    /**
     * Clean up children arrays to remove nodes where parent reference doesn't match
     * This fixes cases where a node appears in multiple children arrays after restore
     * @param node - Starting node
     */
    cleanupChildrenArrays(node: TreeNode): void {
      // Filter children to only keep nodes where this node is the parent
      node.children = node.children.filter(child => child.parent === node);

      // Remove duplicate node IDs from children array
      const seenIds = new Set<string>();
      node.children = node.children.filter((child) => {
        if (seenIds.has(child.id)) {
          return false; // Duplicate, remove it
        }
        seenIds.add(child.id);
        return true;
      });

      // Recursively clean up children
      for (const child of node.children) {
        this.cleanupChildrenArrays(child);
      }
    },

    /**
     * Build node map recursively from root
     * @param node - Starting node
     * @param parent - Parent node (optional, for restoring parent references)
     */
    buildNodeMap(node: TreeNode, parent?: TreeNode): void {
      this.nodeMap.set(node.id, node);

      // Restore parent reference if provided
      if (parent) {
        node.parent = parent;
      }

      // Also add to clade map if it's a clade (use normalized key)
      if (node.type === "clade" && node.name) {
        const normalizedName = this.normalizeCladeName(node.name);
        this.cladeMap.set(normalizedName, node);
      }

      for (const child of node.children) {
        this.buildNodeMap(child, node);
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
     * Reset game state for current mode
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
