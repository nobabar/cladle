<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, watchEffect } from "vue";
import type { Animal } from "~/types/animal";
import type { TreeNode } from "~/types/tree";
import { useDailyPuzzleTime } from "~/composables/useDailyPuzzleTime";
import { useResponsive } from "~/composables/useResponsive";
import { DEFAULT_MAX_GUESSES, useGameStore } from "~/stores/gameStore";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { apiErrorToGameError } from "~/utils/errorMessages";
import { selectTargetAnimalWithDifficulty } from "~/utils/puzzleSelector";
import {
  buildHistoryEntry,
  clearOldHistory,
  savePuzzleToHistory,
} from "~/utils/puzzleHistory";
import { uiIcon } from "~/utils/uiIcons";

const gameStore = useGameStore();
const isDevMode = computed(() => import.meta.dev);
const api = useBiologicalAPI();
const { isDesktop } = useResponsive();

const puzzleHistoryRef = ref<{ open: () => void } | null>(null);

const colorMode = useColorMode();

function toggleColorMode() {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
}

const colorModeIcon = computed(() =>
  colorMode.value === "dark" ? uiIcon.sun : uiIcon.moon);

const colorModeLabel = computed(() => colorMode.value === "dark"
  ? "Switch to light mode"
  : "Switch to dark mode");

/** Mobile header menu (burger below Tailwind `sm`; same row as icons from `sm` up). */
const headerMobileMenuItems = computed(() => {
  const items: {
    label?: string;
    icon?: string;
    onSelect?: (e: Event) => void;
  }[] = [];

  if (!gameStore.isReplayMode && gameStore.gameMode === "daily") {
    items.push({
      label: "Puzzle history",
      icon: uiIcon.history,
      onSelect: () => {
        puzzleHistoryRef.value?.open();
      },
    });
  }

  items.push(
    {
      label: "Free play",
      icon: uiIcon.infinity,
      onSelect: () => {
        void navigateTo("/free-play");
      },
    },
    {
      label: colorModeLabel.value,
      icon: colorModeIcon.value,
      onSelect: () => {
        toggleColorMode();
      },
    },
  );

  return items;
});

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
 * Ensure daily mode is selected and any persisted daily snapshot is rehydrated
 * into live store fields before we decide whether to initialize a new puzzle.
 */
function restoreDailyModeStateIfNeeded(): void {
  const today = gameStore.getCurrentDate();

  // If we're switching from another mode, restore daily state
  if (gameStore.gameMode && gameStore.gameMode !== "daily") {
    gameStore.switchGameMode("daily");
    return;
  }

  // Persisted mode snapshots can exist while root fields are still empty on reload.
  if (gameStore.gameMode === "daily" && gameStore.dailyState && !gameStore.target) {
    gameStore.restoreModeState("daily");
    return;
  }

  // If mode is missing but a daily snapshot exists for today, infer daily mode and restore.
  if (
    gameStore.gameMode === null
    && gameStore.dailyState
    && gameStore.dailyState.puzzleDate === today
  ) {
    gameStore.gameMode = "daily";
    gameStore.restoreModeState("daily");
  }
}

/**
 * Check if we need to initialize a new daily puzzle (e.g., date changed)
 */
function checkAndInitializeDailyPuzzle() {
  restoreDailyModeStateIfNeeded();

  const today = gameStore.getCurrentDate();
  const hasValidDailyState = gameStore.target
    && gameStore.gameMode === "daily"
    && gameStore.puzzleDate === today
    && gameStore.status !== "idle";

  if (hasValidDailyState) {
    return;
  }

  const needsInitialization = gameStore.gameMode !== "daily"
    || !gameStore.target
    || gameStore.status === "idle"
    || gameStore.puzzleDate !== today;

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
            class="absolute top-0 left-0 z-[1] sm:top-5 sm:left-2 flex flex-col gap-1
              sm:gap-2 items-start"
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
              :icon="uiIcon.return"
              aria-label="Back to today's puzzle"
              class="text-[var(--color-ink-subtle)]"
              @click="gameStore.exitReplay()"
            >
              Back to today
            </UButton>
          </div>
          <!-- Navigation: burger below `sm`; from `sm` up show history + icons in a row -->
          <div
            class="absolute top-0 right-0 z-[1] flex items-center gap-0.5
              sm:top-2 sm:right-2 sm:gap-1"
          >
            <UDropdownMenu
              class="sm:hidden"
              :items="headerMobileMenuItems"
              :external-icon="false"
              :content="{ align: 'start', side: 'bottom', sideOffset: 2 }"
              :ui="{ item: 'items-center' }"
            >
              <template #default="{ open: menuOpen }">
                <UButton
                  :icon="uiIcon.menu"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Open game menu"
                  aria-haspopup="menu"
                  :aria-expanded="menuOpen"
                  class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
                    notebook-button-secondary cursor-pointer"
                />
              </template>
            </UDropdownMenu>

            <div class="hidden sm:flex items-center gap-1">
              <!-- Puzzle history (daily mode only) -->
              <GamePuzzleHistory
                v-if="!gameStore.isReplayMode && gameStore.gameMode === 'daily'"
                ref="puzzleHistoryRef"
              />
              <!-- Free Play Button -->
              <UButton
                to="/free-play"
                :icon="uiIcon.infinity"
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
          </div>
          <h1
            class="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-4
              max-sm:pl-[5.25rem] max-sm:pr-14 sm:px-0"
          >
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

        <!-- Dev-only: recent guesses + LCA -->
        <div
          v-if="isDevMode && gameStore.isPlaying && gameStore.guesses.length > 0"
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
