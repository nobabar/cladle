<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, watchEffect } from "vue";
import type { Animal } from "~/types/animal";
import type { TreeNode } from "~/types/tree";
import { useDailyPuzzleTime } from "~/composables/useDailyPuzzleTime";
import { useResponsive } from "~/composables/useResponsive";
import { useGameStore } from "~/stores/gameStore";
import { BABY_MODE_MAX_GUESSES, babyModeStickerMap, hasBabyModeCladeInCatalog, selectBabyModeTarget, simplifyBabyModeTree } from "~/utils/babyMode";
import { getBabyModeAnimal, listBabyModeAnimals } from "~/utils/babyModeBundle";

const gameStore = useGameStore();
const { isDesktop } = useResponsive();
const { t, te } = useI18n();

const treeData = computed(() => {
  if (!gameStore.treeData) {
    return null;
  }
  return simplifyBabyModeTree(gameStore.treeData, hasBabyModeCladeInCatalog);
});
const guessHistory = computed(() => gameStore.guesses.map(g => g.animal));
const stickerByAnimalId = computed(() => babyModeStickerMap());

const localizedBabyAnimals = computed(() =>
  listBabyModeAnimals().map((animal) => {
    const key = `babyMode.organisms.${animal.id}`;
    return {
      ...animal,
      name: te(key) ? t(key) : animal.name,
    };
  }),
);

function handleAnimalSelect(animal: Animal) {
  try {
    gameStore.clearError();
    gameStore.setRenderingTree(true);
    gameStore.processGuess(animal);
    setTimeout(() => {
      gameStore.setRenderingTree(false);
    }, 500);
  } catch (error) {
    gameStore.setRenderingTree(false);
    if (error instanceof Error) {
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

function handleNodeClick(node: TreeNode) {
  if (selectedNode.value?.id === node.id && isInformationPanelOpen.value) {
    isInformationPanelOpen.value = false;
    selectedNode.value = null;
    return;
  }
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

watch(
  () => [gameStore.status, gameStore.guesses.length],
  () => {
    if (isInformationPanelOpen.value) {
      isInformationPanelOpen.value = false;
      selectedNode.value = null;
    }
  },
);

function isCriticalError(error: { type: string; code?: string }): boolean {
  const isNetworkOrData = error.type === "network" || error.type === "data";
  const isCriticalUI = error.type === "ui"
    && error.code !== "VALIDATION_ERROR"
    && error.code !== "DUPLICATE";
  return isNetworkOrData || isCriticalUI;
}

watchEffect(() => {
  if (gameStore.treeData && gameStore.treeData.root) {
    gameStore.rebuildMapsFromTree();
  }
});

function startBabyGame(forceNew = false): void {
  gameStore.clearError();
  gameStore.setLoading(true);

  try {
    const puzzleDate = gameStore.getCurrentDate();
    const targetId = selectBabyModeTarget(puzzleDate);
    const targetAnimal = getBabyModeAnimal(targetId);

    if (!targetAnimal) {
      gameStore.setError({
        message: t("babyMode.errors.bundleUnavailable"),
        code: "BABY_BUNDLE_UNAVAILABLE",
        type: "data",
      });
      gameStore.setLoading(false);
      return;
    }

    gameStore.initializeGame(
      targetAnimal,
      BABY_MODE_MAX_GUESSES,
      puzzleDate,
      "baby",
      forceNew,
    );
    gameStore.setLoading(false);
  } catch (error) {
    gameStore.setLoading(false);
    if (error instanceof Error) {
      gameStore.setError({
        message: t("babyMode.errors.bundleUnavailable"),
        code: "BABY_BUNDLE_UNAVAILABLE",
        type: "data",
        details: error,
      });
    }
  }
}

function restoreBabyModeStateIfNeeded(): void {
  const today = gameStore.getCurrentDate();

  if (gameStore.gameMode && gameStore.gameMode !== "baby") {
    gameStore.switchGameMode("baby");
    return;
  }

  if (gameStore.gameMode === "baby" && gameStore.babyModeState && !gameStore.target) {
    gameStore.restoreModeState("baby");
    return;
  }

  if (
    gameStore.gameMode === null
    && gameStore.babyModeState
    && gameStore.babyModeState.puzzleDate === today
  ) {
    gameStore.gameMode = "baby";
    gameStore.restoreModeState("baby");
  }
}

function checkAndInitializeBabyPuzzle(): void {
  restoreBabyModeStateIfNeeded();

  if (gameStore.shouldResetForNewDay()) {
    gameStore.resetBabyForNewDay();
    startBabyGame();
    return;
  }

  const today = gameStore.getCurrentDate();
  const hasValidBabyState = gameStore.target
    && gameStore.gameMode === "baby"
    && gameStore.puzzleDate === today
    && gameStore.status !== "idle";

  if (hasValidBabyState) {
    return;
  }

  const needsInitialization = gameStore.gameMode !== "baby"
    || !gameStore.target
    || gameStore.status === "idle"
    || gameStore.puzzleDate !== today;

  if (needsInitialization) {
    startBabyGame();
  }
}

const { nextPuzzleIn, isSoon } = useDailyPuzzleTime({ onReset: () => startBabyGame() });

onMounted(() => {
  nextTick(() => {
    checkAndInitializeBabyPuzzle();
  });
});
</script>

<template>
  <div class="notebook-layout">
    <div class="notebook-sheet">
      <div class="notebook-holes" aria-hidden="true" />
      <div class="container mx-auto">
        <header class="mb-4 sm:mb-6 md:mb-8 relative">
          <GameGlobalHeaderControls
            game-mode="baby"
            :puzzle-date="gameStore.puzzleDate"
            :next-puzzle-in="nextPuzzleIn"
            :is-soon="isSoon"
          />
          <h1
            class="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-4
              max-sm:px-[5.25rem] sm:px-0"
          >
            {{ t("babyMode.title") }}
          </h1>
          <p
            class="text-center text-sm sm:text-base text-[var(--color-ink-subtle)]
              dark:text-[var(--color-ink-subtle)] max-w-2xl mx-auto"
          >
            {{ t("babyMode.subtitle") }}
          </p>
        </header>

        <GameLoadingIndicator
          v-if="gameStore.isLoading"
          :message="t('common.loadingGameData')"
          full-screen
        />

        <div
          v-if="gameStore.error && isCriticalError(gameStore.error)"
          class="max-w-2xl mx-auto mb-4"
        >
          <GameErrorMessage
            :error="gameStore.error"
            @dismiss="gameStore.clearError"
          />
        </div>

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

        <div class="max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8">
          <GameBabyOrganismPicker
            :disabled="!gameStore.isPlaying"
            :animals="localizedBabyAnimals"
            :sticker-by-animal-id="stickerByAnimalId"
            :guess-history="guessHistory"
            @select="handleAnimalSelect"
          />
        </div>

        <div class="max-w-6xl mx-auto mt-4 sm:mt-6 md:mt-8 mb-4 sm:mb-6 md:mb-8">
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
              :show-target="gameStore.hasEnded"
              baby-mode-tree
              :sticker-by-animal-id="stickerByAnimalId"
              class="w-full h-full"
              @nodeClick="handleNodeClick"
            />
          </div>
        </div>
      </div>

      <GameWinState />

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
