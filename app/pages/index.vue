<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, watchEffect } from "vue";
import type { Animal } from "~/types/animal";
import type { TreeNode } from "~/types/tree";
import type { ValidationError } from "~/utils/animalValidator";
import { useDailyPuzzleTime } from "~/composables/useDailyPuzzleTime";
import { DEFAULT_MAX_GUESSES, useGameStore } from "~/stores/gameStore";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { apiErrorToGameError } from "~/utils/errorMessages";
import { selectTargetAnimalWithDifficulty } from "~/utils/puzzleSelector";
import {
  buildHistoryEntry,
  clearOldHistory,
  savePuzzleToHistory,
} from "~/utils/puzzleHistory";

// Main game page - foundation for game interface
// This page will be extended with game components in future stories

const gameStore = useGameStore();
const api = useBiologicalAPI();

/**
 * Color mode toggle
 */
const colorMode = useColorMode();

/**
 * Toggle between light and dark mode
 */
function toggleColorMode() {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
}

/**
 * Get current color mode icon
 */
const colorModeIcon = computed(() => colorMode.value === "dark" ? "i-lucide-sun" : "i-lucide-moon");

/**
 * Get color mode label for accessibility
 */
const colorModeLabel = computed(() => colorMode.value === "dark"
  ? "Switch to light mode"
  : "Switch to dark mode");

/**
 * Get tree data from game store
 */
const treeData = computed(() => gameStore.treeData);

/**
 * Get guess history from game store for duplicate prevention
 */
const guessHistory = computed(() => gameStore.guesses.map(g => g.animal));

/**
 * Handle animal selection - process as a guess
 * @param animal - The validated animal
 */
function handleAnimalSelect(animal: Animal) {
  try {
    // Clear any previous errors
    gameStore.clearError();

    // Set tree rendering state
    gameStore.setRenderingTree(true);

    // Animal already has full taxonomy data from validation
    gameStore.processGuess(animal);

    // Clear tree rendering state after a short delay to allow animation
    setTimeout(() => {
      gameStore.setRenderingTree(false);
    }, 500);
  } catch (error) {
    // Handle game state errors
    gameStore.setRenderingTree(false);
    if (error instanceof Error) {
      // Convert to GameError and set in store
      gameStore.setError({
        message: error.message,
        code: "GAME_STATE_ERROR",
        type: "ui",
        details: error,
      });
    }
  }
}

/**
 * Handle validation errors
 * Validation errors are shown inline in the search component, not as store-level errors
 * @param _error - The validation error that occurred (unused, handled inline)
 */
function handleValidationError(_error: ValidationError) {
  // Validation errors are handled inline in the search component
  // Only critical errors (network, data) should be set in the store
  // This prevents duplicate error messages
}

/**
 * Handle input events
 * @param _value - The input value (currently unused)
 */
function handleInput(_value: string) {
  // Input event handler - can be used for additional logic if needed
  // The component now handles API calls internally
}

/**
 * Information panel state
 */
const isInformationPanelOpen = ref(false);
const selectedNode = ref<TreeNode | null>(null);

/**
 * Handle node click events from tree visualization
 * Opens the information panel with the clicked node's data
 * Closes the panel if the same node is clicked again (optional enhancement)
 * @param node - The tree node that was clicked
 */
function handleNodeClick(node: TreeNode) {
  // If clicking the same node and panel is open, close it
  if (selectedNode.value?.id === node.id && isInformationPanelOpen.value) {
    isInformationPanelOpen.value = false;
    selectedNode.value = null;
    return;
  }

  // Otherwise, open/update panel with new node
  selectedNode.value = node;
  isInformationPanelOpen.value = true;
}

/**
 * Handle information panel close
 */
function handleInformationPanelClose() {
  isInformationPanelOpen.value = false;
  selectedNode.value = null;
}

/**
 * Watch for game state changes and close panel when appropriate
 * Closes panel on: new guess, game reset, game won/lost
 */
watch(
  () => [gameStore.status, gameStore.guesses.length],
  () => {
    // Close panel on game state changes that affect the tree
    // This includes: new guesses, game reset, game won/lost
    if (isInformationPanelOpen.value) {
      // Close panel smoothly when game state changes
      isInformationPanelOpen.value = false;
      selectedNode.value = null;
    }
  },
);

/**
 * Start a new game with a target animal selected from the puzzle selector
 * Uses the current date to deterministically select a target animal
 */
