<script setup lang="ts">
import { computed } from "vue";

interface Props {
  /** Loading message to display */
  message?: string;
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Whether to show full screen overlay */
  fullScreen?: boolean;
  /** Optional custom class */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  message: "Loading...",
  size: "md",
  fullScreen: false,
  class: "",
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case "sm":
      return "w-4 h-4";
    case "md":
      return "w-6 h-6";
    case "lg":
      return "w-8 h-8";
    default:
      return "w-6 h-6";
  }
});
</script>

<template>
  <div
    class="flex items-center justify-center"
    :class="[
      fullScreen ? 'fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50' : '',
      props.class,
    ]"
    role="status"
    aria-live="polite"
    :aria-label="message"
  >
    <div class="flex flex-col items-center gap-2">
      <svg
        class="animate-spin text-gray-600 dark:text-gray-400"
        :class="[
          sizeClasses,
        ]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span
        v-if="message"
        class="text-sm text-gray-600 dark:text-gray-400"
      >
        {{ message }}
      </span>
    </div>
  </div>
</template>
