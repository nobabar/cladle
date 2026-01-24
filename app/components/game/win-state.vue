<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useGameStore } from "~/stores/gameStore";
import { useResponsive } from "~/composables/useResponsive";

/**
 * Win/Loss State Component
 *
 * Displays win or loss state with target animal name, completion feedback,
 * and full tree structure. Uses modal on mobile/tablet (< 1024px) and side panel
 * on desktop (>= 1024px).
 */

const gameStore = useGameStore();

/**
 * Use responsive composable for breakpoint detection
 */
const { isMobile, isTablet, isDesktop } = useResponsive();

/**
 * Check if game has ended (won or lost)
 */
const hasEnded = computed(() => gameStore.hasEnded);

/**
 * Check if game is won
 */
const isWon = computed(() => gameStore.isWon);

/**
 * Check if game is lost
 */
const isLost = computed(() => gameStore.isLost);

/**
 * Get target animal from store
 */
const targetAnimal = computed(() => gameStore.target);

/**
 * Get tree data from store (full tree structure)
 */
const treeData = computed(() => gameStore.treeData);

/**
 * Get number of guesses made
 */
const guessCount = computed(() => gameStore.guesses.length);

/**
 * Get max guesses allowed
 */
const maxGuesses = computed(() => gameStore.maxGuesses);

/**
 * Win state message
 */
const winMessage = computed(() => {
  if (!targetAnimal.value) {
    return "Congratulations! You found the target animal!";
  }
  return `Congratulations! You found ${targetAnimal.value.name}!`;
});

/**
 * Loss state message
 */
const lossMessage = computed(() => {
  if (!targetAnimal.value) {
    return "Game Over! Better luck next time.";
  }
  return `Game Over! The target was ${targetAnimal.value.name}.`;
});

/**
 * Screen reader announcement for win/loss
 */
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
 * Modal open state (for mobile and tablet < 1024px)
 */
const isModalOpen = computed(() => hasEnded.value && (isMobile.value || isTablet.value));

/**
 * Panel open state (for desktop >= 1024px)
 */
const isPanelOpen = computed(() => hasEnded.value && isDesktop.value);

/**
 * Focus trap element ref
 */
const focusTrapRef = ref<HTMLElement | null>(null);

/**
 * Previous focus element (to restore on close)
 */
let previousFocusElement: HTMLElement | null = null;

/**
 * Handle escape key to close modal/panel
 * @param event - Keyboard event
 */
function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && hasEnded.value) {
    // Escape key handling - modal/panel should stay open during win/loss
    // This is for future enhancement if we want to allow closing
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
    const firstFocusable = focusTrapRef.value.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    ) as HTMLElement;
    if (firstFocusable) {
      firstFocusable.focus();
    }
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
 * Setup on mount
 */
onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleEscape);
  }
});

