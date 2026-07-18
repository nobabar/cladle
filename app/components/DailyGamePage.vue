<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from "vue";
import type { Animal } from "~/types/animal";
import type { TreeNode } from "~/types/tree";
import { useDailyPuzzleTime } from "~/composables/useDailyPuzzleTime";
import { useResponsive } from "~/composables/useResponsive";
import { DEFAULT_MAX_GUESSES, useGameStore } from "~/stores/gameStore";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { useOnboardingTour } from "~/composables/useOnboardingTour";
import { apiErrorToGameError } from "~/utils/errorMessages";
import { selectTargetAnimalWithDifficulty } from "~/utils/puzzleSelector";
import {
  buildHistoryEntry,
  clearOldHistory,
  savePuzzleToHistory,
} from "~/utils/puzzleHistory";
import { useHintRequest } from "~/composables/useHintRequest";

const props = withDefaults(
  defineProps<{
    /**
     * When true, this instance is a frozen visual backdrop (e.g. under help/privacy).
     * Skip onboarding prompt scheduling and tour auto-start.
     */
    isBackdrop?: boolean;
  }>(),
  { isBackdrop: false },
);

const gameStore = useGameStore();
const {
  hintAnnouncement,
  hintDisabledReasonKey,
  isHintControlDisabled,
  handleHintConfirm,
} = useHintRequest();
const route = useRoute();
const router = useRouter();
const isDevMode = computed(() => import.meta.dev);
const api = useBiologicalAPI();
const { isDesktop } = useResponsive();
const { t } = useI18n();

const { hasCompletedOnboarding, startDailyTour, markOnboardingAsCompleted } = useOnboardingTour();
const showOnboardingPrompt = ref(false);
const ONBOARDING_PROMPT_DELAY_MS = 2000;
/** Transient dismiss after this many meaningful game actions (not arbitrary clicks). */
const ONBOARDING_PROMPT_DISMISS_AFTER_ACTIONS = 3;
const ONBOARDING_SEARCH_ENGAGEMENT_MIN_CHARS = 2;
let onboardingPromptTimer: ReturnType<typeof setTimeout> | null = null;
let onboardingPromptActionCount = 0;
let hasRecordedSearchEngagement = false;

function resetOnboardingPromptActionCount() {
  onboardingPromptActionCount = 0;
  hasRecordedSearchEngagement = false;
}

function cancelOnboardingPrompt() {
  if (onboardingPromptTimer) {
    clearTimeout(onboardingPromptTimer);
    onboardingPromptTimer = null;
  }
  resetOnboardingPromptActionCount();
  showOnboardingPrompt.value = false;
}

/** Hide the entry prompt for this visit only (skip still persists dismissal). */
function dismissOnboardingPromptForSession() {
  cancelOnboardingPrompt();
}

function recordOnboardingPromptAction() {
  if (!showOnboardingPrompt.value && !onboardingPromptTimer) {
    return;
  }
  onboardingPromptActionCount += 1;
  if (onboardingPromptActionCount >= ONBOARDING_PROMPT_DISMISS_AFTER_ACTIONS) {
    dismissOnboardingPromptForSession();
  }
}

function handleSearchInput(value: string) {
  if (
    hasRecordedSearchEngagement
    || value.trim().length < ONBOARDING_SEARCH_ENGAGEMENT_MIN_CHARS
  ) {
    return;
  }
  hasRecordedSearchEngagement = true;
  recordOnboardingPromptAction();
}

function handleStartOnboarding() {
  cancelOnboardingPrompt();
  startDailyTour();
}

function handleSkipOnboarding() {
  cancelOnboardingPrompt();
  markOnboardingAsCompleted();
}

const treeData = computed(() => gameStore.treeData);
const guessHistory = computed(() => gameStore.guesses.map(g => g.animal));

/**
 * Handle animal selection - process as a guess
 * @param animal - The validated animal
 */
function handleAnimalSelect(animal: Animal) {
  recordOnboardingPromptAction();
  try {
    // Clear any previous errors
    gameStore.clearError();

    // Set tree rendering state
    gameStore.setRenderingTree(true);

    // Animal already has full lineage data from validation
    gameStore.processGuess(animal);
    window.dispatchEvent(new CustomEvent("cladle:onboarding:guess-submitted"));

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
  recordOnboardingPromptAction();
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
      console.error("Failed to select target animal:", error);
      gameStore.setError({
        message: t("errors.gameStart"),
        code: "GAME_START_ERROR",
        type: "data",
        details: error,
      });
      gameStore.setLoading(false);
      return;
    }

    const animalResponse = await api.fetchAnimalData(targetAnimalId);

    if (animalResponse.error || !animalResponse.data) {
      if (animalResponse.error) {
        gameStore.setError(apiErrorToGameError(animalResponse.error));
      } else {
        gameStore.setError({
          message: t("errors.gameStart"),
          code: "GAME_START_ERROR",
          type: "network",
        });
      }
      gameStore.setLoading(false);
      return;
    }

    gameStore.initializeGame(animalResponse.data, DEFAULT_MAX_GUESSES, puzzleDate, "daily");
    gameStore.setLoading(false);
  } catch (error) {
    gameStore.setLoading(false);

    if (error instanceof Error) {
      gameStore.setError({
        message: t("errors.gameStart"),
        code: "GAME_START_ERROR",
        type: "network",
        details: error,
      });
    }
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

  if (gameStore.shouldResetForNewDay()) {
    gameStore.resetForNewDay();
    void startNewGame();
    return;
  }

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
    if (props.isBackdrop) {
      return;
    }
    if (route.query.startTour === "1") {
      cancelOnboardingPrompt();
      startDailyTour();
      const nextQuery = { ...route.query };
      delete nextQuery.startTour;
      void router.replace({ query: nextQuery });
      return;
    }
    if (!hasCompletedOnboarding.value) {
      onboardingPromptTimer = setTimeout(() => {
        showOnboardingPrompt.value = true;
      }, ONBOARDING_PROMPT_DELAY_MS);
    }
  });
});

