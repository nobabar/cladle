<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { TreeNode } from "~/types/tree";
import type { Clade } from "~/types/clade";
import type { Animal } from "~/types/animal";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";

import { useResponsive } from "~/composables/useResponsive";
import { useUiIcons } from "~/composables/useUiIcons";

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  nodeData: null,
  positionSide: "right",
});

const emit = defineEmits<{
  "close": [];
  "update:isOpen": [value: boolean];
}>();

const { t } = useI18n();
const uiIcon = useUiIcons();

interface Props {
  /** Controls panel visibility */
  isOpen?: boolean;
  /** Node data to display */
  nodeData?: TreeNode | null;
  /** Which side to anchor the panel: 'right' (default) or 'left' */
  positionSide?: "left" | "right";
}

const { isMobile } = useResponsive();

const containerRef = ref<HTMLElement | null>(null);

const focusTrapRef = ref<HTMLElement | null>(null);

const stickyTabRef = ref<HTMLElement | null>(null);

let previousFocusElement: HTMLElement | null = null;

const isDragging = ref(false);
const hasDragged = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragOffsetX = ref(0);
const dragOffsetY = ref(0);
const isClosingViaDrag = ref(false);

const frontElement = ref<"postit" | "image">("postit");

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && props.isOpen) {
    event.preventDefault();
    closePanel();
  }
}

function handleClickOutside(event: MouseEvent) {
  if (!props.isOpen || !isMobile.value) {
    return;
  }
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    closePanel();
  }
}

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
 * Handle post-it click to bring it to front
 * @param event - Mouse event
 */
function handlePostitClick(event: MouseEvent) {
  // Don't switch if clicking on sticky tab
  if ((event.target as HTMLElement).closest(".information-panel-postit__sticky-tab")) {
    return;
  }
  // Don't switch if we just dragged (check if mouse moved significantly)
  if (hasDragged.value) {
    // Reset hasDragged for next interaction
    hasDragged.value = false;
    return;
  }
  // Only switch if post-it is currently behind
  if (frontElement.value === "image") {
    event.stopPropagation();
    frontElement.value = "postit";
  }
}

/**
 * Handle image card click to bring it to front
 * @param event - Mouse event
 */
function handleImageCardClick(event: MouseEvent) {
  // Don't switch if we just dragged (check if mouse moved significantly)
  if (hasDragged.value) {
    // Reset hasDragged for next interaction
    hasDragged.value = false;
    return;
  }
  // Only switch if image is currently behind
  if (frontElement.value === "postit") {
    event.stopPropagation();
    frontElement.value = "image";
  }
}

function handleStickyTabMouseDown(event: MouseEvent) {
  if (!containerRef.value) return;

  isDragging.value = true;
  hasDragged.value = false;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;

  const rect = containerRef.value.getBoundingClientRect();
  dragOffsetX.value = event.clientX - rect.left;
  dragOffsetY.value = event.clientY - rect.top;

  event.preventDefault();
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Mark as dragged if moved more than 5px
  if (distance > 5) {
    hasDragged.value = true;
  }

  // Update position of entire container
  containerRef.value.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  containerRef.value.style.opacity = String(1 - distance / 200);
}

function handleMouseUp(event: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // If dragged far enough (more than 100px), remove the post-it
  if (distance > 100) {
    isClosingViaDrag.value = true;
    closePanel();
  } else {
    // Snap back to original position
    containerRef.value.style.transform = "";
    containerRef.value.style.opacity = "";
  }

  isDragging.value = false;
  // Reset hasDragged immediately - click handlers will check distance themselves
  hasDragged.value = false;
}

function handleStickyTabTouchStart(event: TouchEvent) {
  if (!containerRef.value || event.touches.length === 0) return;

  const touch = event.touches[0];
  if (!touch) return;

  isDragging.value = true;
  hasDragged.value = false;
  dragStartX.value = touch.clientX;
  dragStartY.value = touch.clientY;

  const rect = containerRef.value.getBoundingClientRect();
  dragOffsetX.value = touch.clientX - rect.left;
  dragOffsetY.value = touch.clientY - rect.top;

  event.preventDefault();
}

