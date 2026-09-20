<script setup lang="ts">
/**
 * Full Baby Mode organism set as one phylogenetic tree.
 * Uses standard calculateLCA + gameStore tree construction.
 * Shows both the standard tree and the beginner-simplified view.
 */
import { computed, onMounted, ref } from "vue";
import type { TreeData, TreeNode } from "~/types/tree";
import { useGameStore } from "~/stores/gameStore";
import {
  babyModeStickerMap,
  hasBabyModeCladeInCatalog,
  simplifyBabyModeTree,
} from "~/utils/babyMode";
import { listBabyModeAnimals } from "~/utils/babyModeBundle";

const gameStore = useGameStore();

const treeData = ref<TreeData | null>(null);
const animalCount = ref(0);
const cladeCount = ref(0);
const babyCladeCount = ref(0);
const errorMessage = ref<string | null>(null);
const isBuilding = ref(true);
const stickerByAnimalId = babyModeStickerMap();

const babyTreeData = computed(() => {
  if (!treeData.value) {
    return null;
  }
  return simplifyBabyModeTree(treeData.value, hasBabyModeCladeInCatalog);
});

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

function countClades(root: TreeNode): number {
  let count = 0;
  const walk = (node: TreeNode): void => {
    if (node.type === "clade") {
      count += 1;
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return count;
}

/**
 * Build the full tree via the store's LCA/tree pipeline without persisting
 * into daily / free-play / baby mode snapshots.
 * @returns The built tree data.
 */
function buildFullBabyTree(): TreeData {
  const animals = listBabyModeAnimals();
  if (animals.length === 0) {
    throw new Error("Baby mode bundle has no animals.");
  }

  const previousMode = gameStore.gameMode;
  if (previousMode) {
    gameStore.saveModeState(previousMode);
  }

  // Prevent processGuess from writing mode snapshots while we build.
  gameStore.gameMode = null;

  try {
    const target = animals[0]!;
    const others = animals.slice(1);

    gameStore.startGame(target, animals.length);
    for (const animal of others) {
      // gameMode is null -> standard calculateLCA (no resolveBabyModeLCA).
      gameStore.processGuess(animal);
    }

    if (!gameStore.treeData) {
      throw new Error("Tree was not built.");
    }

    return gameStore.treeData;
  } finally {
    if (previousMode) {
      gameStore.restoreModeState(previousMode);
      gameStore.gameMode = previousMode;
    } else {
      gameStore.status = "idle";
      gameStore.target = null;
      gameStore.guesses = [];
      gameStore.hints = [];
      gameStore.treeData = null;
      gameStore.nodeMap = new Map();
      gameStore.cladeMap = new Map();
    }
  }
}

onMounted(() => {
  try {
    const built = buildFullBabyTree();
    treeData.value = built;
    animalCount.value = built.nodes.filter(node => node.type === "animal").length;
    cladeCount.value = countClades(built.root);
    const simplified = simplifyBabyModeTree(built, hasBabyModeCladeInCatalog);
    babyCladeCount.value = countClades(simplified.root);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to build tree";
  } finally {
    isBuilding.value = false;
  }
});
</script>

<template>
  <div class="notebook-layout">
    <div class="notebook-sheet">
      <div class="notebook-holes" aria-hidden="true" />
      <div class="container mx-auto px-4">
        <header class="mb-4 sm:mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold mb-2">
            Baby Mode: full organism tree
          </h1>
          <p class="text-sm text-[var(--color-ink-subtle)] max-w-2xl">
            All bundled Baby Mode animals, with ancestor clades from
            <code class="text-xs">calculateLCA</code>
            and the standard game tree builder. Standard scientific labels above;
            beginner view (simplified clade names + stickers) below.
          </p>
          <p
            v-if="!isBuilding && !errorMessage"
            class="mt-2 text-sm text-[var(--color-ink-subtle)]"
          >
            {{ animalCount }} animals · {{ cladeCount }} clades (standard)
            · {{ babyCladeCount }} clades (baby)
          </p>
          <NuxtLink
            to="/baby"
            class="inline-block mt-3 text-sm underline text-[var(--color-ink)]"
          >
            ← Back to Baby Mode
          </NuxtLink>
        </header>

        <GameLoadingIndicator
          v-if="isBuilding"
          message="Building full Baby Mode tree…"
          full-screen
        />

        <div
          v-else-if="errorMessage"
          class="max-w-2xl mx-auto rounded border border-red-300 bg-red-50 p-4 text-red-800"
        >
          {{ errorMessage }}
        </div>

        <template v-else>
          <section class="mb-10">
            <h2 class="text-lg font-semibold mb-2">
              Standard tree
            </h2>
            <div class="w-full h-[70vh] min-h-[480px]">
              <GameTreeVisualization
                :tree-data="treeData"
                :show-target="true"
                class="w-full h-full"
                @node-click="handleNodeClick"
              />
            </div>
          </section>

          <section class="mb-8">
            <h2 class="text-lg font-semibold mb-2">
              Baby Mode tree
            </h2>
            <div class="w-full h-[70vh] min-h-[480px]">
              <GameTreeVisualization
                :tree-data="babyTreeData"
                :show-target="true"
                baby-mode-tree
                :sticker-by-animal-id="stickerByAnimalId"
                class="w-full h-full"
                @node-click="handleNodeClick"
              />
            </div>
          </section>
        </template>
      </div>

      <GameInformationPanelPostit
        :is-open="isInformationPanelOpen"
        :node-data="selectedNode"
        position-side="right"
        @close="handleInformationPanelClose"
        @update:is-open="isInformationPanelOpen = $event"
      />
    </div>
  </div>
</template>
