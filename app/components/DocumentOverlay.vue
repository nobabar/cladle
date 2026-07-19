<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useTemplateRef } from "vue";
import { useUiIcons } from "~/composables/useUiIcons";

defineProps<{
  /** id of the document heading inside the slot, for `aria-labelledby` */
  labelledBy?: string;
  /** Show dim backdrop over the background page. */
  withBackdrop?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const uiIcon = useUiIcons();
const closeButtonRef = useTemplateRef<HTMLButtonElement>("closeButtonRef");
const motionRef = useTemplateRef<HTMLElement>("motionRef");
const MOTION_DURATION_MS = 500;
const MOTION_EASING = "cubic-bezier(0.16, 0.84, 0.24, 1)";

function requestClose() {
  emit("close");
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    requestClose();
  }
}

let previousHtmlOverflow = "";
let motionAnimation: Animation | null = null;

onMounted(() => {
  previousHtmlOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";

  window.addEventListener("keydown", onKeydown);

  nextTick(() => {
    closeButtonRef.value?.focus();
    requestAnimationFrame(() => {
      const motionEl = motionRef.value;
      if (!motionEl) {
        return;
      }

      motionAnimation = motionEl.animate(
        [
          { transform: "translate3d(100%, 0, 0)" },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: MOTION_DURATION_MS,
          easing: MOTION_EASING,
          fill: "forwards",
        },
      );
    });
  });
});

onUnmounted(() => {
  document.documentElement.style.overflow = previousHtmlOverflow;
  window.removeEventListener("keydown", onKeydown);
  motionAnimation?.cancel();
  motionAnimation = null;
});
</script>

<template>
  <div
    class="document-overlay-root fixed inset-0 z-[80] flex items-center justify-center
      overflow-hidden p-0 sm:p-5 md:p-8"
  >
    <div
      class="absolute inset-0"
      :class="withBackdrop ? 'bg-[rgba(0,0,0,0.35)]' : 'bg-transparent'"
      aria-hidden="true"
      @click="requestClose"
    />

    <div
      ref="motionRef"
      class="document-overlay-motion relative z-[1] h-screen w-screen max-w-none
        sm:h-[min(92vh,56rem)] sm:max-w-[min(95vw,58rem)]"
    >
      <div
        class="document-overlay-panel flex h-full w-full flex-col overflow-hidden
          rounded-none sm:rounded-sm outline-none"
        role="dialog"
        :aria-modal="true"
        :aria-labelledby="labelledBy"
        tabindex="-1"
        @click.stop
      >
        <div
          class="document-overlay-header sticky top-0 z-[2] flex shrink-0 items-center
            justify-end gap-2 px-3 py-1 sm:px-4 sm:py-2"
        >
          <button
            ref="closeButtonRef"
            type="button"
            class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium
              text-[var(--color-ink-subtle)] hover:bg-[var(--color-border-subtle)]/40 sm:gap-1.5
              sm:py-1.5 sm:text-sm
              hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
            @click="requestClose"
          >
            <UIcon
              :name="uiIcon.return"
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{{ t("help.backLink") }}</span>
          </button>
        </div>

        <div class="document-overlay-scroll min-h-0 flex-1 overflow-y-auto">
          <div
            class="document-overlay-sheet notebook-sheet h-auto min-h-0 max-w-none
              rounded-none sm:h-full"
          >
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-overlay-motion {
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
}

.document-overlay-panel {
  box-shadow: 0 26px 55px rgba(0, 0, 0, 0.28);
}

@media (max-width: 639px) {
  .document-overlay-panel {
    box-shadow: none;
  }
}

.document-overlay-header {
  background-color: var(--color-paper);
  border-bottom: 1px solid var(--color-border-subtle);
}

.document-overlay-scroll {
  background-color: var(--color-paper);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.document-overlay-scroll::-webkit-scrollbar {
  display: none;
}

.document-overlay-sheet {
  box-sizing: border-box;
  height: auto;
  min-height: 0;
  overflow: visible;
  padding-top: var(--space-5, 1.5rem);
  padding-bottom: var(--space-5, 1.5rem);
}

/* Override global `.container { overflow-x: auto; }` inside overlay documents. */
.document-overlay-sheet :deep(.container) {
  overflow: visible;
}

@media (min-width: 768px) {
  .document-overlay-sheet {
    min-height: 100%;
    padding-top: var(--space-6, 2rem);
    padding-bottom: var(--space-6, 2rem);
  }
}

.dark .document-overlay-header {
  border-bottom-color: var(--color-border);
}
</style>