function handleTouchMove(event: TouchEvent) {
  if (!isDragging.value || !containerRef.value || event.touches.length === 0) return;

  const touch = event.touches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX.value;
  const deltaY = touch.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Mark as dragged if moved more than 5px
  if (distance > 5) {
    hasDragged.value = true;
  }

  containerRef.value.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  containerRef.value.style.opacity = String(1 - distance / 200);
}

function handleTouchEnd(event: TouchEvent) {
  if (!isDragging.value || !containerRef.value || event.changedTouches.length === 0) return;

  const touch = event.changedTouches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX.value;
  const deltaY = touch.clientY - dragStartY.value;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance > 100) {
    isClosingViaDrag.value = true;
    closePanel();
  } else {
    containerRef.value.style.transform = "";
    containerRef.value.style.opacity = "";
  }

  isDragging.value = false;
  // Reset hasDragged after a short delay to allow click handlers to check it
  setTimeout(() => {
    hasDragged.value = false;
  }, 10);
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

const api = useBiologicalAPI();

const cladeData = ref<Clade | null>(null);
const isLoadingClade = ref(false);
const cladeError = ref<string | null>(null);

const animalData = ref<Animal | null>(null);
const isLoadingAnimal = ref(false);
const animalError = ref<string | null>(null);

async function fetchCladeInfo(cladeName: string) {
  isLoadingClade.value = true;
  cladeError.value = null;
  cladeData.value = null;

  try {
    const response = await api.fetchCladeData(cladeName);
    if (response.error) {
      cladeError.value = response.error.message || t("informationPanel.loadCladeFailed");
    } else if (response.data) {
      cladeData.value = response.data;
    }
  } catch (err) {
    cladeError.value = t("informationPanel.loadCladeFailed");
    console.error("Error fetching clade data:", err);
  } finally {
    isLoadingClade.value = false;
  }
}

async function fetchAnimalInfo(animalId: string) {
  isLoadingAnimal.value = true;
  animalError.value = null;
  animalData.value = null;

  try {
    const response = await api.fetchAnimalData(animalId);
    if (response.error) {
      animalError.value = response.error.message || t("informationPanel.loadAnimalFailed");
    } else if (response.data) {
      animalData.value = response.data;
    }
  } catch (err) {
    animalError.value = t("informationPanel.loadAnimalFailed");
    console.error("Error fetching animal data:", err);
  } finally {
    isLoadingAnimal.value = false;
  }
}

/**
 * Watch for node data changes to refresh clade and animal information
 */
watch(
  () => props.nodeData,
  (newNodeData) => {
    // Clear previous data when node changes
    cladeData.value = null;
    cladeError.value = null;
    isLoadingClade.value = false;
    animalData.value = null;
    animalError.value = null;
    isLoadingAnimal.value = false;

    // Fetch clade data if node is a clade
    if (newNodeData && newNodeData.type === "clade" && props.isOpen) {
      const cladeName = newNodeData.cladeData?.name || newNodeData.name;
      if (cladeName) {
        fetchCladeInfo(cladeName);
      }
    }

    // Fetch animal data if node is an animal
    if (newNodeData && newNodeData.type === "animal" && props.isOpen) {
      const animalId = newNodeData.data?.id || newNodeData.id;
      if (animalId) {
        fetchAnimalInfo(animalId);
      }
    }
  },
  { immediate: true },
);

/**
 * Watch for panel open state to fetch data when panel opens
 */
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.nodeData) {
      if (props.nodeData.type === "clade") {
        const cladeName = props.nodeData.cladeData?.name || props.nodeData.name;
        if (cladeName && !cladeData.value) {
          fetchCladeInfo(cladeName);
        }
      } else if (props.nodeData.type === "animal") {
        const animalId = props.nodeData.data?.id || props.nodeData.id;
        if (animalId && !animalData.value) {
          fetchAnimalInfo(animalId);
        }
      }
    }
  },
);

/**
 * Format rank for display (capitalize first letter)
 */
const formattedRank = computed(() => {
  if (!cladeData.value?.rank) return "";
  const rank = cladeData.value.rank;
  return rank.charAt(0).toUpperCase() + rank.slice(1);
});

