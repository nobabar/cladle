<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import GameWinStateResultContent from "~/components/game/win-state-result-content.vue";
import type { TreeNode } from "~/types/tree";
import { useGameStore } from "~/stores/gameStore";
import { useResponsive } from "~/composables/useResponsive";
import { useSharing } from "~/composables/useSharing";
import { calculatePhylogeneticMetrics } from "~/utils/sharingFormatter";
import { uiIcon } from "~/utils/uiIcons";

const emit = defineEmits<{
  nodeClick: [node: TreeNode];
}>();

const gameStore = useGameStore();
const { isMobile, isTablet, isDesktop } = useResponsive();

const hasEnded = computed(() => gameStore.hasEnded);
const isWon = computed(() => gameStore.isWon);
const isLost = computed(() => gameStore.isLost);
const targetAnimal = computed(() => gameStore.target);
const treeData = computed(() => gameStore.treeData);
const guessCount = computed(() => gameStore.guesses.length);
const maxGuesses = computed(() => gameStore.maxGuesses);

/**
 * General (non-spoiler) phylogenetic metrics for win/loss state display.
 * Reuses the same FR45 implementation as sharing.
 */
const phyloMetrics = computed(() =>
  calculatePhylogeneticMetrics(
    treeData.value,
    gameStore.guesses,
    gameStore.target,
    gameStore.status,
  ),
);

/** Copy-to-clipboard share state and handler. */
const { copyShareText, isShareReady, lastCopyStatus, copyError } = useSharing();

const winMessage = computed(() => {
  if (!targetAnimal.value) {
    return "Congratulations! You found the target animal!";
  }
  return `Congratulations! You found the ${targetAnimal.value.name}!`;
});

const lossMessage = computed(() => {
  if (!targetAnimal.value) {
    return "Game Over! Better luck next time.";
  }
  return `Game Over! The target was ${targetAnimal.value.name}.`;
});

const resultTitle = computed(() => (isWon.value ? "🎉 You Won!" : "Game Over"));

const resultMessage = computed(() => (isWon.value ? winMessage.value : lossMessage.value));

const resultStats = computed(() => {
  if (isWon.value) {
    return `Completed in ${guessCount.value} ${guessCount.value === 1 ? "guess" : "guesses"} out of ${maxGuesses.value}.`;
  }
  return `You used all ${maxGuesses.value} guesses. Keep learning and try again!`;
});

const screenReaderAnnouncement = computed(() => {
  if (isWon.value) {
    return `${winMessage.value} You completed the puzzle in ${guessCount.value} ${guessCount.value === 1 ? "guess" : "guesses"}.`;
  }
  if (isLost.value) {
    return `${lossMessage.value} You used all ${maxGuesses.value} guesses.`;
  }
  return "";
});

/**
 * Mobile/tablet modal dismissed by user (close button, overlay, or Escape).
 * When true, modal is hidden but user can reopen via sticky bar.
 */
const isMobileModalDismissed = ref(false);

/**
 * Modal visible when game ended on mobile/tablet and not dismissed
 */
const isModalOpen = computed(
  () => hasEnded.value && (isMobile.value || isTablet.value) && !isMobileModalDismissed.value,
);

/**
 * Show sticky "View result" bar when modal was dismissed on mobile/tablet
 */
const showMobileReopenBar = computed(
  () => hasEnded.value && (isMobile.value || isTablet.value) && isMobileModalDismissed.value,
);

/**
 * Panel open state (for desktop >= 1024px)
 */
const isPanelOpen = computed(() => hasEnded.value && isDesktop.value);

/**
 * Panel collapsed state (desktop only) - slide panel to a strip to focus on main area
 */
const isPanelCollapsed = ref(false);

/**
 * Toggle panel collapsed/expanded
 */
function togglePanelCollapsed() {
  isPanelCollapsed.value = !isPanelCollapsed.value;
}

/**
 * Focus trap element ref
 */
const focusTrapRef = ref<HTMLElement | null>(null);

/**
 * Previous focus element (to restore on close)
 */
let previousFocusElement: HTMLElement | null = null;

/**
 * Close mobile modal and restore focus (button, overlay, or Escape)
 */
function closeMobileModal() {
  isMobileModalDismissed.value = true;
  nextTick(() => {
    if (previousFocusElement) {
      previousFocusElement.focus();
      previousFocusElement = null;
    }
  });
}

/**
 * Reopen mobile modal (from sticky bar tap)
 */
function reopenMobileModal() {
  isMobileModalDismissed.value = false;
  nextTick(() => {
    manageFocus();
  });
}

