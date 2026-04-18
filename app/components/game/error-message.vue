<script setup lang="ts">
import { computed } from "vue";
import type { GameError } from "~/utils/errorMessages";
import { uiIcon } from "~/utils/uiIcons";

interface Props {
  /** Error to display */
  error?: GameError | null;
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

const { t } = useI18n();

function dismiss() {
  emit("dismiss");
}

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

const errorColorClasses = computed(() => {
  if (!props.error) return "";

  switch (props.error.type) {
    case "network":
      return "text-[var(--color-warning)] dark:text-[var(--color-warning)] bg-[var(--color-warning-soft)] dark:bg-[var(--color-warning-soft)] border-[var(--color-warning)] dark:border-[var(--color-warning)]";
    case "validation":
      return "text-[var(--color-secondary)] dark:text-[var(--color-secondary)] bg-[var(--color-secondary-soft)] dark:bg-[var(--color-secondary-soft)] border-[var(--color-secondary)] dark:border-[var(--color-secondary)]";
    case "data":
      return "text-[var(--color-error)] dark:text-[var(--color-error)] bg-[var(--color-error-soft)] dark:bg-[var(--color-error-soft)] border-[var(--color-error)] dark:border-[var(--color-error)] italic";
    case "ui":
      return "text-[var(--color-error)] dark:text-[var(--color-error)] bg-[var(--color-error-soft)] dark:bg-[var(--color-error-soft)] border-[var(--color-error)] dark:border-[var(--color-error)] italic";
    default:
      return "text-[var(--color-error)] dark:text-[var(--color-error)] bg-[var(--color-error-soft)] dark:bg-[var(--color-error-soft)] border-[var(--color-error)] dark:border-[var(--color-error)] italic";
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
      aria-live="assertive"
      aria-atomic="true"
      class="px-3 py-2 text-sm border-2 rounded-sm notebook-error"
      :class="[
        errorColorClasses,
        props.class,
      ]"
    >
      <div class="flex items-start">
        <span
          class="flex-shrink-0 mr-2"
          aria-hidden="true"
          role="img"
        >
          {{ errorIcon }}
        </span>
        <span class="flex-1">
          <span class="sr-only">{{ t("common.errorPrefix") }} </span>{{ error.message }}
        </span>
        <UButton
          v-if="dismissible"
          color="neutral"
          variant="ghost"
          size="xs"
          :icon="uiIcon.close"
          :aria-label="t('common.dismissError')"
          class="flex-shrink-0 ml-2 min-w-[24px] min-h-[24px] notebook-button-secondary"
          @click="dismiss"
        />
      </div>
    </div>
  </Transition>
</template>
