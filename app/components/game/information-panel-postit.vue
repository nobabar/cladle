<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { TreeNode } from "~/types/tree";

/**
 * Information Panel Post-it Component
 *
 * Displays information about tree nodes in a post-it note style.
 * Fixed position in bottom-right corner with modern design, supports
 * keyboard navigation and screen reader accessibility.
 */

/**
 * Props
 */
interface Props {
  /** Controls panel visibility */
  isOpen?: boolean;
  /** Node data to display */
  nodeData?: TreeNode | null;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  nodeData: null,
});

/**
 * Emits
 */
const emit = defineEmits<{
  "close": [];
  "update:isOpen": [value: boolean];
}>();

/**
 * Focus trap element ref
 */
const focusTrapRef = ref<HTMLElement | null>(null);

/**
 * Sticky tab element ref
 */
const stickyTabRef = ref<HTMLElement | null>(null);

/**
 * Previous focus element (to restore on close)
 */
let previousFocusElement: HTMLElement | null = null;

/**
 * Drag state
 */
const isDragging = ref(false);
const hasDragged = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragOffsetX = ref(0);
const dragOffsetY = ref(0);

/**
 * Handle escape key to close panel
 * @param event - Keyboard event
 */
function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && props.isOpen) {
    event.preventDefault();
    closePanel();
  }
}

/**
 * Close the panel
 */
function closePanel() {
  emit("close");
  emit("update:isOpen", false);
}

/**
 * Handle sticky tab click (only if not dragged)
 * @param _event - Mouse event
 */
function handleStickyTabClick(_event: MouseEvent) {
  // Only close if it wasn't a drag operation
  if (!hasDragged.value) {
    closePanel();
  }
  // Reset drag state
  hasDragged.value = false;
}

/**
 * Handle mouse down on sticky tab to start drag
 * @param event - Mouse event
 */
function handleStickyTabMouseDown(event: MouseEvent) {
  if (!focusTrapRef.value) return;

  isDragging.value = true;
  hasDragged.value = false;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;

  const rect = focusTrapRef.value.getBoundingClientRect();
  dragOffsetX.value = event.clientX - rect.left;
  dragOffsetY.value = event.clientY - rect.top;

  event.preventDefault();
}

/**
 * Handle mouse move during drag
 * @param event - Mouse event
 */
function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value || !focusTrapRef.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Mark as dragged if moved more than 5px
  if (distance > 5) {
    hasDragged.value = true;
  }

  // Update position
  focusTrapRef.value.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${2 + deltaX * 0.1}deg)`;
  focusTrapRef.value.style.opacity = String(1 - Math.abs(deltaY) / 200);
}

/**
 * Handle mouse up to end drag
 * @param event - Mouse event
 */
function handleMouseUp(event: MouseEvent) {
  if (!isDragging.value || !focusTrapRef.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // If dragged far enough (more than 100px), remove the post-it
  if (distance > 100) {
    closePanel();
  } else {
    // Snap back to original position
    focusTrapRef.value.style.transform = "";
    focusTrapRef.value.style.opacity = "";
  }

  isDragging.value = false;
}

/**
 * Handle touch events for mobile
 * @param event - Touch event
 */
function handleStickyTabTouchStart(event: TouchEvent) {
  if (!focusTrapRef.value || event.touches.length === 0) return;

  const touch = event.touches[0];
  if (!touch) return;

  isDragging.value = true;
  hasDragged.value = false;
  dragStartX.value = touch.clientX;
  dragStartY.value = touch.clientY;

  const rect = focusTrapRef.value.getBoundingClientRect();
  dragOffsetX.value = touch.clientX - rect.left;
  dragOffsetY.value = touch.clientY - rect.top;

  event.preventDefault();
}

/**
 * Handle touch move during drag
 * @param event - Touch event
 */
function handleTouchMove(event: TouchEvent) {
  if (!isDragging.value || !focusTrapRef.value || event.touches.length === 0) return;

  const touch = event.touches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX.value;
  const deltaY = touch.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Mark as dragged if moved more than 5px
  if (distance > 5) {
    hasDragged.value = true;
  }

  focusTrapRef.value.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${2 + deltaX * 0.1}deg)`;
  focusTrapRef.value.style.opacity = String(1 - Math.abs(deltaY) / 200);
}

/**
 * Handle touch end to finish drag
 * @param event - Touch event
 */
function handleTouchEnd(event: TouchEvent) {
  if (!isDragging.value || !focusTrapRef.value || event.changedTouches.length === 0) return;

  const touch = event.changedTouches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX.value;
  const deltaY = touch.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance > 100) {
    closePanel();
  } else {
    focusTrapRef.value.style.transform = "";
    focusTrapRef.value.style.opacity = "";
  }

  isDragging.value = false;
}

/**
 * Focus management for accessibility
 */
