<script setup lang="ts">
defineProps<{
  /** Formatted countdown string (e.g. "5h 23m", "2m 10s") */
  nextPuzzleIn: string;
  /** When true, the timer line is shown */
  showTimer: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <p
    v-if="showTimer && nextPuzzleIn"
    class="next-puzzle-timer text-xs sm:text-sm text-[var(--color-ink-subtle)]"
    role="timer"
  >
    {{ t("date.nextPuzzleCountdown", { time: nextPuzzleIn }) }}
  </p>
</template>