/**
 * Handle escape key: close modal on mobile/tablet, prevent default
 * @param event - Keyboard event
 */
function handleEscape(event: KeyboardEvent) {
  if (event.key !== "Escape") {
    return;
  }
  if (isModalOpen.value) {
    event.preventDefault();
    closeMobileModal();
  }
}

/**
 * Focus management for accessibility
 */
function manageFocus() {
  if (hasEnded.value && focusTrapRef.value) {
    // Store previous focus
    previousFocusElement = document.activeElement as HTMLElement;
    // Focus the modal/panel content
    // For modal/panel, focus the container first, then first focusable element
    if (focusTrapRef.value instanceof HTMLElement) {
      focusTrapRef.value.focus();
    }
    // Then focus first interactive element if available
    nextTick(() => {
      const firstFocusable = focusTrapRef.value?.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      ) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    });
  } else if (previousFocusElement) {
    // Restore previous focus when closed
    previousFocusElement.focus();
    previousFocusElement = null;
  }
}

/**
 * Watch for game end to manage focus
 */
watch(hasEnded, (newValue) => {
  if (newValue) {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      manageFocus();
    }, 100);
  }
});

/**
 * Reset panel to expanded when it opens (e.g. new game ended)
 */
watch(isPanelOpen, (open) => {
  if (open) {
    isPanelCollapsed.value = false;
  }
});

/**
 * Reset mobile modal dismissed state when game is no longer ended (e.g. new game)
 */
watch(hasEnded, (ended) => {
  if (!ended) {
    isMobileModalDismissed.value = false;
  }
});

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleEscape);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleEscape);
  }
});
</script>

<template>
  <!-- Screen Reader Announcement -->
  <div
    v-if="hasEnded"
    class="sr-only"
    aria-live="polite"
    aria-atomic="true"
  >
    {{ screenReaderAnnouncement }}
  </div>

  <div
    v-if="lastCopyStatus !== 'idle'"
    class="sr-only"
    aria-live="polite"
    aria-atomic="true"
  >
    {{
      lastCopyStatus === "success" ? "Copied!" : copyError || "Copy failed"
    }}
  </div>

  <!-- Mobile Modal and reopen bar (< 1024px) -->
  <Teleport to="body">
    <div class="win-state-mobile-root">
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isModalOpen"
          class="win-state-modal-overlay"
          @click.self="closeMobileModal"
        >
          <div
            ref="focusTrapRef"
            role="dialog"
            aria-modal="true"
            aria-labelledby="win-state-modal-title"
            aria-describedby="win-state-modal-description"
            class="win-state-modal"
            @click.stop
          >
            <div class="win-state-modal__sticky-header">
              <div class="win-state-modal__sticky-header-text">
                <h2
                  id="win-state-modal-title"
                  class="win-state-modal__title"
                  :class="isWon ? 'win-state-modal__title--win' : 'win-state-modal__title--loss'"
                >
                  {{ resultTitle }}
                </h2>
                <p
                  id="win-state-modal-description"
                  class="win-state-modal__message"
                >
                  {{ resultMessage }}
                </p>
              </div>
              <button
                type="button"
                class="win-state-modal__close"
                aria-label="Close"
                @click="closeMobileModal"
              >
                <Icon
                  :name="uiIcon.close"
                  class="win-state-modal__close-icon"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div class="win-state-modal__body">
              <GameWinStateResultContent
                v-if="isWon || isLost"
                :is-won="isWon"
                :stats-text="resultStats"
                :target-animal="targetAnimal"
                :phylo-metrics="phyloMetrics"
                :is-share-ready="isShareReady"
                :last-copy-status="lastCopyStatus"
                :tree-data="treeData"
                :tree-width="800"
                :tree-height="400"
                @copy="copyShareText"
                @node-click="emit('nodeClick', $event)"
              />
            </div>
          </div>
        </div>
      </Transition>

      <!-- Sticky bar to reopen result when modal was dismissed -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <button
          v-if="showMobileReopenBar"
          type="button"
          class="win-state-reopen-bar"
          aria-label="View game result"
          @click="reopenMobileModal"
        >
          <span class="win-state-reopen-bar__text">
            {{ isWon ? "You won!" : "Game over" }} - Tap to see result
          </span>
        </button>
      </Transition>
    </div>
  </Teleport>

  <!-- Desktop Side Panel (>= 1024px) -->
  <Transition
    enter-active-class="win-state-panel-enter-active"
    enter-from-class="win-state-panel-enter-from"
    enter-to-class="win-state-panel-enter-to"
    leave-active-class="win-state-panel-leave-active"
    leave-from-class="win-state-panel-leave-from"
    leave-to-class="win-state-panel-leave-to"
  >
    <div
      v-if="isPanelOpen"
      ref="focusTrapRef"
      role="complementary"
      aria-labelledby="win-state-panel-title"
      aria-describedby="win-state-panel-description"
      aria-label="Game result panel"
      class="win-state-panel"
      :class="{ 'win-state-panel--collapsed': isPanelCollapsed }"
      tabindex="-1"
    >
      <!-- Panel body (hidden when collapsed) -->
      <div class="win-state-panel__body">
        <!-- Title and collapse button -->
        <div class="win-state-panel__title-row">
          <h2
            id="win-state-panel-title"
            class="win-state-panel__title"
            :class="isWon ? 'win-state-panel__title--win' : 'win-state-panel__title--loss'"
          >
            {{ isWon ? "🎉 You Won!" : "Game Over" }}
          </h2>
          <button
            type="button"
            class="win-state-panel__toggle win-state-panel__toggle--top"
            aria-label="Hide result panel"
            title="Hide result panel"
            @click="togglePanelCollapsed"
          >
            <Icon
              :name="uiIcon.chevronRight"
              class="win-state-panel__icon"
              aria-hidden="true"
            />
          </button>
        </div>
        <p
          id="win-state-panel-description"
          class="win-state-panel__message"
        >
          {{ resultMessage }}
        </p>
        <GameWinStateResultContent
          v-if="isWon || isLost"
          :is-won="isWon"
          :stats-text="resultStats"
          :target-animal="targetAnimal"
          :phylo-metrics="phyloMetrics"
          :is-share-ready="isShareReady"
          :last-copy-status="lastCopyStatus"
          :tree-data="treeData"
          :tree-width="380"
          :tree-height="600"
          @copy="copyShareText"
          @node-click="emit('nodeClick', $event)"
        />
      </div>
      <!-- Collapsed state: thin strip with expand button at top + vertical status -->
      <div class="win-state-panel__strip">
        <button
          type="button"
          class="win-state-panel__toggle win-state-panel__toggle--expand"
          aria-label="Show result panel"
          title="Show result panel"
          @click="togglePanelCollapsed"
        >
          <Icon
            :name="uiIcon.chevronLeft"
            class="win-state-panel__icon"
            aria-hidden="true"
          />
        </button>
        <span
          class="win-state-panel__vertical-status"
          :class="isWon
            ? 'win-state-panel__vertical-status--win'
            : 'win-state-panel__vertical-status--loss'"
          aria-hidden="true"
        >
          {{ isWon ? "You Won!" : "Game Over" }}
        </span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Win state content (shared by modal and panel) */
