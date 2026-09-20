<script setup lang="ts">
import { computed, ref } from "vue";
import type { Animal } from "~/types/animal";
import { useUiIcons } from "~/composables/useUiIcons";

interface Props {
  animals: Animal[];
  stickerByAnimalId?: Record<string, string>;
  guessHistory?: Animal[];
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  stickerByAnimalId: undefined,
  guessHistory: () => [],
  disabled: false,
});

const emit = defineEmits<{
  select: [animal: Animal];
}>();

const { t } = useI18n();
const uiIcon = useUiIcons();
const isOpen = ref(false);

const guessedAnimalIds = computed(
  () => new Set((props.guessHistory || []).map(animal => animal.id)),
);

function emojiFor(animal: Animal): string | undefined {
  return props.stickerByAnimalId?.[animal.id];
}

function isGuessed(animal: Animal): boolean {
  return guessedAnimalIds.value.has(animal.id);
}

function isSelectable(animal: Animal): boolean {
  return !props.disabled && !isGuessed(animal);
}

function ariaLabelFor(animal: Animal): string {
  if (isGuessed(animal)) {
    return t("babyMode.alreadyGuessed", { name: animal.name });
  }
  return t("babyMode.guessAnimal", { name: animal.name });
}

function handleSelect(animal: Animal, close?: () => void): void {
  if (!isSelectable(animal)) {
    return;
  }
  emit("select", animal);
  isOpen.value = false;
  close?.();
}
</script>

<template>
  <div class="baby-organism-picker flex justify-center">
    <UPopover
      v-model:open="isOpen"
      :content="{ side: 'bottom', align: 'center', sideOffset: 8, collisionPadding: 16 }"
    >
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        :disabled="disabled"
        :icon="uiIcon.emojiPicker"
        :aria-label="t('babyMode.openPicker')"
        :aria-expanded="isOpen"
        aria-haspopup="dialog"
        class="baby-organism-picker__trigger min-h-[44px] touch-target notebook-button-secondary"
      >
        {{ t("babyMode.openPicker") }}
      </UButton>

      <template #content="{ close }">
        <div
          class="baby-organism-picker__panel"
          role="dialog"
          :aria-label="t('babyMode.pickerLabel')"
        >
          <p class="baby-organism-picker__title">
            {{ t("babyMode.pickerLabel") }}
          </p>

          <ul
            class="baby-organism-picker__grid"
            role="list"
          >
            <li
              v-for="animal in animals"
              :key="animal.id"
              class="baby-organism-picker__item"
              role="listitem"
            >
              <button
                type="button"
                class="baby-organism-picker__choice"
                :class="{
                  'baby-organism-picker__choice--guessed': isGuessed(animal),
                }"
                :disabled="!isSelectable(animal)"
                :aria-label="ariaLabelFor(animal)"
                :aria-pressed="isGuessed(animal) ? 'true' : undefined"
                @click="handleSelect(animal, close)"
              >
                <span
                  v-if="emojiFor(animal)"
                  class="baby-organism-picker__emoji"
                  aria-hidden="true"
                >{{ emojiFor(animal) }}</span>
                <span class="baby-organism-picker__name">{{ animal.name }}</span>
              </button>
            </li>
          </ul>
        </div>
      </template>
    </UPopover>
  </div>
</template>

<style scoped>
.baby-organism-picker__trigger {
  justify-content: center;
}

.baby-organism-picker__panel {
  width: min(22rem, calc(100vw - 2rem));
  max-height: min(28rem, 75vh);
  overflow-y: auto;
  padding: 0.75rem;
}

.baby-organism-picker__title {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink);
}

.baby-organism-picker__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.375rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.baby-organism-picker__item {
  min-width: 0;
}

.baby-organism-picker__choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  width: 100%;
  min-height: 64px;
  padding: 0.375rem 0.2rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: 0.625rem;
  background: var(--color-paper);
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.baby-organism-picker__choice:hover:not(:disabled) {
  border-color: var(--color-ink-subtle);
  background: color-mix(in srgb, var(--color-paper) 92%, var(--color-ink) 8%);
}

.baby-organism-picker__choice:active:not(:disabled) {
  transform: scale(0.97);
}

.baby-organism-picker__choice:focus-visible {
  outline: 2px solid var(--color-accent, currentColor);
  outline-offset: 2px;
}

.baby-organism-picker__choice:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.baby-organism-picker__choice--guessed {
  border-style: dashed;
}

.baby-organism-picker__emoji {
  font-size: 1.5rem;
  line-height: 1;
}

.baby-organism-picker__name {
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 1.15;
  text-align: center;
  word-break: break-word;
}
</style>