async function startNewGame() {
  // Clear any previous errors
  gameStore.clearError();

  // Set loading state
  gameStore.setLoading(true);

  try {
    // Get current date in YYYY-MM-DD format
    const puzzleDate = gameStore.getCurrentDate();

    // Select target animal based on current date (deterministic selection)
    let targetAnimalId: string;
    try {
      targetAnimalId = selectTargetAnimalWithDifficulty(puzzleDate);
    } catch (error) {
      // If puzzle selector fails, fallback to default animal
      console.error("Failed to select target animal:", error);
      targetAnimalId = "41967"; // Tiger as fallback
    }

    // Fetch full animal data from API to ensure we have complete, accurate data
    const animalResponse = await api.fetchAnimalData(targetAnimalId);

    if (animalResponse.error || !animalResponse.data) {
      // Convert API error to GameError
      if (animalResponse.error) {
        const gameError = apiErrorToGameError(animalResponse.error);
        gameStore.setError(gameError);
      }

      // Fallback to hardcoded data if API fails
      const fallbackTarget: Animal = {
        id: targetAnimalId,
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
      gameStore.initializeGame(fallbackTarget, DEFAULT_MAX_GUESSES, puzzleDate, "daily");
      gameStore.setLoading(false);
      return;
    }

    // Use the real animal data from the API and initialize with puzzle date and daily mode
    gameStore.initializeGame(animalResponse.data, DEFAULT_MAX_GUESSES, puzzleDate, "daily");
    gameStore.setLoading(false);
  } catch (error) {
    gameStore.setLoading(false);

    // Convert error to GameError
    if (error instanceof Error) {
      gameStore.setError({
        message: "Failed to start game. Please try again.",
        code: "GAME_START_ERROR",
        type: "network",
        details: error,
      });
    }

    // Fallback to hardcoded data on error
    const puzzleDate = gameStore.getCurrentDate();
    const fallbackTarget: Animal = {
      id: "41967",
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
    gameStore.initializeGame(fallbackTarget, DEFAULT_MAX_GUESSES, puzzleDate, "daily");
  }
}

/**
 * Check if an error is critical and should be displayed as GameErrorMessage
 * Critical errors are network, data, or UI errors that affect the game state
 * Validation errors are not critical and should only be shown inline
 * @param error - The error to check
 * @param error.type - The error type (network, data, ui, validation)
 * @param error.code - Optional error code for additional filtering
 * @returns True if the error is critical
 */
function isCriticalError(error: { type: string; code?: string }): boolean {
  // Only show GameErrorMessage for network, data, or critical UI errors
  // Validation errors are shown inline in the search component
  const isNetworkOrData = error.type === "network" || error.type === "data";
  const isCriticalUI = error.type === "ui"
    && error.code !== "VALIDATION_ERROR"
    && error.code !== "DUPLICATE";
  return isNetworkOrData || isCriticalUI;
}

/**
 * Watch for treeData changes and rebuild maps when it's restored from persistence
 */
watchEffect(() => {
  if (gameStore.treeData && gameStore.treeData.root) {
    // Rebuild maps when treeData is available (e.g., after persistence restore)
    gameStore.rebuildMapsFromTree();
  }
});

/**
 * Check if we need to initialize a new daily puzzle (e.g., date changed)
 */
function checkAndInitializeDailyPuzzle() {
  // If we're switching from another mode, restore daily state
  if (gameStore.gameMode && gameStore.gameMode !== "daily") {
    gameStore.switchGameMode("daily");
    // If we have valid state after restore, don't initialize new game
    if (gameStore.target && gameStore.puzzleDate === gameStore.getCurrentDate()) {
      return;
    }
  }

  // Check if we have valid restored state - if so, don't initialize
  // Valid state means: we have a target, we're in the right mode, puzzle date matches (for daily), and we're not idle
  // Also check if we have guesses - if we do, state was definitely restored
  const hasValidRestoredState = gameStore.target
    && gameStore.gameMode === "daily"
    && gameStore.puzzleDate === gameStore.getCurrentDate()
    && gameStore.status !== "idle"
    && (gameStore.guesses.length > 0 || gameStore.treeData); // If we have guesses or treeData, state was restored

  if (hasValidRestoredState) {
    // State was restored from persistence, don't initialize new game
    return;
  }

  // Also check if we have any state at all (might be from persistence but not yet in daily mode)
  // If we have guesses or treeData, we definitely have restored state
  if (gameStore.target && (gameStore.guesses.length > 0 || gameStore.treeData)) {
    // We have restored state - set mode if not set and don't initialize
    if (gameStore.gameMode === null) {
      // Determine mode from puzzleDate
      gameStore.gameMode = gameStore.puzzleDate === "" ? "free-play" : "daily";
    }
    // If we're in daily mode and puzzle date matches, or free-play mode, don't initialize
    if (
      (gameStore.gameMode === "daily" && gameStore.puzzleDate === gameStore.getCurrentDate())
      || (gameStore.gameMode === "free-play" && gameStore.puzzleDate === "")
    ) {
      // Valid restored state, don't initialize
      return;
    }
  }

  // Check if we need to initialize - only if we don't have valid restored state
  const needsInitialization = !gameStore.target
    || gameStore.status === "idle"
    || (gameStore.gameMode === "daily" && gameStore.puzzleDate !== gameStore.getCurrentDate());

  if (needsInitialization) {
    startNewGame();
  }
}

// Daily puzzle time: midnight reset + countdown to next puzzle (two-tier, SSR-safe)
const { nextPuzzleIn, isSoon } = useDailyPuzzleTime({ onReset: startNewGame });

/** Save completed daily puzzle to history (and cleanup old entries). Skip when in replay mode. */
watch(
  () => gameStore.status,
  (status) => {
    if (
      (status !== "won" && status !== "lost")
      || gameStore.gameMode !== "daily"
      || gameStore.isReplayMode
      || !gameStore.target
      || !gameStore.puzzleDate
    ) {
      return;
    }
    try {
      clearOldHistory(30);
      const entry = buildHistoryEntry(
        gameStore.puzzleDate,
        gameStore.target,
        status,
        gameStore.guesses,
        gameStore.treeData,
      );
      savePuzzleToHistory(entry);
    } catch (e) {
      if (e instanceof Error && e.message.includes("storage full")) {
        gameStore.setError({
          message: e.message,
          code: "STORAGE_ERROR",
          type: "ui",
          details: e,
        });
      }
    }
  },
);

/**
 * Initialize game on mount if not already started or if we're switching to daily mode
 */
onMounted(() => {
  // Wait for next tick to ensure persist plugin has restored state
  nextTick(() => {
    checkAndInitializeDailyPuzzle();
  });
});
</script>

<template>
  <div class="notebook-layout">
    <!-- Notebook-style layout shell: desk background, paper sheet, and pattern -->
    <div class="notebook-sheet">
      <!-- Holes in margin area -->
      <div class="notebook-holes" aria-hidden="true" />
      <!-- Game page structure -->
      <div class="container mx-auto">
        <!-- Header -->
        <header class="mb-4 sm:mb-6 md:mb-8 relative">
          <!-- Notebook-style date in top-left corner (always show calendar date) -->
          <div
            v-if="gameStore.puzzleDate"
            class="absolute top-0 right-0 sm:top-5 sm:left-2 flex flex-col gap-2"
          >
            <GamePuzzleDateDisplay
              :puzzle-date="gameStore.puzzleDate"
              format="short"
            />
            <GameNextPuzzleTimer
              :next-puzzle-in="nextPuzzleIn"
              :show-timer="isSoon"
            />
          </div>
          <!-- Replay mode: back to today's puzzle -->
          <div
            v-if="gameStore.isReplayMode"
            class="absolute top-0 left-0 sm:top-12 sm:left-2"
          >
            <UButton
              variant="ghost"
              size="sm"
              icon="i-lucide-arrow-left"
              aria-label="Back to today's puzzle"
              class="text-[var(--color-ink-subtle)]"
              @click="gameStore.exitReplay()"
            >
              Back to today
            </UButton>
          </div>
          <!-- Navigation and Color Mode Toggle -->
          <div class="absolute top-0 right-0 sm:top-2 sm:right-2 flex">
            <!-- Puzzle history (daily mode only) -->
            <GamePuzzleHistory v-if="!gameStore.isReplayMode && gameStore.gameMode === 'daily'" />
            <!-- Free Play Link -->
            <UButton
              to="/free-play"
              icon="i-lucide-infinity"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Go to free play mode"
              title="Free Play"
              class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
                notebook-button-secondary cursor-pointer"
            />
            <!-- Color Mode Toggle -->
            <UButton
              :icon="colorModeIcon"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="colorModeLabel"
              :title="colorModeLabel"
              class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
                notebook-button-secondary cursor-pointer"
              @click="toggleColorMode"
            />
          </div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-4">
            Cladle
          </h1>
          <p
            class="text-center text-sm sm:text-base text-[var(--color-ink-subtle)]
              dark:text-[var(--color-ink-subtle)]"
          >
            Daily Puzzle
          </p>
          <p
            class="text-center text-xs sm:text-sm text-[var(--color-ink-subtle)]
              dark:text-[var(--color-ink-subtle)] mt-1"
          >
            New puzzle every day
          </p>
        </header>

        <!-- Loading Indicator (Global) -->
        <GameLoadingIndicator
          v-if="gameStore.isLoading"
          message="Loading game data..."
          full-screen
        />

        <!-- Store-Level Error Display (Critical Errors Only) -->
        <div
          v-if="gameStore.error && isCriticalError(gameStore.error)"
          class="max-w-2xl mx-auto mb-4"
        >
          <GameErrorMessage
            :error="gameStore.error"
            @dismiss="gameStore.clearError"
          />
        </div>

        <!-- Game Status Display -->
        <div
          v-if="gameStore.isPlaying"
          class="max-w-2xl mx-auto mb-3 sm:mb-4 text-center"
        >
          <p
            class="text-xs sm:text-sm text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)]"
          >
            Guesses remaining: <strong>{{ gameStore.guessesRemaining }}</strong>
          </p>
        </div>

        <!-- Animal Search Component -->
        <div class="max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8">
          <GameAnimalSearch
            :disabled="!gameStore.isPlaying || gameStore.isReplayMode"
            placeholder="Search for an animal..."
            :guess-history="guessHistory"
            @select="handleAnimalSelect"
            @input="handleInput"
            @validation-error="handleValidationError"
          />
          <!-- First-time user hint (progressive disclosure) -->
          <p
            v-if="gameStore.isPlaying && gameStore.guesses.length === 0"
            class="mt-2 text-xs sm:text-sm text-center text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)]"
          >
            Start by searching for an animal to see how it relates to the target
          </p>
        </div>

        <!-- Phylogenetic Tree Visualization -->
        <div class="max-w-6xl mx-auto mt-4 sm:mt-6 md:mt-8 mb-4 sm:mb-6 md:mb-8">
          <h2 class="text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4 text-center">
            Phylogenetic Tree
          </h2>
          <!-- Progressive disclosure: Show hint only when tree is empty -->
          <p
            v-if="!treeData || treeData.nodes.length === 0"
            class="text-xs sm:text-sm text-center text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)] mb-2"
          >
            Make your first guess to see the phylogenetic tree
          </p>
          <!-- Tree Rendering Loading Indicator -->
          <div
            v-if="gameStore.isRenderingTree"
            class="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]
            flex items-center justify-center"
          >
            <GameLoadingIndicator
              message="Updating tree..."
              size="md"
            />
          </div>
          <div
            v-else
            class="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]"
          >
            <GameTreeVisualization
              :tree-data="treeData"
              :show-target="false"
              class="w-full h-full"
              @nodeClick="handleNodeClick"
            />
          </div>
          <!-- Progressive disclosure: Show interaction hint when tree has data -->
          <p
            v-if="treeData && treeData.nodes.length > 0"
            class="mt-2 text-xs sm:text-sm text-center text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)]"
          >
            <span class="hidden sm:inline">Click on nodes to explore details</span>
            <span class="sm:hidden">Tap nodes to explore</span>
          </p>
        </div>

        <!-- Game Info Display (Progressive Disclosure) -->
        <div
          v-if="gameStore.isPlaying && gameStore.guesses.length > 0"
          class="max-w-2xl mx-auto mt-4 sm:mt-6 md:mt-8 notebook-guess-history"
        >
          <h2
            class="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4
            text-[var(--color-ink)] dark:text-[var(--color-ink)]"
          >
            Recent Guesses
          </h2>
          <ul class="space-y-0">
            <li
              v-for="guess in gameStore.guesses.slice().reverse().slice(0, 3)"
              :key="guess.timestamp"
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center
              gap-1 sm:gap-2 py-2 sm:py-3 border-b border-[var(--color-border-subtle)]
              dark:border-[var(--color-border-subtle)] last:border-b-0
              notebook-guess-row"
            >
              <span
                class="font-medium text-sm sm:text-base text-[var(--color-ink)]
                dark:text-[var(--color-ink)]"
              >
                {{ guess.animal.name }}
              </span>
              <span
                class="text-xs sm:text-sm text-[var(--color-ink-subtle)]
                dark:text-[var(--color-ink-subtle)] before:content-['['] after:content-[']']"
              >
                LCA: {{ guess.lca.clade }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Win/Loss State Component - positioned relative to notebook-sheet -->
      <GameWinState />

      <!-- Information Panel Component - positioned relative to notebook-sheet -->
      <GameInformationPanelPostit
        :is-open="isInformationPanelOpen"
        :node-data="selectedNode"
        @close="handleInformationPanelClose"
        @update:is-open="isInformationPanelOpen = $event"
      />
    </div>
  </div>
</template>