/**
 * Sanitize HTML to only allow basic formatting tags (<b>, <i>)
 * Uses DOM API for secure parsing and filtering - much safer than regex
 * Removes all other HTML tags, attributes, and potentially dangerous content
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string with only <b> and <i> tags (no attributes)
 */
function sanitizeBasicHTML(html: string): string {
  if (!html || typeof window === "undefined") return html || "";

  try {
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    /**
     * Recursively sanitize DOM nodes
     * Only keeps text nodes and allowed tags (<b>, <i>) without attributes
     * @param node - DOM node to sanitize
     * @returns Sanitized HTML string
     */
    function sanitizeNode(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        // Text nodes are safe - just return the text content
        return node.textContent || "";
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Only allow <b> and <i> tags
        if (tagName === "b" || tagName === "i") {
          // Get sanitized children
          let childrenHTML = "";
          for (const child of Array.from(element.childNodes)) {
            childrenHTML += sanitizeNode(child);
          }
          // Return tag without any attributes (security: strip all attributes)
          return `<${tagName}>${childrenHTML}</${tagName}>`;
        }

        // For disallowed tags, process children but don't include the tag itself
        // This preserves text content while removing dangerous tags
        let childrenHTML = "";
        for (const child of Array.from(element.childNodes)) {
          childrenHTML += sanitizeNode(child);
        }
        return childrenHTML;
      }

      // For other node types (comments, etc.), return empty string
      return "";
    }

    // Sanitize all child nodes
    let sanitized = "";
    for (const child of Array.from(tempDiv.childNodes)) {
      sanitized += sanitizeNode(child);
    }

    return sanitized;
  } catch (error) {
    // If parsing fails, escape everything for safety
    console.warn("HTML sanitization failed, escaping content:", error);
    return html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

/**
 * Sanitized animal description with basic HTML formatting
 */
const sanitizedAnimalDescription = computed(() => {
  if (!animalData.value?.description) return "";
  return sanitizeBasicHTML(animalData.value.description);
});

/**
 * Sanitized clade description with basic HTML formatting
 */
const sanitizedCladeDescription = computed(() => {
  if (!cladeData.value?.description) return "";
  return sanitizeBasicHTML(cladeData.value.description);
});

/**
 * Screen reader announcement for panel open/close
 */
const screenReaderAnnouncement = computed(() => {
  if (!props.isOpen) {
    return "";
  }
  if (!props.nodeData) {
    return t("informationPanel.srOpenedGeneric");
  }
  const nodeType = props.nodeData.type === "animal"
    ? t("informationPanel.nodeTypeAnimal")
    : t("informationPanel.nodeTypeClade");
  return t("informationPanel.srOpenedWithNode", {
    nodeType,
    name: props.nodeData.name,
  });
});

const cladeImageAlt = computed(() => {
  const name = cladeData.value?.name ?? "";
  return name
    ? t("informationPanel.imageAltClade", { name })
    : "";
});

const animalImageAlt = computed(() => {
  if (!animalData.value) {
    return "";
  }
  const scientificName
    = animalData.value.scientificName || t("informationPanel.scientificNameFallback");
  return t("informationPanel.imageAltAnimal", {
    name: animalData.value.name,
    scientificName,
  });
});

/**
 * Watch for panel open state to manage focus
 */
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Reset drag state when opening
    isDragging.value = false;
    hasDragged.value = false;
    isClosingViaDrag.value = false;
    // Reset transform in case it was left from previous close
    if (containerRef.value) {
      containerRef.value.style.transform = "";
      containerRef.value.style.opacity = "";
    }
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
    frontElement.value = "postit"; // Reset to default when closing

    // If closing via drag, preserve transform during transition
    // The transform should remain from the drag operation
    if (isClosingViaDrag.value) {
      // Wait for transition to complete (0.2s based on postit-leave-active)
      // Use nextTick to ensure Vue has started the transition
      nextTick(() => {
        setTimeout(() => {
          if (containerRef.value) {
            containerRef.value.style.transform = "";
            containerRef.value.style.opacity = "";
          }
          isClosingViaDrag.value = false;
        }, 200);
      });
    } else {
      // Reset immediately for non-drag closes
      if (containerRef.value) {
        containerRef.value.style.transform = "";
        containerRef.value.style.opacity = "";
      }
    }

    // Restore focus when closing
    if (previousFocusElement) {
      previousFocusElement.focus();
      previousFocusElement = null;
    }
  }
});

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("keydown", handleTabKey);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("click", handleClickOutside, true);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleEscape);
    window.removeEventListener("keydown", handleTabKey);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("click", handleClickOutside, true);
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

  <!-- Post-it Note and Image Card Container -->
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
        ref="containerRef"
        class="information-panel-container"
        :class="{
          'information-panel-container--dragging': isDragging,
          'information-panel-container--left': props.positionSide === 'left',
        }"
      >
        <!-- Sticky Tab (adhesive part - always on top) -->
        <div
          ref="stickyTabRef"
          class="information-panel-postit__sticky-tab"
          role="button"
          tabindex="0"
          :aria-label="t('informationPanel.stickyTabAriaLabel')"
          @mousedown="handleStickyTabMouseDown"
          @touchstart="handleStickyTabTouchStart"
          @click="handleStickyTabClick"
          @keydown.enter="closePanel"
          @keydown.space.prevent="closePanel"
        >
          <div class="information-panel-postit__sticky-tab-texture" />
        </div>

        <!-- Post-it Note -->
        <div
          ref="focusTrapRef"
          role="complementary"
          aria-labelledby="postit-panel-title"
          aria-describedby="postit-panel-description"
          :aria-label="t('informationPanel.postitAriaLabel')"
          class="information-panel-postit"
          :class="{
            'information-panel-postit--dragging': isDragging,
            'information-panel-postit--front': frontElement === 'postit',
            'information-panel-postit--behind': frontElement === 'image',
          }"
          tabindex="-1"
          @click="handlePostitClick"
        >
          <!-- Post-it Header (title only shown when no node data) -->
          <div class="information-panel-postit__header">
            <h2
              v-if="!nodeData"
              id="postit-panel-title"
              class="information-panel-postit__title"
            >
              {{ t("informationPanel.titleFallback") }}
            </h2>
          </div>

          <!-- Post-it Content -->
          <div
            id="postit-panel-description"
            class="information-panel-postit__content"
          >
            <p v-if="!nodeData" class="information-panel-postit__empty">
              {{ t("informationPanel.emptyNoNode") }}
            </p>
            <!-- Clade Information Display -->
            <div v-else-if="nodeData.type === 'clade'">
              <!-- Loading State -->
              <div v-if="isLoadingClade" class="information-panel-postit__loading">
                <p>{{ t("informationPanel.loadingClade") }}</p>
              </div>
              <!-- Error State -->
              <div v-else-if="cladeError" class="information-panel-postit__error">
                <p>{{ cladeError }}</p>
              </div>
              <!-- Clade Data Display -->
              <div v-else-if="cladeData" class="information-panel-postit__clade-info">
                <!-- Clade Name and Rank -->
                <div class="information-panel-postit__clade-header">
                  <h3 class="information-panel-postit__clade-name">
                    {{ cladeData.name }}
                  </h3>
                  <p v-if="formattedRank" class="information-panel-postit__clade-rank">
                    {{ formattedRank }}
                  </p>
                </div>

                <!-- Clade Description -->
                <div class="information-panel-postit__clade-description-block">
                  <div
                    v-if="cladeData.description"
                    class="information-panel-postit__clade-description"
                  >
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p v-html="sanitizedCladeDescription" />
                  </div>
                  <p
                    v-else
                    class="information-panel-postit__no-description"
                  >
                    {{ t("informationPanel.noDescription") }}
                  </p>
                </div>

                <!-- Clade Links -->
                <div
                  v-if="cladeData.url || cladeData.wikipediaUrl"
                  class="information-panel-postit__links"
                >
                  <a
                    v-if="cladeData.url"
                    :href="cladeData.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="information-panel-postit__link"
                    :aria-label="t('winState.viewOnINaturalist')"
                  >
                    <Icon
                      :name="uiIcon.externalLink"
                      class="information-panel-postit__link-icon"
                    />
                    iNaturalist
                  </a>
                  <span
                    v-if="cladeData.url && cladeData.wikipediaUrl"
                    class="information-panel-postit__link-separator"
                  >·</span>
                  <a
                    v-if="cladeData.wikipediaUrl"
                    :href="cladeData.wikipediaUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="information-panel-postit__link"
                    :aria-label="t('winState.viewOnWikipedia')"
                  >
                    <Icon
                      :name="uiIcon.externalLink"
                      class="information-panel-postit__link-icon"
                    />
                    Wikipedia
                  </a>
                </div>
              </div>
              <!-- Fallback: No clade data loaded yet -->
              <div v-else class="information-panel-postit__empty">
                <p>{{ t("informationPanel.loadingClade") }}</p>
              </div>
            </div>
            <!-- Animal Information Display -->
            <div v-else-if="nodeData.type === 'animal'">
              <!-- Loading State -->
              <div v-if="isLoadingAnimal" class="information-panel-postit__loading">
                <p>{{ t("informationPanel.loadingAnimal") }}</p>
              </div>
              <!-- Error State -->
              <div v-else-if="animalError" class="information-panel-postit__error">
                <p>{{ animalError }}</p>
              </div>
              <!-- Animal Data Display -->
              <div v-else-if="animalData" class="information-panel-postit__animal-info">
                <!-- Animal Name and Scientific Name -->
                <div class="information-panel-postit__animal-header">
                  <h3 class="information-panel-postit__animal-name">
                    {{ animalData.name }}
                  </h3>
                  <p
                    v-if="animalData.scientificName"
                    class="information-panel-postit__animal-scientific-name"
                  >
                    <em>{{ animalData.scientificName }}</em>
                  </p>
                </div>

                <!-- Animal Description (Wikipedia Summary) -->
                <div class="information-panel-postit__animal-description-block">
                  <div
                    v-if="animalData.description"
                    class="information-panel-postit__animal-description"
                  >
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p v-html="sanitizedAnimalDescription" />
                  </div>
                  <p
                    v-else
                    class="information-panel-postit__no-description"
                  >
                    {{ t("informationPanel.noDescription") }}
                  </p>
                </div>

                <!-- Animal Links -->
                <div
                  v-if="animalData.url || animalData.wikipediaUrl"
                  class="information-panel-postit__links"
                >
                  <a
                    v-if="animalData.url"
                    :href="animalData.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="information-panel-postit__link"
                    :aria-label="t('winState.viewOnINaturalist')"
                  >
                    <Icon
                      :name="uiIcon.externalLink"
                      class="information-panel-postit__link-icon"
                    />
                    iNaturalist
                  </a>
                  <span
                    v-if="animalData.url && animalData.wikipediaUrl"
                    class="information-panel-postit__link-separator"
                  >·</span>
                  <a
                    v-if="animalData.wikipediaUrl"
                    :href="animalData.wikipediaUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="information-panel-postit__link"
                    :aria-label="t('winState.viewOnWikipedia')"
                  >
                    <Icon
                      :name="uiIcon.externalLink"
                      class="information-panel-postit__link-icon"
                    />
                    Wikipedia
                  </a>
                </div>
              </div>
              <!-- Fallback: No animal data loaded yet -->
              <div v-else class="information-panel-postit__empty">
                <p>{{ t("informationPanel.loadingAnimal") }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Image Card (for clades and animals with images, positioned behind post-it) -->
        <Transition
          enter-active-class="image-card-enter-active"
          enter-from-class="image-card-enter-from"
          enter-to-class="image-card-enter-to"
          leave-active-class="image-card-leave-active"
          leave-from-class="image-card-leave-from"
          leave-to-class="image-card-leave-to"
        >
          <div
            v-if="
              (nodeData?.type === 'clade'
                && cladeData?.imageUrl
                && !isLoadingClade
                && !cladeError)
                || (nodeData?.type === 'animal'
                  && animalData?.imageUrl
                  && !isLoadingAnimal
                  && !animalError)
            "
            class="information-panel-image-card"
            :class="{
              'information-panel-image-card--front': frontElement === 'image',
              'information-panel-image-card--behind': frontElement === 'postit',
            }"
            @click="handleImageCardClick"
          >
            <div class="information-panel-image-card__content">
              <!-- Clade Image -->
              <img
                v-if="nodeData?.type === 'clade' && cladeData?.imageUrl"
                :src="cladeData.imageUrl"
                :alt="cladeImageAlt"
                class="information-panel-image-card__image"
                loading="lazy"
              >
              <!-- Animal Image -->
              <img
                v-else-if="nodeData?.type === 'animal' && animalData?.imageUrl"
                :src="animalData.imageUrl"
                :alt="animalImageAlt"
                class="information-panel-image-card__image"
                loading="lazy"
              >
            </div>
          </div>
        </Transition>
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