function manageFocus() {
  if (props.isOpen && focusTrapRef.value) {
    // Store previous focus
    previousFocusElement = document.activeElement as HTMLElement;
    // Focus the post-it container (not the sticky tab)
    if (focusTrapRef.value instanceof HTMLElement) {
      focusTrapRef.value.focus();
    }
    // Remove focus from any focused element inside (like the sticky tab)
    nextTick(() => {
      const focusedElement = focusTrapRef.value?.querySelector(":focus") as HTMLElement;
      if (focusedElement) {
        focusedElement.blur();
      }
    });
  } else if (previousFocusElement) {
    // Restore previous focus when closed
    previousFocusElement.focus();
    previousFocusElement = null;
  }
}

/**
 * Handle Tab key navigation within post-it (focus trap)
 * @param event - Keyboard event
 */
function handleTabKey(event: KeyboardEvent) {
  if (!props.isOpen || !focusTrapRef.value) {
    return;
  }

  const focusableElements = focusTrapRef.value.querySelectorAll(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
  );
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable?.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable?.focus();
    }
  }
}

/**
 * Screen reader announcement for panel open/close
 */
const screenReaderAnnouncement = computed(() => {
  if (!props.isOpen) {
    return "";
  }
  if (!props.nodeData) {
    return "Information post-it opened";
  }
  const nodeType = props.nodeData.type === "animal" ? "Animal" : "Clade";
  return `${nodeType} information post-it opened: ${props.nodeData.name}`;
});

/**
 * Watch for panel open state to manage focus
 */
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Reset drag state when opening
    isDragging.value = false;
    hasDragged.value = false;
    // Use nextTick to ensure DOM is updated
    nextTick(() => {
      // Small delay to ensure transition classes are applied
      setTimeout(() => {
        manageFocus();
      }, 50);
    });
  } else {
    // Reset drag state and transform when closing
    isDragging.value = false;
    hasDragged.value = false;
    if (focusTrapRef.value) {
      focusTrapRef.value.style.transform = "";
      focusTrapRef.value.style.opacity = "";
    }
    // Restore focus when closing
    if (previousFocusElement) {
      previousFocusElement.focus();
      previousFocusElement = null;
    }
  }
});

/**
 * Setup on mount
 */
onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("keydown", handleTabKey);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  }
});

/**
 * Cleanup on unmount
 */
onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleEscape);
    window.removeEventListener("keydown", handleTabKey);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
  }
});
</script>

<template>
  <!-- Screen Reader Announcement -->
  <div
    v-if="isOpen"
    class="sr-only"
    aria-live="polite"
    aria-atomic="true"
  >
    {{ screenReaderAnnouncement }}
  </div>

  <!-- Post-it Note -->
  <Teleport to="body">
    <Transition
      enter-active-class="postit-enter-active"
      enter-from-class="postit-enter-from"
      enter-to-class="postit-enter-to"
      leave-active-class="postit-leave-active"
      leave-from-class="postit-leave-from"
      leave-to-class="postit-leave-to"
    >
      <div
        v-if="isOpen"
        ref="focusTrapRef"
        role="complementary"
        aria-labelledby="postit-panel-title"
        aria-describedby="postit-panel-description"
        aria-label="Information post-it"
        class="information-panel-postit"
        :class="{ 'information-panel-postit--dragging': isDragging }"
        tabindex="-1"
      >
        <!-- Sticky Tab (adhesive part) -->
        <div
          ref="stickyTabRef"
          class="information-panel-postit__sticky-tab"
          role="button"
          tabindex="0"
          aria-label="Drag to remove post-it or click to close"
          @mousedown="handleStickyTabMouseDown"
          @touchstart="handleStickyTabTouchStart"
          @click="handleStickyTabClick"
          @keydown.enter="closePanel"
          @keydown.space.prevent="closePanel"
        >
          <div class="information-panel-postit__sticky-tab-texture" />
        </div>

        <!-- Post-it Header -->
        <div class="information-panel-postit__header">
          <h2
            id="postit-panel-title"
            class="information-panel-postit__title"
          >
            {{ nodeData?.name || "Information" }}
          </h2>
        </div>

        <!-- Post-it Content -->
        <div
          id="postit-panel-description"
          class="information-panel-postit__content"
        >
          <p v-if="!nodeData" class="information-panel-postit__empty">
            No information available.
          </p>
          <div v-else>
            <p class="information-panel-postit__type">
              Type: <strong>{{ nodeData.type === "animal" ? "Animal" : "Clade" }}</strong>
            </p>
            <!-- Content will be added in Stories 5.3 and 5.4 -->
            <p class="information-panel-postit__placeholder">
              Detailed information will be displayed here in upcoming stories.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

/* Post-it Note Container */
.information-panel-postit {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 9999;
  width: 320px;
  max-width: calc(100vw - 2rem);
  background: linear-gradient(
    135deg,
    #fef9e7 0%,
    #fef3c7 50%,
    #fde68a 100%
  );
  border-radius: 0.375rem;
  padding: 1rem;
  padding-top: 1.5rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: rotate(2deg);
  transition: transform 0.2s ease, opacity 0.2s ease;
  box-sizing: border-box;
  cursor: default;
}

.information-panel-postit:hover {
  transform: rotate(1deg) scale(1.02);
}

.information-panel-postit--dragging {
  transition: none;
  cursor: grabbing;
  user-select: none;
}

