<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { TreeData, TreeLayoutConfig, TreeNode } from "~/types/tree";
import {
  calculateTreeLayout,
  getViewBoxFromDimensions,

} from "~/utils/treeLayoutCalculator";
import type { LayoutResult } from "~/utils/treeLayoutCalculator";
import { treeToMermaid } from "~/utils/mermaidExporter";

/**
 * Props
 */
interface Props {
  /** Tree data structure to visualize */
  treeData?: TreeData | null;
  /** Whether to show the target animal (default: false for game) */
  showTarget?: boolean;
  /** Width of the visualization container */
  width?: number;
  /** Height of the visualization container */
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  treeData: null,
  showTarget: false,
  width: 800,
  height: 600,
});

/**
 * Layout Configuration
 */
const layoutConfig: TreeLayoutConfig = {
  horizontalSpacing: 150,
  verticalSpacing: 120,
  nodeWidth: 100,
  nodeHeight: 60,
  padding: 40,
};

/**
 * Component State
 */
const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const containerWidth = ref(props.width);
const containerHeight = ref(props.height);
const focusedNodeId = ref<string | null>(null);
const previousNodeIds = ref<Set<string>>(new Set());
const newNodeIds = ref<Set<string>>(new Set());
const layoutResult = ref<LayoutResult | null>(null);
const isCopied = ref(false);

/**
 * Check if tree data is available
 */
const hasTreeData = computed(() => props.treeData !== null && props.treeData !== undefined);

/**
 * Computed layout result using the layout calculator
 * @returns Layout result or null if no tree data
 */
const computedLayout = computed(() => {
  if (!hasTreeData.value || !props.treeData) {
    return null;
  }

  return calculateTreeLayout(
    props.treeData,
    containerWidth.value,
    layoutConfig,
  );
});

/**
 * Watch for layout changes to track new nodes for animation
 */
watch(
  computedLayout,
  (newLayout) => {
    if (!newLayout) {
      newNodeIds.value = new Set();
      previousNodeIds.value = new Set();
      layoutResult.value = null;
      return;
    }

    // Track new nodes for animation
    const currentNodeIds = new Set(newLayout.nodes.keys());
    const newNodes = new Set<string>();

    for (const id of currentNodeIds) {
      if (!previousNodeIds.value.has(id)) {
        newNodes.add(id);
      }
    }

    // Update tracking sets
    newNodeIds.value = newNodes;
    previousNodeIds.value = currentNodeIds;
    layoutResult.value = newLayout;
  },
  { immediate: true },
);

/**
 * Computed positioned nodes
 */
const computedNodes = computed(() => computedLayout.value?.nodes || new Map<string, TreeNode>());

/**
 * Computed edges
 */
const computedEdges = computed(() => computedLayout.value?.edges || []);

/**
 * Check if a node is new (for animation)
 * @param nodeId - The node ID to check
 * @returns True if the node is new (should be animated)
 */
function isNewNode(nodeId: string): boolean {
  return newNodeIds.value.has(nodeId);
}

/**
 * SVG viewBox dimensions from layout result
 */
const svgViewBox = computed(() => {
  if (!computedLayout.value) {
    return `0 0 ${containerWidth.value} ${containerHeight.value}`;
  }

  return getViewBoxFromDimensions(computedLayout.value.dimensions);
});

/**
 * Get node CSS class
 * @param node - The tree node
 * @returns CSS class string for the node
 */
function getNodeClass(node: TreeNode): string {
  const classes = ["tree-node"];
  if (node.type === "animal") {
    classes.push("tree-node--animal");
    if (node.isTarget) {
      classes.push("tree-node--target");
    }
    if (node.isGuess) {
      classes.push("tree-node--guess");
    }
  } else {
    classes.push("tree-node--clade");
    if (node.isLCA) {
      classes.push("tree-node--lca");
    }
  }
  if (focusedNodeId.value === node.id) {
    classes.push("tree-node--focused");
  }
  return classes.join(" ");
}

/**
 * Get node ARIA label
 * @param node - The tree node
 * @returns ARIA label string for accessibility
 */