/* Container for post-it and image card */
.information-panel-container {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 9999;
  width: 400px;
  max-width: calc(100vw - 2rem);
  height: fit-content;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.information-panel-container--left {
  right: auto;
  left: 1rem;
}

.information-panel-container--left .information-panel-postit {
  margin-left: 0;
  margin-right: auto;
  transform: rotate(-2deg);
}

.information-panel-container--left .information-panel-postit__sticky-tab {
  right: auto;
  left: 40px;
}

.information-panel-container--left .information-panel-postit--front:hover {
  transform: rotate(-1deg) scale(1.02);
}

.information-panel-container--left .information-panel-postit--behind:hover {
  transform: rotate(-2deg) scale(1.02);
}

.information-panel-container--left .information-panel-image-card {
  left: auto;
  right: 0;
  transform: rotate(1deg) translateX(20px);
}

.information-panel-container--left .information-panel-image-card--behind:hover {
  transform: rotate(0.5deg) translateX(20px) scale(1.02);
}

.information-panel-container--left .information-panel-image-card--front:hover {
  transform: rotate(0.5deg) translateX(20px) scale(1.02);
}

.information-panel-container--dragging {
  transition: none;
}

/* Post-it Note Container */
.information-panel-postit {
  position: relative;
  width: 320px;
  max-width: 100%;
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
  transition: transform 0.2s ease, opacity 0.2s ease, z-index 0.2s ease;
  box-sizing: border-box;
  cursor: default;
  margin-left: auto;
}

.information-panel-postit--front {
  z-index: 2;
}

.information-panel-postit--behind {
  z-index: 1;
  cursor: pointer;
}

.information-panel-postit--behind:hover {
  transform: rotate(2deg) scale(1.02);
}

.information-panel-postit--front:hover {
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
    #1e293b 0%,
    #243141 30%,
    #2a3849 60%,
    #304051 100%
  );
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.4),
    0 2px 4px -1px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 10px 15px -3px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Sticky Tab (adhesive part - connects both elements, always on top) */