.dark .information-panel-postit {
  background: linear-gradient(
    135deg,
    #5a4530 0%,
    #6b5238 30%,
    #7d6245 60%,
    #8f7252 100%
  );
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.4),
    0 2px 4px -1px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 10px 15px -3px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Sticky Tab (adhesive part) */
.information-panel-postit__sticky-tab {
  position: absolute;
  top: -12px;
  right: 20px;
  width: 60px;
  height: 24px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.7) 50%,
    rgba(255, 255, 255, 0.5) 100%
  );
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 2px 2px 0 0;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 -2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
  z-index: 1;
}

.information-panel-postit__sticky-tab:hover {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.6) 100%
  );
  box-shadow:
    0 -2px 6px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
}

.information-panel-postit__sticky-tab:active {
  cursor: grabbing;
  transform: translateY(0);
}

.information-panel-postit__sticky-tab:focus {
  outline: 2px solid var(--color-focus-ring, #6B7F8E);
  outline-offset: 2px;
}

.dark .information-panel-postit__sticky-tab {
  background: linear-gradient(
    180deg,
    rgba(90, 69, 48, 0.95) 0%,
    rgba(107, 82, 56, 0.85) 50%,
    rgba(125, 98, 69, 0.75) 100%
  );
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow:
    0 -2px 4px rgba(0, 0, 0, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.1),
    inset 0 -1px 1px rgba(0, 0, 0, 0.2);
}

.dark .information-panel-postit__sticky-tab:hover {
  background: linear-gradient(
    180deg,
    rgba(107, 82, 56, 0.98) 0%,
    rgba(125, 98, 69, 0.9) 50%,
    rgba(143, 114, 82, 0.8) 100%
  );
  box-shadow:
    0 -2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(255, 255, 255, 0.15),
    inset 0 -1px 1px rgba(0, 0, 0, 0.3);
}

.information-panel-postit__sticky-tab-texture {
  width: 100%;
  height: 100%;
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    );
  border-radius: 2px 2px 0 0;
  pointer-events: none;
}

.dark .information-panel-postit__sticky-tab-texture {
  background-image:
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.05) 2px,
      rgba(255, 255, 255, 0.05) 4px
    );
}

/* Post-it Header */
.information-panel-postit__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 0.75rem;
}

.dark .information-panel-postit__header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.information-panel-postit__title {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  color: var(--color-ink, #2C2416);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .information-panel-postit__title {
  color: var(--color-ink, #f9fafb);
}

/* Post-it Content */
.information-panel-postit__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.information-panel-postit__empty {
  color: var(--color-ink-subtle, #6B7280);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.dark .information-panel-postit__empty {
  color: var(--color-ink-subtle, #9ca3af);
}

.information-panel-postit__type {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-muted, #4B4333);
}

.dark .information-panel-postit__type {
  color: var(--color-ink-muted, #e5e7eb);
}

.information-panel-postit__type strong {
  font-weight: 600;
  color: var(--color-ink, #2C2416);
}

.dark .information-panel-postit__type strong {
  color: var(--color-ink, #f9fafb);
}

.information-panel-postit__placeholder {
  font-size: 0.75rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-subtle, #6B7280);
  font-style: italic;
}

.dark .information-panel-postit__placeholder {
  color: var(--color-ink-subtle, #9ca3af);
}

/* Responsive Sizing */
/* Mobile (< 768px) */
@media (max-width: 767px) {
  .information-panel-postit {
    width: 280px;
    bottom: 0.75rem;
    right: 0.75rem;
    padding: 0.75rem;
    padding-top: 1.25rem;
    transform: rotate(1.5deg);
  }

  .information-panel-postit__sticky-tab {
    width: 50px;
    height: 20px;
    right: 15px;
    top: -10px;
  }

  .information-panel-postit__header {
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .information-panel-postit__title {
    font-size: 1rem;
  }

  .information-panel-postit__content {
    gap: 0.375rem;
    max-height: 50vh;
  }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .information-panel-postit {
    width: 340px;
    bottom: 1rem;
    right: 1rem;
  }
}

/* Desktop (>= 1024px) */
@media (min-width: 1024px) {
  .information-panel-postit {
    width: 360px;
    bottom: 1.5rem;
    right: 1.5rem;
  }

  .information-panel-postit__header {
    padding-bottom: 0.875rem;
    margin-bottom: 0.875rem;
  }

  .information-panel-postit__title {
    font-size: 1.25rem;
  }
}

/* Transitions */
.postit-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.postit-enter-from {
  opacity: 0;
  transform: rotate(5deg) scale(0.8) translateY(20px);
}

.postit-enter-to {
  opacity: 1;
  transform: rotate(2deg) scale(1) translateY(0);
}

.postit-leave-active {
  transition: all 0.2s ease-in;
}

.postit-leave-from {
  opacity: 1;
  transform: rotate(2deg) scale(1) translateY(0);
}

.postit-leave-to {
  opacity: 0;
  transform: rotate(5deg) scale(0.8) translateY(20px);
}

/* Focus styles for accessibility */
.information-panel-postit:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
}
</style>
