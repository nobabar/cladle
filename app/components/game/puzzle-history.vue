<script setup lang="ts">
import { computed, ref } from "vue";
import { loadPuzzleHistory } from "~/utils/puzzleHistory";
import { formatPuzzleDate } from "~/utils/dateUtils";
import { useGameStore } from "~/stores/gameStore";
import type { PuzzleHistoryEntry } from "~/types/puzzleHistory";
import { uiIcon } from "~/utils/uiIcons";

const props = withDefaults(
  defineProps<{
    /** When true, no toolbar button is rendered (e.g. mobile menu opens history). */
    hideTrigger?: boolean;
  }>(),
  { hideTrigger: false },
);

const gameStore = useGameStore();
const { t } = useI18n();

const isOpen = ref(false);
const history = ref<PuzzleHistoryEntry[]>([]);

function open() {
  isOpen.value = true;
  history.value = loadPuzzleHistory();
}

function close() {
  isOpen.value = false;
}

/** Sorted by date descending (newest first) */
const sortedHistory = computed(() =>
  [...history.value].sort((a, b) => (b.puzzleDate > a.puzzleDate ? 1 : -1)),
);

function selectEntry(entry: PuzzleHistoryEntry) {
  gameStore.loadReplayFromHistory(entry);
  close();
}

function statusLabel(status: string) {
  if (status === "won") return t("history.status.solved");
  if (status === "lost") return t("history.status.unsolved");
  return t("history.status.inProgress");
}

defineExpose({ open });
</script>

<template>
  <div>
    <UButton
      v-if="!props.hideTrigger"
      :icon="uiIcon.history"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="t('history.open')"
      :title="t('history.title')"
      class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
        notebook-button-secondary cursor-pointer"
      @click="open"
    />
    <UModal v-model:open="isOpen" :ui="{ width: 'max-w-md' }">
      <template #content>
        <div class="p-4 sm:p-6">
          <h2
            class="text-lg font-semibold mb-2 text-[var(--color-ink)]
            dark:text-[var(--color-ink)]"
          >
            {{ t("history.title") }}
          </h2>
          <p
            class="text-sm text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)] mb-4"
          >
            {{ t("history.description") }}
          </p>
          <ul
            v-if="sortedHistory.length > 0"
            class="space-y-2 max-h-[60vh] overflow-y-auto"
          >
            <li
              v-for="entry in sortedHistory"
              :key="entry.puzzleDate"
              class="flex items-center justify-between gap-3 py-2 px-3 rounded-lg
                bg-[var(--color-paper)] dark:bg-[var(--color-paper)]
                border border-[var(--color-ink-muted)]/20"
            >
              <div class="min-w-0">
                <span class="font-medium text-[var(--color-ink)] dark:text-[var(--color-ink)]">
                  {{ formatPuzzleDate(entry.puzzleDate, "short") }}
                </span>
                <span class="ml-2 text-xs text-[var(--color-ink-subtle)]">
                  {{ statusLabel(entry.completionStatus) }}
                </span>
              </div>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                :aria-label="t('history.viewPuzzle')"
                @click="selectEntry(entry)"
              >
                {{ t("history.view") }}
              </UButton>
            </li>
          </ul>
          <p v-else class="text-sm text-[var(--color-ink-subtle)]">
            {{ t("history.empty") }}
          </p>
          <div class="mt-4 flex justify-end">
            <UButton
              color="neutral"
              variant="ghost"
              @click="close"
            >
              {{ t("common.close") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