.win-state__content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 0;
  flex: 1;
}
.win-state-panel .win-state__content { margin-top: 0; }

.win-state__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.win-state__stats {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-subtle, #6b7280);
}
.dark .win-state__stats { color: #9ca3af; }

.win-state__target-meta {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.win-state__target-image {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.5rem;
  object-fit: cover;
  border: 1px solid var(--color-border-subtle, #e2d6c3);
  background: var(--color-paper, #fdfbf5);
  flex: 0 0 auto;
}

.win-state__target-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
}

.win-state__target-line {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.35;
  color: var(--color-ink-muted, #374151);
}

.win-state__scientific-name {
  font-style: italic;
  color: var(--color-ink-subtle, #6b7280);
  margin-left: 0.25rem;
}

.dark .win-state__target-line { color: #d1d5db; }
.dark .win-state__scientific-name { color: #9ca3af; }

.win-state__target-link {
  color: var(--color-ink, #111827);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.win-state__target-link-separator {
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__target-link { color: #f9fafb; }
.dark .win-state__target-link-separator { color: #9ca3af; }
.dark .win-state__target-image {
  background: var(--color-ink, #1f2937);
  border-color: #374151;
}

.win-state__tree {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 0;
}

.win-state__tree-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink, #111827);
}
.dark .win-state__tree-title { color: #f9fafb; }

.win-state__tree-container {
  width: 100%;
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  box-shadow: none;
  min-height: 200px;
}
.dark .win-state__tree-container { background: transparent; }

/* Desktop Side Panel - notebook/anatomical palette */
/* Positioned relative to .notebook-sheet (parent) */
.win-state-panel {
  position: absolute;
  /* Align with notebook-sheet's top edge */
  top: 0;
  /* Align with notebook-sheet's bottom edge */
  bottom: 0;
  /* Align with notebook-sheet's right edge */
  right: 0;
  width: 400px;
  max-width: 90vw;
  background: var(--color-paper, #FDFBF5);
  border-left: 1px solid var(--color-border-subtle, #E2D6C3);
  box-shadow: -2px 0 4px -1px rgba(0, 0, 0, 0.08);
  z-index: 50;
  box-sizing: border-box;
  overflow: visible;
  display: flex;
  flex-direction: row;
  transition: width 0.25s ease-out;
}

/* Same dotted grid as notebook sheet */
.win-state-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle, var(--color-muted, #9CA3AF) 1px, transparent 1px);
  background-size: 16px 16px;
  background-position: 0 0;
  opacity: 0.5;
  pointer-events: none;
  z-index: -1;
}

.win-state-panel--collapsed {
  width: 48px;
  min-width: 48px;
  overflow: hidden;
}

/* Title and collapse button on one line when expanded */
.win-state-panel__title-row {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.25rem;
}

.win-state-panel__title {
  flex: 1;
  min-width: 0;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.5;
  margin: 0;
  color: var(--win-state-accent);
}
.win-state-panel__title--win { --win-state-accent: var(--color-success, #059669); }
.win-state-panel__title--loss { --win-state-accent: var(--color-error, #dc2626); }
.dark .win-state-panel__title--win { color: #10b981; }
.dark .win-state-panel__title--loss { color: #f87171; }

.win-state-panel__message {
  font-size: 1rem;
  line-height: 1.4;
  margin: 0 0 1rem;
  color: var(--color-ink-muted, #374151);
}

.dark .win-state-panel__message { color: #d1d5db; }

/* Toggle buttons (collapse › and expand ‹) */
.win-state-panel__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background-color 0.15s, color 0.15s;
}
.win-state-panel__toggle:hover {
  background: var(--color-border-subtle, #E2D6C3);
  color: var(--color-ink, #111827);
}
.win-state-panel__toggle--top {
  color: var(--color-ink-muted, #374151);
}
.win-state-panel__toggle--top .win-state-panel__icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Collapsed strip: hidden when expanded, visible when collapsed */
.win-state-panel__strip {
  position: relative;
  z-index: 1;
  flex: 0 0 0;
  width: 0;
  min-width: 0;
  overflow: hidden;
  border-left: none;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 2rem;
  gap: 1rem;
  background: var(--color-paper, #FDFBF5);
}

/* When collapsed, keep strip visible with a clear edge so it’s not “blank” */
.win-state-panel--collapsed .win-state-panel__strip {
  flex: 0 0 48px;
  width: 48px;
  min-width: 48px;
  display: flex;
  overflow: visible;
  border-left: 1px solid var(--color-border-subtle, #E2D6C3);
  box-shadow: -2px 0 4px -1px rgba(0, 0, 0, 0.08);
}

.win-state-panel__toggle--expand {
  color: var(--color-ink, #111827);
}
.win-state-panel__toggle--expand .win-state-panel__icon {
  width: 1.25rem;
  height: 1.25rem;
}
.dark .win-state-panel__toggle--expand { color: #f9fafb; }

/* When collapsed, make expand chevron clearly visible so strip isn’t “blank” */
.win-state-panel__vertical-status {
  writing-mode: vertical-lr;
  text-orientation: mixed;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
  padding: 0.5rem 0;
  color: var(--win-state-accent);
}
.win-state-panel__vertical-status--win { --win-state-accent: var(--color-success, #059669); }
.win-state-panel__vertical-status--loss { --win-state-accent: var(--color-error, #dc2626); }
.dark .win-state-panel__vertical-status--win { color: #10b981; }
.dark .win-state-panel__vertical-status--loss { color: #f87171; }

.win-state-panel__icon {
  flex-shrink: 0;
  color: currentColor;
}

/* Panel body (content area) */
.win-state-panel__body {
  flex: 1 1 0;
  min-width: 0;
  padding: 1.5rem;
  overflow: visible;
  transition: flex 0.25s ease-out, opacity 0.2s ease-out;
  display: flex;
  flex-direction: column;
}

.win-state-panel--collapsed .win-state-panel__body {
  flex: 0 0 0;
  min-width: 0;
  width: 0;
  padding: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

/* Slide animation for side panel */
.win-state-panel-enter-active {
  transition: transform 0.3s ease-out;
}

.win-state-panel-enter-from {
  transform: translateX(100%);
}

.win-state-panel-enter-to {
  transform: translateX(0);
}

.win-state-panel-leave-active {
  transition: transform 0.3s ease-in;
}

.win-state-panel-leave-from {
  transform: translateX(0);
}

.win-state-panel-leave-to {
  transform: translateX(100%);
}

.dark .win-state-panel {
  background: var(--color-paper, #1e293b);
  border-left-color: var(--color-border-subtle, #1f2937);
  box-shadow: -2px 0 4px -1px rgba(0, 0, 0, 0.2);
}

.dark .win-state-panel--collapsed .win-state-panel__strip {
  border-left-color: var(--color-border-subtle, #1f2937);
  box-shadow: -2px 0 4px -1px rgba(0, 0, 0, 0.2);
}

/* Mobile optimizations (< 768px) */
@media (max-width: 767px) {
  .win-state__content {
    gap: 1rem;
  }

  .win-state__header {
    gap: 0.5rem;
  }

  .win-state__tree-container {
    max-height: 300px;
    overflow: auto;
  }

  /* Larger tap targets on touch */
  .win-state__content > * + * {
    margin-top: 1rem;
  }
}

/* Tablet optimizations (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .win-state__tree-container {
    max-height: 400px;
    overflow: auto;
  }
}

/* Desktop optimizations (>= 1024px) */
@media (min-width: 1024px) {
  .win-state-panel {
    width: 450px;
  }

  /* Collapsed must win so the panel is a thin strip, not a wide blank overlay */
  .win-state-panel.win-state-panel--collapsed {
    width: 48px;
    min-width: 48px;
  }

  .win-state__tree-container {
    max-height: none;
    min-height: 400px;
    overflow: visible;
    width: 100%;
  }

  .win-state__content {
    min-height: 0;
  }
}

/* Mobile root wrapper (Teleport container for modal + reopen bar) */
.win-state-mobile-root {
  display: contents;
}

/* Sticky bar to reopen result when modal was dismissed (mobile/tablet) */
.win-state-reopen-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: none;
  border-top: 1px solid var(--color-border-subtle, #E2D6C3);
  background: var(--color-paper, #FDFBF5);
  color: var(--color-ink, #111827);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  transition: background-color 0.15s, color 0.15s;
}

.win-state-reopen-bar:hover {
  background: var(--color-border-subtle, #E2D6C3);
}

.win-state-reopen-bar__text {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dark .win-state-reopen-bar {
  background: var(--color-paper, #1e293b);
  border-top-color: var(--color-border-subtle, #1f2937);
  color: #f9fafb;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
}

.dark .win-state-reopen-bar:hover {
  background: #374151;
}

/* Mobile Modal Overlay (< 1024px) */
.win-state-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
}

.win-state-modal {
  background: var(--color-paper, #FDFBF5);
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 42rem;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  margin: auto;
}

.win-state-modal__sticky-header {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-border-subtle, #e2d6c3);
  background: var(--color-paper, #FDFBF5);
  z-index: 1;
}

.dark .win-state-modal__sticky-header {
  background: var(--color-paper, #1e293b);
  border-bottom-color: #374151;
}

.win-state-modal__sticky-header-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.win-state-modal__title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.5;
  margin: 0;
}

.win-state-modal__title--win { color: var(--color-success, #059669); }
.win-state-modal__title--loss { color: var(--color-error, #dc2626); }
.dark .win-state-modal__title--win { color: #10b981; }
.dark .win-state-modal__title--loss { color: #f87171; }

.win-state-modal__message {
  font-size: 1rem;
  line-height: 1.4;
  margin: 0;
  color: var(--color-ink-muted, #374151);
}

.dark .win-state-modal__message { color: #d1d5db; }

.win-state-modal__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

.win-state-modal__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-ink-muted, #374151);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background-color 0.15s, color 0.15s;
}

.win-state-modal__close:hover {
  background: var(--color-border-subtle, #E2D6C3);
  color: var(--color-ink, #111827);
}

.win-state-modal__close-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.dark .win-state-modal__close {
  color: #9ca3af;
}

.dark .win-state-modal__close:hover {
  background: #374151;
  color: #f9fafb;
}

.dark .win-state-modal {
  background: var(--color-paper, #1e293b);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}

@media (min-width: 640px) {
  .win-state-modal__sticky-header {
    padding: 1.25rem 1.25rem 0.75rem;
  }
  .win-state-modal__body {
    padding: 1.25rem;
  }
}

@media (min-width: 768px) {
  .win-state-modal__sticky-header {
    padding: 1.5rem 1.5rem 0.75rem;
  }
  .win-state-modal__body {
    padding: 1.5rem;
  }
}

/* Focus styles for accessibility */
.win-state:focus,
.win-state-panel:focus,
.win-state-modal:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
}

.win-state__learning-footnote {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  font-style: italic;
  color: var(--color-ink-subtle, #6b7280);
}
</style>