function getNodeAriaLabel(node: TreeNode): string {
  const parts: string[] = [];
  if (node.type === "animal") {
    parts.push("Animal");
    if (node.isTarget) {
      parts.push("target");
    }
    if (node.isGuess) {
      parts.push("guessed");
    }
    parts.push(node.name);
    if (node.data?.scientificName) {
      parts.push(`scientific name: ${node.data.scientificName}`);
    }
  } else {
    parts.push("Clade");
    if (node.isLCA) {
      parts.push("Last Common Ancestor");
    }
    parts.push(node.name);
    if (node.cladeData?.rank) {
      parts.push(`rank: ${node.cladeData.rank}`);
    }
  }
  return parts.join(", ");
}

/**
 * Handle node click
 * @param node
 */
function handleNodeClick(node: TreeNode): void {
  focusedNodeId.value = node.id;
  // Emit event for future interactivity (Story 4.1)
}

/**
 * Handle keyboard navigation
 * @param event
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!hasTreeData.value || !props.treeData) {
    return;
  }

  const nodes = Array.from(computedNodes.value.values());
  const currentIndex = focusedNodeId.value
    ? nodes.findIndex(n => n.id === focusedNodeId.value)
    : -1;

  switch (event.key) {
    case "ArrowDown": {
      event.preventDefault();
      // Find next node at same or deeper level
      const current = nodes[currentIndex];
      if (current) {
        const next = nodes
          .slice(currentIndex + 1)
          .find(n => (n.depth || 0) >= (current.depth || 0));
        if (next) {
          focusedNodeId.value = next.id;
        }
      } else if (nodes.length > 0) {
        focusedNodeId.value = nodes[0]!.id;
      }
      break;
    }
    case "ArrowUp": {
      event.preventDefault();
      // Find previous node at same or shallower level
      const current = nodes[currentIndex];
      if (current) {
        const prev = nodes
          .slice(0, currentIndex)
          .reverse()
          .find(n => (n.depth || 0) <= (current.depth || 0));
        if (prev) {
          focusedNodeId.value = prev.id;
        }
      }
      break;
    }
    case "Enter":
    case " ": {
      event.preventDefault();
      if (focusedNodeId.value) {
        const node = computedNodes.value.get(focusedNodeId.value);
        if (node) {
          handleNodeClick(node);
        }
      }
      break;
    }
    case "Escape": {
      event.preventDefault();
      focusedNodeId.value = null;
      break;
    }
  }
}

/**
 * Debounce function for performance optimization
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Update container dimensions on mount and resize
 */
function updateDimensions(): void {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth || props.width;
    containerHeight.value = containerRef.value.clientHeight || props.height;
  }
}

// Debounced resize handler for performance
const debouncedUpdateDimensions = debounce(updateDimensions, 150);

onMounted(() => {
  updateDimensions();
  window.addEventListener("resize", debouncedUpdateDimensions);
});

onUnmounted(() => {
  window.removeEventListener("resize", debouncedUpdateDimensions);
});

watch(
  () => props.width,
  () => {
    updateDimensions();
  },
);

watch(
  () => props.height,
  () => {
    updateDimensions();
  },
);

/**
 * Copy tree as Mermaid format to clipboard
 */
async function copyTreeAsMermaid(): Promise<void> {
  if (!hasTreeData.value || !props.treeData) {
    return;
  }

  try {
    const mermaidText = treeToMermaid(props.treeData);
    await navigator.clipboard.writeText(mermaidText);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
  }
}
</script>

