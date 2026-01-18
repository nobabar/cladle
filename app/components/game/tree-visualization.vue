<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { TreeData, TreeLayoutConfig, TreeNode } from "~/types/tree";

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

/**
 * Check if tree data is available
 */
const hasTreeData = computed(() => props.treeData !== null && props.treeData !== undefined);

/**
 * Calculate tree layout positions
 * Implements a top-to-bottom hierarchical layout algorithm
 * @param treeData - The tree data structure to layout
 * @returns Map of node IDs to positioned tree nodes
 */
function calculateLayout(treeData: TreeData): Map<string, TreeNode> {
  const nodeMap = new Map<string, TreeNode>();
  const visited = new Set<string>();

  // First pass: assign depths and build node map
  function assignDepths(node: TreeNode, depth: number = 0): void {
    if (visited.has(node.id)) {
      return;
    }
    visited.add(node.id);
    node.depth = depth;
    nodeMap.set(node.id, { ...node });

    for (const child of node.children) {
      assignDepths(child, depth + 1);
    }
  }

  assignDepths(treeData.root, 0);

  // Second pass: calculate horizontal positions using a simple algorithm
  // Group nodes by depth
  const nodesByDepth = new Map<number, TreeNode[]>();
  for (const node of nodeMap.values()) {
    const depth = node.depth || 0;
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth)!.push(node);
  }

  // Calculate positions for each depth level
  const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

  // Find maximum width needed (for centering)
  let maxNodesAtDepth = 0;
  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodesAtDepth = nodesByDepth.get(depth) || [];
    maxNodesAtDepth = Math.max(maxNodesAtDepth, nodesAtDepth.length);
  }

  // Calculate tree width (for centering)
  const treeWidth = maxNodesAtDepth > 0
    ? (maxNodesAtDepth - 1) * layoutConfig.horizontalSpacing + layoutConfig.nodeWidth
    : layoutConfig.nodeWidth;

  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodesAtDepth = nodesByDepth.get(depth) || [];
    if (nodesAtDepth.length === 0) {
      continue;
    }

    const nodeCount = nodesAtDepth.length;
    const totalWidth = (nodeCount - 1) * layoutConfig.horizontalSpacing;
    const startX = treeWidth / 2 - totalWidth / 2;

    nodesAtDepth.forEach((node, index) => {
      const x = startX + index * layoutConfig.horizontalSpacing;
      const y = layoutConfig.padding + depth * layoutConfig.verticalSpacing;
      const updatedNode = nodeMap.get(node.id);
      if (updatedNode) {
        updatedNode.position = { x, y };
        nodeMap.set(node.id, updatedNode);
      }
    });
  }

  return nodeMap;
}

/**
 * Get all edges (connections) between nodes
 * @param nodeMap - Map of node IDs to tree nodes
 * @returns Array of edges connecting parent to child nodes
 */
function getEdges(nodeMap: Map<string, TreeNode>): Array<{ from: TreeNode; to: TreeNode }> {
  const edges: Array<{ from: TreeNode; to: TreeNode }> = [];

  for (const node of nodeMap.values()) {
    for (const child of node.children) {
      const childNode = nodeMap.get(child.id);
      if (childNode) {
        edges.push({ from: node, to: childNode });
      }
    }
  }

  return edges;
}

/**
 * Computed positioned nodes
 */
const computedNodes = computed(() => {
  if (!hasTreeData.value || !props.treeData) {
    return new Map<string, TreeNode>();
  }
  return calculateLayout(props.treeData);
});

/**
 * Computed edges
 */
const computedEdges = computed(() => getEdges(computedNodes.value));

/**
 * SVG viewBox dimensions
 */
const svgViewBox = computed(() => {
  if (computedNodes.value.size === 0) {
    return `0 0 ${containerWidth.value} ${containerHeight.value}`;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of computedNodes.value.values()) {
    if (node.position) {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y);
    }
  }

  // Add padding
  const padding = layoutConfig.padding;
  minX -= padding;
  maxX += padding + layoutConfig.nodeWidth;
  minY -= padding;
  maxY += padding + layoutConfig.nodeHeight;

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
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
  transition: transform 0.2s ease;
}

.tree-node-group:hover {
  transform: translate(var(--x, 0), var(--y, 0)) scale(1.05);
}

.tree-node {
  fill: white;
  stroke: #9ca3af;
  stroke-width: 2;
  transition: all 0.2s ease;
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

.tree-node:focus {
  outline: 2px solid #00c16a;
  outline-offset: 2px;
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

/* Mobile optimizations */
@media (max-width: 768px) {
  .tree-visualization {
    min-height: 300px;
  }

  .tree-visualization__svg {
    min-height: 300px;
  }

  .tree-node__text {
    font-size: 8px;
  }
}
</style>