/**
 * Cleanup on unmount
 */
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

  <!-- Mobile Modal (< 1024px) -->
  <UModal
    v-if="isModalOpen"
    :model-value="isModalOpen"
    :ui="{
      width: 'w-full max-w-2xl',
      padding: 'p-4 sm:p-5 md:p-6',
    }"
    :prevent-close="true"
  >
    <div
      ref="focusTrapRef"
      role="dialog"
      aria-labelledby="win-state-title"
      aria-describedby="win-state-description"
      class="win-state"
    >
      <!-- Win State -->
      <div v-if="isWon" class="win-state__content win-state__content--win">
        <div class="win-state__header">
          <h2
            id="win-state-title"
            class="win-state__title"
          >
            🎉 You Won!
          </h2>
          <p
            id="win-state-description"
            class="win-state__message"
          >
            {{ winMessage }}
          </p>
          <p
            v-if="targetAnimal"
            class="win-state__target"
          >
            Target: <strong>{{ targetAnimal.name }}</strong>
            <span
              v-if="targetAnimal.scientificName"
              class="win-state__scientific-name"
            >
              ({{ targetAnimal.scientificName }})
            </span>
          </p>
          <p class="win-state__stats">
            Completed in {{ guessCount }} {{ guessCount === 1 ? "guess" : "guesses" }}
            out of {{ maxGuesses }}.
          </p>
        </div>

        <!-- Full Tree Visualization -->
        <div class="win-state__tree">
          <h3 class="win-state__tree-title">
            Complete Phylogenetic Tree
          </h3>
          <div class="win-state__tree-container">
            <GameTreeVisualization
              :tree-data="treeData"
              :show-target="true"
              :width="800"
              :height="400"
            />
          </div>
        </div>
      </div>

      <!-- Loss State -->
      <div v-else-if="isLost" class="win-state__content win-state__content--loss">
        <div class="win-state__header">
          <h2
            id="win-state-title"
            class="win-state__title"
          >
            Game Over
          </h2>
          <p
            id="win-state-description"
            class="win-state__message"
          >
            {{ lossMessage }}
          </p>
          <p
            v-if="targetAnimal"
            class="win-state__target"
          >
            Target: <strong>{{ targetAnimal.name }}</strong>
            <span
              v-if="targetAnimal.scientificName"
              class="win-state__scientific-name"
            >
              ({{ targetAnimal.scientificName }})
            </span>
          </p>
          <p class="win-state__stats">
            You used all {{ maxGuesses }} guesses. Keep learning and try again!
          </p>
        </div>

        <!-- Full Tree Visualization -->
        <div class="win-state__tree">
          <h3 class="win-state__tree-title">
            Complete Phylogenetic Tree
          </h3>
          <div class="win-state__tree-container">
            <GameTreeVisualization
              :tree-data="treeData"
              :show-target="true"
              :width="800"
              :height="400"
            />
          </div>
        </div>
      </div>
    </div>
  </UModal>

  <!-- Desktop Side Panel (>= 1024px) -->
  <div
    v-else-if="isPanelOpen"
    ref="focusTrapRef"
    role="dialog"
    aria-labelledby="win-state-title"
    aria-describedby="win-state-description"
    class="win-state-panel"
  >
    <!-- Win State -->
    <div v-if="isWon" class="win-state__content win-state__content--win">
      <div class="win-state__header">
        <h2
          id="win-state-title"
          class="win-state__title"
        >
          🎉 You Won!
        </h2>
        <p
          id="win-state-description"
          class="win-state__message"
        >
          {{ winMessage }}
        </p>
        <p
          v-if="targetAnimal"
          class="win-state__target"
        >
          Target: <strong>{{ targetAnimal.name }}</strong>
          <span
            v-if="targetAnimal.scientificName"
            class="win-state__scientific-name"
          >
            ({{ targetAnimal.scientificName }})
          </span>
        </p>
        <p class="win-state__stats">
          Completed in {{ guessCount }} {{ guessCount === 1 ? "guess" : "guesses" }}
          out of {{ maxGuesses }}.
        </p>
      </div>

      <!-- Full Tree Visualization -->
      <div class="win-state__tree">
        <h3 class="win-state__tree-title">
          Complete Phylogenetic Tree
        </h3>
        <div class="win-state__tree-container">
          <GameTreeVisualization
            :tree-data="treeData"
            :show-target="true"
            :width="600"
            :height="500"
          />
        </div>
      </div>
    </div>

    <!-- Loss State -->
    <div v-else-if="isLost" class="win-state__content win-state__content--loss">
      <div class="win-state__header">
        <h2
          id="win-state-title"
          class="win-state__title"
        >
          Game Over
        </h2>
        <p
          id="win-state-description"
          class="win-state__message"
        >
          {{ lossMessage }}
        </p>
        <p
          v-if="targetAnimal"
          class="win-state__target"
        >
          Target: <strong>{{ targetAnimal.name }}</strong>
          <span
            v-if="targetAnimal.scientificName"
            class="win-state__scientific-name"
          >
            ({{ targetAnimal.scientificName }})
          </span>
        </p>
        <p class="win-state__stats">
          You used all {{ maxGuesses }} guesses. Keep learning and try again!
        </p>
      </div>

      <!-- Full Tree Visualization -->
      <div class="win-state__tree">
        <h3 class="win-state__tree-title">
          Complete Phylogenetic Tree
        </h3>
        <div class="win-state__tree-container">
          <GameTreeVisualization
            :tree-data="treeData"
            :show-target="true"
            :width="600"
            :height="500"
          />
        </div>
      </div>
    </div>
  </div>
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

/* Win State Content */
.win-state__content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.win-state__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.win-state__title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

.win-state__content--win .win-state__title {
  color: var(--color-success, #059669);
}

.dark .win-state__content--win .win-state__title {
  color: #10b981;
}

.win-state__content--loss .win-state__title {
  color: var(--color-error, #dc2626);
}

.dark .win-state__content--loss .win-state__title {
  color: #f87171;
}

.win-state__message {
  font-size: 1.125rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-muted, #374151);
}

.dark .win-state__message {
  color: #d1d5db;
}

.win-state__target {
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__target {
  color: #9ca3af;
}

.win-state__target strong {
  font-weight: 600;
  color: var(--color-ink, #111827);
}

.dark .win-state__target strong {
  color: #f9fafb;
}

.win-state__scientific-name {
  font-style: italic;
  font-size: 0.875rem;
  margin-left: 0.25rem;
}

.win-state__stats {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-subtle, #6b7280);
}

.dark .win-state__stats {
  color: #9ca3af;
}

.win-state__tree {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.win-state__tree-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink, #111827);
}

.dark .win-state__tree-title {
  color: #f9fafb;
}

.win-state__tree-container {
  width: 100%;
  border: 1px solid var(--color-border-subtle, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-surface, #f9fafb);
}

.dark .win-state__tree-container {
  border-color: #374151;
  background: #1f2937;
}

/* Desktop Side Panel */
.win-state-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  max-width: 90vw;
  height: 100vh;
  background: var(--color-surface, #ffffff);
  box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 50;
  overflow-y: auto;
  padding: 1.5rem;
}

.dark .win-state-panel {
  background: #1f2937;
  box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.3);
}

/* Mobile optimizations (< 768px) */
@media (max-width: 767px) {
  .win-state__content {
    gap: 1rem;
  }

  .win-state__header {
    gap: 0.5rem;
  }

  .win-state__title {
    font-size: 1.25rem;
  }

  .win-state__message {
    font-size: 1rem;
  }

  .win-state__tree-container {
    max-height: 300px;
    overflow: auto;
  }

  /* Ensure touch-friendly spacing */
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

  .win-state__tree-container {
    max-height: 500px;
    overflow: auto;
  }
}

/* Focus styles for accessibility */
.win-state:focus,
.win-state-panel:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
}
</style>