.information-panel-postit__sticky-tab {
  position: absolute;
  top: -16px;
  right: 40px;
  width: 120px;
  height: 32px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0.5) 50%,
    rgba(255, 255, 255, 0.4) 100%
  );
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 2px 2px 0 0;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 -2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.6);
  transition: all 0.2s ease;
  z-index: 100;
}

.information-panel-postit__sticky-tab:hover {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.65) 0%,
    rgba(255, 255, 255, 0.55) 50%,
    rgba(255, 255, 255, 0.45) 100%
  );
  box-shadow:
    0 -2px 6px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.7);
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
    rgba(160, 140, 100, 0.5) 0%,
    rgba(150, 130, 90, 0.45) 50%,
    rgba(140, 120, 80, 0.4) 100%
  );
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 -2px 4px rgba(0, 0, 0, 0.4),
    inset 0 1px 2px rgba(255, 255, 255, 0.1),
    inset 0 -1px 1px rgba(0, 0, 0, 0.2);
}

.dark .information-panel-postit__sticky-tab:hover {
  background: linear-gradient(
    180deg,
    rgba(170, 150, 110, 0.55) 0%,
    rgba(160, 140, 100, 0.5) 50%,
    rgba(150, 130, 90, 0.45) 100%
  );
  box-shadow:
    0 -2px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(255, 255, 255, 0.15),
    inset 0 -1px 1px rgba(0, 0, 0, 0.25);
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

.information-panel-postit__header:empty {
  display: none;
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

/* Loading State */
.information-panel-postit__loading {
  padding: 1rem 0;
  text-align: center;
}

.information-panel-postit__loading p {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink-subtle, #6B7280);
}

.dark .information-panel-postit__loading p {
  color: var(--color-ink-subtle, #9ca3af);
}

/* Error State */
.information-panel-postit__error {
  padding: 1rem 0;
}

.information-panel-postit__error p {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-error, #dc2626);
}

.dark .information-panel-postit__error p {
  color: var(--color-error, #ef4444);
}

/* Clade Information */
.information-panel-postit__clade-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.information-panel-postit__clade-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .information-panel-postit__clade-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.information-panel-postit__clade-name {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
  color: var(--color-ink, #2C2416);
}

.dark .information-panel-postit__clade-name {
  color: var(--color-ink, #f9fafb);
}

.information-panel-postit__clade-rank {
  font-size: 0.8125rem;
  line-height: 1.4;
  margin: 0;
  color: var(--color-ink-muted, #4B4333);
  font-style: italic;
}

.dark .information-panel-postit__clade-rank {
  color: var(--color-ink-muted, #e5e7eb);
}

/* Image Card (positioned behind post-it) */
.information-panel-image-card {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 280px;
  max-width: 100%;
  background: var(--color-paper, #FDFBF5);
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  transform: rotate(-1deg) translateX(-20px);
  transition: transform 0.2s ease, opacity 0.2s ease, z-index 0.2s ease;
  cursor: default;
}

.information-panel-image-card--front {
  z-index: 2;
}

.information-panel-image-card--behind {
  z-index: 1;
  cursor: pointer;
}

.information-panel-image-card--behind:hover {
  transform: rotate(-0.5deg) translateX(-20px) scale(1.02);
}

.information-panel-image-card--front:hover {
  transform: rotate(-0.5deg) translateX(-20px) scale(1.02);
}

.dark .information-panel-image-card {
  background: var(--color-paper, #1e293b);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.4),
    0 2px 4px -1px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}

.information-panel-image-card__content {
  width: 100%;
  overflow: hidden;
  border-radius: 0.375rem;
}

.information-panel-image-card__image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  border-radius: 0.375rem;
}

/* Clade / animal description area */
.information-panel-postit__clade-description-block,
.information-panel-postit__animal-description-block {
  margin-top: 0.25rem;
}

.information-panel-postit__clade-description {
  margin-top: 0;
}

.information-panel-postit__no-description {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  color: var(--color-ink-muted, #4b4333);
  font-style: italic;
  text-align: left;
}

.dark .information-panel-postit__no-description {
  color: var(--color-ink-muted, #9ca3af);
}

.information-panel-postit__clade-description p {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  color: var(--color-ink, #2C2416);
  text-align: left;
}

.dark .information-panel-postit__clade-description p {
  color: var(--color-ink, #f9fafb);
}

/* Animal Information */
.information-panel-postit__animal-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.information-panel-postit__animal-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .information-panel-postit__animal-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.information-panel-postit__animal-name {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
  color: var(--color-ink, #2C2416);
}

.dark .information-panel-postit__animal-name {
  color: var(--color-ink, #f9fafb);
}

.information-panel-postit__animal-scientific-name {
  font-size: 0.8125rem;
  line-height: 1.4;
  margin: 0;
  color: var(--color-ink-muted, #4B4333);
  font-style: italic;
}

.dark .information-panel-postit__animal-scientific-name {
  color: var(--color-ink-muted, #e5e7eb);
}

.information-panel-postit__animal-description {
  margin-top: 0;
}

.information-panel-postit__animal-description p {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  color: var(--color-ink, #2C2416);
  text-align: left;
}

.dark .information-panel-postit__animal-description p {
  color: var(--color-ink, #f9fafb);
}

/* Links Section - Subtle inline style */
.information-panel-postit__links {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.information-panel-postit__link {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-ink-muted, #6B7280);
  text-decoration: none;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0.7;
}

.information-panel-postit__link:hover {
  color: var(--color-ink, #2C2416);
  opacity: 1;
  text-decoration: none;
}

.information-panel-postit__link:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
  border-radius: 2px;
  opacity: 1;
}

.dark .information-panel-postit__link {
  color: var(--color-ink-muted, #9ca3af);
}

.dark .information-panel-postit__link:hover {
  color: var(--color-ink, #f9fafb);
}

.information-panel-postit__link-icon {
  width: 0.75rem;
  height: 0.75rem;
  opacity: 0.6;
  flex-shrink: 0;
}

.information-panel-postit__link:hover .information-panel-postit__link-icon {
  opacity: 1;
}

.information-panel-postit__link-separator {
  color: var(--color-ink-subtle, #9ca3af);
  opacity: 0.5;
  font-size: 0.875rem;
  line-height: 1;
  user-select: none;
}

.dark .information-panel-postit__link-separator {
  color: var(--color-ink-subtle, #6b7280);
}

.information-panel-postit__animal-taxonomy {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .information-panel-postit__animal-taxonomy {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.information-panel-postit__animal-taxonomy-label {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0 0 0.25rem 0;
  color: var(--color-ink-muted, #4B4333);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .information-panel-postit__animal-taxonomy-label {
  color: var(--color-ink-muted, #e5e7eb);
}

.information-panel-postit__animal-taxonomy-value {
  font-size: 0.8125rem;
  line-height: 1.5;
  margin: 0;
  color: var(--color-ink, #2C2416);
}

.dark .information-panel-postit__animal-taxonomy-value {
  color: var(--color-ink, #f9fafb);
}

/* Responsive Sizing */
/* Mobile (< 768px) */
@media (max-width: 767px) {
  .information-panel-container {
    bottom: 0.75rem;
    right: 0.75rem;
    width: 320px;
  }

  .information-panel-postit {
    width: 280px;
    padding: 0.75rem;
    padding-top: 1.25rem;
    transform: rotate(1.5deg);
  }

  .information-panel-postit__sticky-tab {
    top: -14px;
    right: 30px;
    width: 100px;
    height: 28px;
  }

  .information-panel-image-card {
    width: 240px;
    transform: rotate(-0.5deg) translateX(-15px);
  }

  .information-panel-image-card--behind:hover {
    transform: rotate(-0.25deg) translateX(-15px) scale(1.02);
  }

  .information-panel-image-card--front:hover {
    transform: rotate(-0.25deg) translateX(-15px) scale(1.02);
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
  }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .information-panel-container {
    width: 420px;
  }

  .information-panel-postit {
    width: 340px;
  }

  .information-panel-postit__sticky-tab {
    top: -15px;
    right: 35px;
    width: 110px;
    height: 30px;
  }

  .information-panel-image-card {
    width: 300px;
    transform: rotate(-1deg) translateX(-15px);
  }

  .information-panel-image-card--behind:hover {
    transform: rotate(-0.5deg) translateX(-15px) scale(1.02);
  }

  .information-panel-image-card--front:hover {
    transform: rotate(-0.5deg) translateX(-15px) scale(1.02);
  }
}

/* Desktop (>= 1024px) */
@media (min-width: 1024px) {
  .information-panel-container {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 440px;
  }

  .information-panel-container--left {
    right: auto;
    left: 1.5rem;
  }

  .information-panel-postit {
    width: 360px;
  }

  .information-panel-postit__sticky-tab {
    top: -16px;
    right: 40px;
    width: 120px;
    height: 32px;
  }

  .information-panel-container--left .information-panel-postit__sticky-tab {
    right: auto;
    left: 40px;
  }

  .information-panel-image-card {
    width: 320px;
    transform: rotate(-1deg) translateX(-20px);
  }

  .information-panel-image-card--behind:hover {
    transform: rotate(-0.5deg) translateX(-20px) scale(1.02);
  }

  .information-panel-image-card--front:hover {
    transform: rotate(-0.5deg) translateX(-20px) scale(1.02);
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

/* Image Card Transitions */
.image-card-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.image-card-enter-from {
  opacity: 0;
  transform: rotate(-3deg) scale(0.8) translateY(20px);
}

.image-card-enter-to {
  opacity: 1;
  transform: rotate(-1deg) scale(1) translateY(0);
}

.image-card-leave-active {
  transition: all 0.2s ease-in;
}

.image-card-leave-from {
  opacity: 1;
  transform: rotate(-1deg) scale(1) translateY(0);
}

.image-card-leave-to {
  opacity: 0;
  transform: rotate(-3deg) scale(0.8) translateY(20px);
}

/* Focus styles for accessibility */
.information-panel-postit:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
}
</style>
