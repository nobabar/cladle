<script setup lang="ts">
import { computed } from "vue";
import type { GameError } from "~/utils/errorMessages";

/**
 * Props
 */
interface Props {
  /** Error to display */
  error: GameError | null;
  /** Whether error can be dismissed */
  dismissible?: boolean;
  /** Optional custom class */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  dismissible: true,
  class: "",
});

const emit = defineEmits<{
  (e: "dismiss"): void;
}>();

/**
 * Dismiss error
 */
function dismiss() {
  emit("dismiss");
}

/**
 * Get error icon based on error type
 */
const errorIcon = computed(() => {
  if (!props.error) return "⚠️";

  switch (props.error.type) {
    case "network":
      return "🌐";
    case "validation":
      return "✏️";
    case "data":
      return "📊";
    case "ui":
      return "⚠️";
    default:
      return "⚠️";
  }
});

/**
 * Get error color classes based on error type
 */
const errorColorClasses = computed(() => {
  if (!props.error) return "";

  switch (props.error.type) {
    case "network":
      return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    case "validation":
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    case "data":
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    case "ui":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    default:
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
  }
});
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-100"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-75"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <div
      v-if="error"
      role="alert"
      aria-live="polite"
      class="px-3 py-2 text-sm border rounded-md"
      :class="[
        errorColorClasses,
        props.class,
      ]"
    >
      <div class="flex items-start">
        <span class="flex-shrink-0 mr-2" aria-hidden="true">{{ errorIcon }}</span>
        <span class="flex-1">{{ error.message }}</span>
        <UButton
          v-if="dismissible"
          color="neutral"
          variant="link"
          size="xs"
          icon="i-lucide-x"
          aria-label="Dismiss error"
          class="flex-shrink-0 ml-2 min-w-[24px] min-h-[24px]"
          @click="dismiss"
        />
      </div>
    </div>
  </Transition>
</template>