<template>
  <div
    ref="containerRef"
    class="tree-visualization"
    :class="{ 'tree-visualization--empty': !hasTreeData }"
    role="tree"
    aria-label="Phylogenetic tree showing evolutionary relationships"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <!-- Copy Button -->
    <button
      v-if="hasTreeData"
      type="button"
      class="tree-visualization__copy-button"
      :aria-label="isCopied ? 'Copied to clipboard' : 'Copy tree as Mermaid diagram'"
      :title="isCopied ? 'Copied to clipboard' : 'Copy tree as Mermaid diagram'"
      @click="copyTreeAsMermaid"
    >
      <Icon
        :name="isCopied ? 'i-lucide-check' : 'i-lucide-copy'"
        class="tree-visualization__copy-icon"
      />
    </button>

    <!-- Empty State -->
    <div v-if="!hasTreeData" class="tree-visualization__empty">
      <p class="tree-visualization__empty-text">
        No tree data available. Make a guess to see the phylogenetic tree.
      </p>
    </div>

    <!-- SVG Tree Visualization -->
    <svg
      v-else
      ref="svgRef"
      :viewBox="svgViewBox"
      class="tree-visualization__svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Phylogenetic tree visualization"
    >
      <!-- Edges (connections between nodes) -->
      <g class="tree-edges">
        <line
          v-for="(edge, index) in computedEdges"
          :key="`edge-${edge.from.id}-${edge.to.id}-${index}`"
          :x1="edge.from.position?.x || 0"
          :y1="edge.from.position?.y || 0"
          :x2="edge.to.position?.x || 0"
          :y2="edge.to.position?.y || 0"
          class="tree-edge"
          stroke="currentColor"
          stroke-width="2"
        />
      </g>

      <!-- Nodes -->
      <g class="tree-nodes">
        <g
          v-for="node in computedNodes.values()"
          :key="node.id"
          :transform="`translate(${node.position?.x || 0}, ${node.position?.y || 0})`"
          class="tree-node-group"
          :class="[
            { 'tree-node-group--new': isNewNode(node.id) },
          ]"
        >
          <!-- Node rectangle -->
          <rect
            :class="getNodeClass(node)"
            :width="layoutConfig.nodeWidth"
            :height="layoutConfig.nodeHeight"
            :x="-(layoutConfig.nodeWidth / 2)"
            :y="-(layoutConfig.nodeHeight / 2)"
            rx="4"
            :aria-label="getNodeAriaLabel(node)"
            :aria-selected="focusedNodeId === node.id"
            role="treeitem"
            tabindex="0"
            class="tree-node-rect"
            @click="handleNodeClick(node)"
            @focus="focusedNodeId = node.id"
            @blur="focusedNodeId = null"
          />

          <!-- Node text -->
          <text
            class="tree-node__text"
            :class="{
              'tree-node__text--target': node.isTarget,
              'tree-node__text--guess': node.isGuess,
              'tree-node__text--lca': node.isLCA,
            }"
            text-anchor="middle"
            dominant-baseline="middle"
            :aria-hidden="true"
          >
            {{ node.name }}
          </text>
        </g>
      </g>
    </svg>

    <!-- Screen reader description -->
    <div
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
    >
      <template v-if="hasTreeData && treeData">
        Phylogenetic tree with {{ treeData.nodes.length }} nodes.
        <template v-if="treeData.guesses.length > 0">
          {{ treeData.guesses.length }} guessed
          {{ treeData.guesses.length === 1 ? "animal" : "animals" }}.
        </template>
        <template v-if="focusedNodeId">
          Currently focused on node: {{ computedNodes.get(focusedNodeId)?.name }}.
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tree-visualization {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: auto;
  outline: none;
  /* Smooth scrolling for horizontal navigation */
  scroll-behavior: smooth;
  /* Enable momentum scrolling on iOS */
  -webkit-overflow-scrolling: touch;
}

.dark .tree-visualization {
  background: #1f2937;
  border-color: #374151;
}

.tree-visualization:focus {
  outline: 2px solid #00c16a;
  outline-offset: 2px;
}

.tree-visualization--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tree-visualization__empty {
  padding: 2rem;
  text-align: center;
}

.tree-visualization__empty-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.dark .tree-visualization__empty-text {
  color: #9ca3af;
}

