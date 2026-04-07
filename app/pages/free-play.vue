<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, watchEffect } from "vue";
import type { Animal } from "~/types/animal";
import type { TreeNode } from "~/types/tree";
import { useResponsive } from "~/composables/useResponsive";
import { DEFAULT_MAX_GUESSES, useGameStore } from "~/stores/gameStore";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { apiErrorToGameError } from "~/utils/errorMessages";
import { selectRandomTargetAnimal } from "~/utils/puzzleSelector";

const gameStore = useGameStore();
const api = useBiologicalAPI();
const { isDesktop } = useResponsive();

const colorMode = useColorMode();

function toggleColorMode() {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
}

const colorModeIcon = computed(() => colorMode.value === "dark" ? "i-lucide-sun" : "i-lucide-moon");

const colorModeLabel = computed(() => colorMode.value === "dark"
  ? "Switch to light mode"
  : "Switch to dark mode");

const treeData = computed(() => gameStore.treeData);
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

function handleInformationPanelClose() {
  isInformationPanelOpen.value = false;
  selectedNode.value = null;
}

const infoPanelPositionSide = computed(() =>
  gameStore.hasEnded && isDesktop.value ? "left" as const : "right" as const,
);

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
 * Start a new game with a random target animal (free play mode)
 * Uses random selection to get a new animal each time
 */
async function startNewGame() {
  // Clear any previous errors
  gameStore.clearError();

  // Set loading state
  gameStore.setLoading(true);

  try {
    // Select random target animal (non-deterministic for free play)
    let targetAnimalId: string;
    try {
      targetAnimalId = selectRandomTargetAnimal();
    } catch (error) {
      // If puzzle selector fails, fallback to default animal
      console.error("Failed to select target animal:", error);
      targetAnimalId = "41967"; // Tiger as fallback
    }

    // Fetch full animal data from API to ensure we have complete data
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
      // Free play mode: use empty string for puzzleDate to indicate it's not a daily puzzle
      gameStore.initializeGame(fallbackTarget, DEFAULT_MAX_GUESSES, "", "free-play");
      gameStore.setLoading(false);
      return;
    }

    // Use the real animal data from the API
    // Free play mode: use empty string for puzzleDate to indicate it's not a daily puzzle
    gameStore.initializeGame(animalResponse.data, DEFAULT_MAX_GUESSES, "", "free-play");
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
    // Free play mode: use empty string for puzzleDate
    gameStore.initializeGame(fallbackTarget, DEFAULT_MAX_GUESSES, "", "free-play");
  }
}

/**
 * Reset game and start a new one with a different random animal
 */
async function resetGame() {
  // Clear any previous errors
  gameStore.clearError();

  // Set loading state
  gameStore.setLoading(true);

  try {
    // Select random target animal (non-deterministic for free play)
    let targetAnimalId: string;
    try {
      targetAnimalId = selectRandomTargetAnimal();
    } catch (error) {
      // If puzzle selector fails, fallback to default animal
      console.error("Failed to select target animal:", error);
      targetAnimalId = "41967"; // Tiger as fallback
    }

    // Fetch full animal data from API to ensure we have complete data
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
      // Force new game by passing forceNew flag
      gameStore.initializeGame(fallbackTarget, DEFAULT_MAX_GUESSES, "", "free-play", true);
      gameStore.setLoading(false);
      return;
    }

    // Force new game by passing forceNew flag
    gameStore.initializeGame(animalResponse.data, DEFAULT_MAX_GUESSES, "", "free-play", true);
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
    // Force new game by passing forceNew flag
    gameStore.initializeGame(fallbackTarget, DEFAULT_MAX_GUESSES, "", "free-play", true);
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
 * Initialize game on mount if not already started or if we're switching to free-play mode
 */
onMounted(() => {
  // Wait for next tick to ensure persist plugin has restored state
  nextTick(() => {
    // If we're switching from another mode, restore free-play state
    if (gameStore.gameMode && gameStore.gameMode !== "free-play") {
      gameStore.switchGameMode("free-play");
      // If we have valid state after restore, don't initialize new game
      if (gameStore.target && gameStore.status !== "idle") {
        return;
      }
    }

    // Check if we have valid restored state - if so, don't initialize
    // Also check if we have guesses - if we do, state was definitely restored
    const hasValidRestoredState = gameStore.target
      && gameStore.gameMode === "free-play"
      && gameStore.status !== "idle"
      && (gameStore.guesses.length > 0 || gameStore.treeData); // If we have guesses or treeData, state was restored

    if (hasValidRestoredState) {
      // State was restored from persistence, don't initialize new game
      return;
    }

    // Also check if we have any state at all (might be from persistence but not yet in free-play mode)
    if (gameStore.target && gameStore.gameMode === null) {
      // State exists but no mode set - set mode to free-play
      gameStore.gameMode = "free-play";
      if (gameStore.status !== "idle") {
        // Valid state, don't initialize
        return;
      }
    }

    // Check if we need to initialize - only if we don't have valid restored state
    const needsInitialization = !gameStore.target || gameStore.status === "idle";

    if (needsInitialization) {
      startNewGame();
    }
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
          <!-- Navigation and Color Mode Toggle -->
          <div class="absolute top-0 right-0 sm:top-2 sm:right-2 flex gap-2">
            <!-- Daily Puzzle Link -->
            <UButton
              to="/"
              icon="i-lucide-calendar"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Go to daily puzzle"
              title="Daily Puzzle"
              class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
                notebook-button-secondary"
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
                notebook-button-secondary"
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
            Free Play Mode
          </p>
          <p
            class="text-center text-xs sm:text-sm text-[var(--color-ink-subtle)]
              dark:text-[var(--color-ink-subtle)] mt-1"
          >
            Reset anytime to get a new random animal
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

        <!-- Reset Button -->
        <div class="max-w-2xl mx-auto mb-3 sm:mb-4 text-center">
          <UButton
            :disabled="gameStore.isLoading"
            icon="i-lucide-refresh-cw"
            color="primary"
            variant="solid"
            size="md"
            @click="resetGame"
          >
            New Random Animal
          </UButton>
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
            :disabled="!gameStore.isPlaying"
            placeholder="Search for an animal..."
            :guess-history="guessHistory"
            @select="handleAnimalSelect"
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
          class="max-w-2xl mx-auto mt-4 sm:mt-6 md:mb-8 notebook-guess-history"
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
      <GameWinState @node-click="handleNodeClick" />

      <!-- Information Panel Component - positioned relative to notebook-sheet -->
      <GameInformationPanelPostit
        :is-open="isInformationPanelOpen"
        :node-data="selectedNode"
        :position-side="infoPanelPositionSide"
        @close="handleInformationPanelClose"
        @update:is-open="isInformationPanelOpen = $event"
      />
    </div>
  </div>
</template>
