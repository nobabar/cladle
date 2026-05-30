<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useUiIcons } from "~/composables/useUiIcons";
import { HINT_GUESS_COST } from "~/types/hint";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    /** i18n key for disabled explanation (e.g. game.hint.disabled.replay) */
    disabledReason?: string;
    /** Screen-reader announcement after a successful hint */
    announcement?: string;
  }>(),
  {
    disabled: false,
    disabledReason: undefined,
    announcement: "",
  },
);

const emit = defineEmits<{
  confirm: [];
}>();

const { t } = useI18n();
const uiIcon = useUiIcons();

const isOpen = ref(false);
const hintButtonRef = ref<{ $el: HTMLElement } | null>(null);

const disabledExplanation = computed(() => {
  if (!props.disabled || !props.disabledReason) {
    return undefined;
  }
  if (props.disabledReason === "game.hint.disabled.insufficientGuesses") {
    return t(props.disabledReason, { cost: HINT_GUESS_COST });
  }
  return t(props.disabledReason);
});

const tooltipText = computed(() => {
  if (props.disabled && disabledExplanation.value) {
    return disabledExplanation.value;
  }
  return t("game.hint.button", { cost: HINT_GUESS_COST });
});

function focusHintButton() {
  const el = hintButtonRef.value?.$el;
  if (el instanceof HTMLElement) {
    el.focus();
  }
}

function openModal() {
  if (props.disabled) {
    return;
  }
  isOpen.value = true;
}

function closeModal() {
  isOpen.value = false;
}

function handleCancel() {
  closeModal();
  void nextTick(() => focusHintButton());
}

function handleConfirm() {
  closeModal();
  emit("confirm");
}
</script>

<template>
  <div class="flex flex-col items-center gap-1 shrink-0">
    <UTooltip
      :text="tooltipText"
      :delay-duration="0"
    >
      <span
        class="inline-flex"
        :class="disabled ? 'cursor-not-allowed' : ''"
      >
        <UButton
          ref="hintButtonRef"
          :icon="uiIcon.hint"
          color="neutral"
          variant="soft"
          size="md"
          square
          :disabled="disabled"
          :aria-disabled="disabled ? 'true' : undefined"
          :aria-label="tooltipText"
          class="min-w-[44px] min-h-[44px] touch-target justify-center items-center
              notebook-button-secondary cursor-pointer"
          @click="openModal"
        />
      </span>
    </UTooltip>

    <div
      aria-live="polite"
      class="sr-only"
    >
      {{ announcement }}
    </div>

    <UModal
      v-model:open="isOpen"
      :ui="{ content: 'max-w-md' }"
    >
      <template #content>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hint-confirm-title"
          class="p-4 sm:p-6"
        >
          <h2
            id="hint-confirm-title"
            class="text-lg font-semibold mb-2 text-[var(--color-ink)]
            dark:text-[var(--color-ink)]"
          >
            {{ t("game.hint.confirmTitle") }}
          </h2>
          <p
            class="text-sm text-[var(--color-ink-subtle)]
            dark:text-[var(--color-ink-subtle)] mb-4"
          >
            {{ t("game.hint.confirmBody", { cost: HINT_GUESS_COST }) }}
          </p>
          <div class="flex flex-wrap justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              class="min-h-[44px] touch-target"
              @click="handleCancel"
            >
              {{ t("game.hint.cancel") }}
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              class="min-h-[44px] touch-target"
              @click="handleConfirm"
            >
              {{ t("game.hint.confirm") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
