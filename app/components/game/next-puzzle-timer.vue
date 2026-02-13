<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  /** Formatted countdown string (e.g. "5h 23m", "2m 10s") */
  nextPuzzleIn: string;
  /** When true, the timer line is shown */
  showTimer: boolean;
}>();

const ariaLabel = computed(
  () => `Next daily puzzle in ${props.nextPuzzleIn}`,
);
</script>

<template>
  <p
    v-if="showTimer && nextPuzzleIn"
    class="next-puzzle-timer text-xs sm:text-sm text-[var(--color-ink-subtle)]"
    :aria-label="ariaLabel"
    role="timer"
  >
    Next puzzle in {{ nextPuzzleIn }}
  </p>
</template>