onBeforeUnmount(() => {
  if (onboardingPromptTimer) {
    clearTimeout(onboardingPromptTimer);
    onboardingPromptTimer = null;
  }
});
</script>

<template>
  <div class="notebook-layout">
    <Transition name="onboarding-prompt">
      <div
        v-if="showOnboardingPrompt"
        class="onboarding-entry-card fixed z-[1200] left-4 right-4 bottom-16 sm:bottom-6 sm:right-auto
          sm:max-w-sm sm:w-auto
          bg-[var(--color-paper)] border border-[var(--color-border-subtle)] rounded-lg
          shadow-lg p-4"
      >
        <h2 class="text-base sm:text-lg font-semibold text-[var(--color-ink)] mb-2">
          {{ t("onboarding.prompt.title") }}
        </h2>
        <p class="text-sm text-[var(--color-ink-muted)] mb-3">
          {{ t("onboarding.prompt.body") }}
        </p>
        <div class="flex items-center gap-2 justify-end">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            @click="handleSkipOnboarding"
          >
            {{ t("onboarding.prompt.skip") }}
          </UButton>
          <UButton
            color="primary"
            size="sm"
            @click="handleStartOnboarding"
          >
            {{ t("onboarding.prompt.start") }}
          </UButton>
        </div>
      </div>
    </Transition>

    <!-- Notebook-style layout shell: desk background, paper sheet, and pattern -->
    <div class="notebook-sheet">
      <!-- Holes in margin area -->
      <div class="notebook-holes" aria-hidden="true" />
      <!-- Game page structure -->
      <div class="container mx-auto">
        <!-- Header -->
        <header class="mb-4 sm:mb-6 md:mb-8 relative">
          <GameGlobalHeaderControls
            data-onboarding="daily-header"
            game-mode="daily"
            :is-replay-mode="gameStore.isReplayMode"
            :puzzle-date="gameStore.puzzleDate"
            :next-puzzle-in="nextPuzzleIn"
            :is-soon="isSoon"
            @exit-replay="gameStore.exitReplay()"
          />
          <h1
            class="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-4
              max-sm:px-[5.25rem] sm:px-0"
          >
            Cladle
          </h1>
          <p
            class="text-center text-sm sm:text-base text-[var(--color-ink-subtle)]
              dark:text-[var(--color-ink-subtle)]"
          >
            {{ t("daily.subtitle") }}
          </p>
        </header>

        <!-- Loading Indicator (Global) -->
        <GameLoadingIndicator
          v-if="gameStore.isLoading"
          :message="t('common.loadingGameData')"
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
            {{ t("game.guessesRemaining") }}: <strong>{{ gameStore.guessesRemaining }}</strong>
          </p>
        </div>

        <!-- Animal Search Component -->
        <div
          data-onboarding="daily-search"
          class="max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8"
        >
          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1">
              <GameAnimalSearch
                :disabled="!gameStore.isPlaying || gameStore.isReplayMode"
                :placeholder="t('game.searchPlaceholder')"
                :guess-history="guessHistory"
                @input="handleSearchInput"
                @select="handleAnimalSelect"
              />
            </div>
            <GameHintControl
              v-if="gameStore.isPlaying"
              :disabled="isHintControlDisabled"
              :disabled-reason="hintDisabledReasonKey"
              :announcement="hintAnnouncement"
              @confirm="handleHintConfirm"
            />
          </div>
          <!-- First-time user hint (progressive disclosure) -->
          <p
            v-if="gameStore.isPlaying && gameStore.guesses.length === 0"
            class="mt-2 text-xs sm:text-sm text-center text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)]"
          >
            {{ t("game.firstGuessHint") }}
          </p>
        </div>

        <!-- Phylogenetic Tree Visualization -->
        <div
          data-onboarding="daily-tree"
          class="max-w-6xl mx-auto mt-4 sm:mt-6 md:mt-8 mb-4 sm:mb-6 md:mb-8"
        >
          <h2 class="text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4 text-center">
            {{ t("game.phylogeneticTree") }}
          </h2>
          <!-- Progressive disclosure: Show hint only when tree is empty -->
          <p
            v-if="!treeData || treeData.nodes.length === 0"
            class="text-xs sm:text-sm text-center text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)] mb-2"
          >
            {{ t("game.treeEmptyHint") }}
          </p>
          <!-- Tree Rendering Loading Indicator -->
          <div
            v-if="gameStore.isRenderingTree"
            class="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]
            flex items-center justify-center"
          >
            <GameLoadingIndicator
              :message="t('common.updatingTree')"
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
            <span class="hidden sm:inline">{{ t("game.treeInteractionHintDesktop") }}</span>
            <span class="sm:hidden">{{ t("game.treeInteractionHintMobile") }}</span>
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
            {{ t("game.recentGuesses") }}
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
                {{ t("game.lcaLabel") }}: {{ guess.lca.clade }}
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