.tree-visualization__svg {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.tree-edges {
  stroke: #d1d5db;
  stroke-width: 2;
}

.dark .tree-edges {
  stroke: #4b5563;
}

.tree-node-group {
  cursor: pointer;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tree-node-group:hover {
  transform: scale(1.05);
}

/* Animation for new nodes (top-to-bottom) */
.tree-node-group--new {
  animation: nodeAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

@keyframes nodeAppear {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.tree-node {
  fill: white;
  stroke: #9ca3af;
  stroke-width: 2;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .tree-node {
  fill: #374151;
  stroke: #6b7280;
}

.tree-node--animal {
  fill: #effdf5;
  stroke: #00dc82;
}

.dark .tree-node--animal {
  fill: #064e3b;
  stroke: #00dc82;
}

.tree-node--animal.tree-node--target {
  fill: #fef2f2;
  stroke: #ef4444;
  stroke-width: 3;
}

.dark .tree-node--animal.tree-node--target {
  fill: #7f1d1d;
  stroke: #ef4444;
}

.tree-node--animal.tree-node--guess {
  fill: #eff6ff;
  stroke: #60a5fa;
}

.dark .tree-node--animal.tree-node--guess {
  fill: #1e3a8a;
  stroke: #60a5fa;
}

.tree-node--clade {
  fill: #f3f4f6;
  stroke: #6b7280;
}

.dark .tree-node--clade {
  fill: #4b5563;
  stroke: #9ca3af;
}

.tree-node--clade.tree-node--lca {
  fill: #fffbeb;
  stroke: #eab308;
  stroke-width: 3;
}

.dark .tree-node--clade.tree-node--lca {
  fill: #78350f;
  stroke: #eab308;
}

.tree-node--focused {
  stroke-width: 4;
  filter: drop-shadow(0 0 4px #00c16a);
}

.tree-node:focus,
.tree-node-rect:focus {
  outline: 2px solid #00c16a;
  outline-offset: 2px;
}

/* Ensure touch targets on mobile for tree nodes */
@media (max-width: 767px) {
  .tree-node-rect {
    /* Increase touch target area on mobile */
    min-width: 44px;
    min-height: 44px;
  }
}

.tree-node__text {
  font-size: 10px;
  font-weight: 500;
  fill: #111827;
  pointer-events: none;
  user-select: none;
}

.dark .tree-node__text {
  fill: #f9fafb;
}

.tree-node__text--target {
  fill: #b91c1c;
  font-weight: 700;
}

.dark .tree-node__text--target {
  fill: #fca5a5;
}

.tree-node__text--guess {
  fill: #1e40af;
  font-weight: 600;
}

.dark .tree-node__text--guess {
  fill: #93c5fd;
}

.tree-node__text--lca {
  fill: #a16207;
  font-weight: 600;
}

.dark .tree-node__text--lca {
  fill: #fde047;
}

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

.tree-visualization__copy-button {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  touch-action: manipulation; /* Prevent double-tap zoom */
}

.dark .tree-visualization__copy-button {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.tree-visualization__copy-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
}

.dark .tree-visualization__copy-button:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.tree-visualization__copy-button:active {
  transform: scale(0.95);
}

.tree-visualization__copy-button:focus {
  outline: 2px solid #00c16a;
  outline-offset: 2px;
}

.tree-visualization__copy-icon {
  width: 18px;
  height: 18px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tree-visualization__copy-button:hover .tree-visualization__copy-icon {
  transform: scale(1.1);
}

/* Mobile optimizations (< 768px) */
@media (max-width: 767px) {
  .tree-visualization {
    min-height: 300px;
    border-radius: 6px;
  }

  .tree-visualization__svg {
    min-height: 300px;
  }

  .tree-node__text {
    font-size: 8px;
  }

  .tree-node {
    /* Ensure nodes are touch-friendly on mobile */
    cursor: pointer;
  }

  .tree-visualization__copy-button {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    top: 8px;
    right: 8px;
  }

  .tree-visualization__copy-icon {
    width: 20px;
    height: 20px;
  }

  /* Improve touch interaction on mobile */
  .tree-node-group {
    touch-action: manipulation;
  }
}

/* Tablet optimizations (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .tree-visualization {
    min-height: 400px;
  }

  .tree-visualization__svg {
    min-height: 400px;
  }

  .tree-node__text {
    font-size: 9px;
  }

  .tree-visualization__copy-button {
    top: 10px;
    right: 10px;
  }
}

/* Desktop optimizations (>= 1024px) */
@media (min-width: 1024px) {
  .tree-visualization {
    min-height: 500px;
  }

  .tree-visualization__svg {
    min-height: 500px;
  }

  .tree-node__text {
    font-size: 10px;
  }

  .tree-visualization__copy-button {
    top: 12px;
    right: 12px;
  }
}
</style>
