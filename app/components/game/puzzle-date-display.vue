<script setup lang="ts">
import { computed } from "vue";
import { formatPuzzleDate } from "~/utils/dateUtils";
import type { PuzzleDateFormat } from "~/utils/dateUtils";

const props = withDefaults(
  defineProps<{
    /** Puzzle date in YYYY-MM-DD format (UTC). Omit or empty to hide. */
    puzzleDate: string;
    /** Display format: full (January 11, 2026), short (Jan 11, 2026), relative (Today's Puzzle when current day) */
    format?: PuzzleDateFormat;
  }>(),
  { format: "relative" },
);

const displayText = computed(() => formatPuzzleDate(props.puzzleDate, props.format));

/** Machine-readable date for <time datetime> (ISO 8601) */
const datetime = computed(() => {
  if (!props.puzzleDate || props.puzzleDate.length !== 10) return undefined;
  return `${props.puzzleDate}T00:00:00Z`;
});

const ariaLabel = computed(
  () => `Current puzzle date: ${formatPuzzleDate(props.puzzleDate, "full")}`,
);
</script>

<template>
  <time
    v-if="puzzleDate && displayText !== '—'"
    :datetime="datetime"
    class="puzzle-date-display text-sm sm:text-base text-[var(--color-ink-subtle)]"
    :aria-label="ariaLabel"
  >
    {{ displayText }}
  </time>
</template>
