<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { TreeData, TreeLayoutConfig, TreeNode } from "~/types/tree";
import {
  calculateTreeLayout,
  getViewBoxFromDimensions,
} from "~/utils/treeLayoutCalculator";
import { treeToMermaid } from "~/utils/mermaidExporter";
import { uiIcon } from "~/utils/uiIcons";
import { DEFAULT_ROUGHNESS, resolveColor, useRoughSvg } from "~/composables/useRoughSvg";

const props = withDefaults(defineProps<Props>(), {
  treeData: null,
  showTarget: false,
  width: 800,
  height: 600,
});

const emit = defineEmits<{
  nodeClick: [node: TreeNode];
}>();

const { t } = useI18n();

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

const layoutConfig: TreeLayoutConfig = {
  horizontalSpacing: 150,
  verticalSpacing: 120,
  nodeWidth: 100,
  nodeHeight: 60,
  padding: 40,
};

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const containerWidth = ref(props.width || 800);
const containerHeight = ref(props.height || 600);
const focusedNodeId = ref<string | null>(null);
const previousNodeIds = ref<Set<string>>(new Set());
const newNodeIds = ref<Set<string>>(new Set());
const isCopied = ref(false);

const edgesGroupRef = ref<SVGGElement | null>(null);
const nodesGroupRef = ref<SVGGElement | null>(null);
const { getRoughGenerator } = useRoughSvg(svgRef);
const lastRenderedLayoutHash = ref<string | null>(null);
const isRendering = ref(false);

const isDevMode = computed(() => import.meta.dev);

const hasTreeData = computed(() => props.treeData !== null && props.treeData !== undefined);

const computedLayout = computed(() => {
  if (!hasTreeData.value || !props.treeData || containerWidth.value === 0) {
    return null;
  }

  return calculateTreeLayout(props.treeData, containerWidth.value, layoutConfig);
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
      return;
    }

    // Track new nodes for animation
    const currentNodeIds = new Set(newLayout.nodes.keys());
    const newNodes = new Set<string>();

    for (const id of Array.from(currentNodeIds)) {
      if (!previousNodeIds.value.has(id)) {
        newNodes.add(id);
      }
    }

    newNodeIds.value = newNodes;
    previousNodeIds.value = currentNodeIds;
  },
  { immediate: true },
);

const computedNodes = computed(() => computedLayout.value?.nodes || new Map<string, TreeNode>());

const computedEdges = computed(() => computedLayout.value?.edges || []);

/**
 * Calculate text width for a given text string
 * Uses canvas measurement for accurate width calculation
 *
 * @param text - Text to measure
 * @param fontSize - Font size in pixels (default: 14)
 * @param fontFamily - Font family (default: system font)
 * @returns Calculated text width in pixels
 */
function calculateTextWidth(
  text: string,
  fontSize: number = 14,
  fontFamily: string = "system-ui, -apple-system, sans-serif",
): number {
  if (typeof window === "undefined") {
    // Fallback for SSR
    const avgCharWidth = fontSize * 0.6;
    const textWidth = text.length * avgCharWidth;
    const minWidth = 60;
    const padding = 20;
    return Math.max(minWidth, textWidth + padding * 2);
  }

  // Use canvas for accurate text measurement
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    const avgCharWidth = fontSize * 0.6;
    const textWidth = text.length * avgCharWidth;
    const minWidth = 60;
    const padding = 20;
    return Math.max(minWidth, textWidth + padding * 2);
  }

  context.font = `${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;

  // Add padding for node (20px on each side)
  const minWidth = 60; // Minimum node width
  const padding = 20;
  return Math.max(minWidth, textWidth + padding * 2);
}

/**
 * Calculate curved SVG path for an edge
 * Uses quadratic bezier curve for smooth connections
 *
 * @param from - Source node position
 * @param from.x
 * @param from.y
 * @param to - Target node position
 * @param to.x
 * @param to.y
 * @param fromHeight - Height of source node
 * @param toHeight - Height of target node
 * @returns SVG path string
 */
function calculateEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromHeight: number = layoutConfig.nodeHeight,
  toHeight: number = layoutConfig.nodeHeight,
): string {
  // Calculate control point for quadratic bezier curve
  // Control point is positioned to create a smooth curve
  // Place it at the midpoint horizontally, but offset vertically for curve
  const midY = (from.y + to.y) / 2;
  const controlX = from.x;
  const controlY = midY;

  // Start from bottom center of source node
  const startX = from.x;
  const startY = from.y + fromHeight / 2;

  // End at top center of target node
  const endX = to.x;
  const endY = to.y - toHeight / 2;

  // Quadratic bezier curve: M (move to start), Q (quadratic curve to end via control point)
  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
}

const svgViewBox = computed(() => {
  if (!computedLayout.value) {
    return `0 0 ${containerWidth.value} ${containerHeight.value}`;
  }

  return getViewBoxFromDimensions(computedLayout.value.dimensions);
});

/**
 * Get node width based on text content
 * For target nodes when hidden, use fixed width to prevent giving clues
 * @param node - The tree node
 * @returns Calculated node width
 */
function getNodeWidth(node: TreeNode): number {
  // If this is a target node and it's hidden, use fixed width for "?"
  // This prevents players from guessing the animal based on node width
  if (node.isTarget && !props.showTarget) {
    return calculateTextWidth("?", 14);
  }
  // Otherwise, use the actual name width
  return calculateTextWidth(node.name, 14);
}

function getNodeHeight(_node: TreeNode): number {
  return layoutConfig.nodeHeight;
}

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

function getNodeColors(node: TreeNode): { fill: string; stroke: string; strokeWidth: number } {
  if (node.type === "animal") {
    if (node.isTarget) {
      return {
        fill: "var(--color-error-soft)",
        stroke: "var(--color-error)",
        strokeWidth: 3,
      };
    }
    if (node.isGuess) {
      return {
        fill: "var(--color-secondary-soft)",
        stroke: "var(--color-secondary)",
        strokeWidth: 2,
      };
    }
    return {
      fill: "var(--color-primary-soft)",
      stroke: "var(--color-primary-strong)",
      strokeWidth: 2,
    };
  } else {
    if (node.isLCA) {
      return {
        fill: "var(--color-warning-soft)",
        stroke: "var(--color-warning)",
        strokeWidth: 3,
      };
    }
    return {
      fill: "var(--color-surface-alt)",
      stroke: "var(--color-muted)",
      strokeWidth: 2,
    };
  }
}

function getEdgeColor(): string {
  return "var(--color-border-subtle)";
}

const colorMode = useColorMode();

/**
 * Fingerprint of layout, focus, and theme so Rough.js redraws only when the visible graph meaningfully changes.
 * @returns Stable string for equality checks; empty when there is no layout.
 */
function getLayoutHash(): string {
  if (!computedLayout.value) {
    return "";
  }

  const nodeData = Array.from(computedNodes.value.entries())
    .map(([id, node]) => {
      const pos = node.position ? `${node.position.x},${node.position.y}` : "";
      const states = `${node.isTarget ? "T" : ""}${node.isGuess ? "G" : ""}${node.isLCA ? "L" : ""}`;
      return `${id}:${node.name}:${pos}:${states}`;
    })
    .sort()
    .join("|");
  const edgeCount = computedEdges.value.length;
  const focusedId = focusedNodeId.value || "";
  const currentColorMode = colorMode.value || "light";

  return `${nodeData}|${edgeCount}|${focusedId}|${currentColorMode}`;
}

function renderTreeWithRough(): void {
  if (typeof window === "undefined" || !svgRef.value || !computedLayout.value) {
    return;
  }

  // Nested calls (e.g. layout + theme watchers) must not run a second draw before the first finishes.
  if (isRendering.value) {
    return;
  }

  const currentHash = getLayoutHash();
  // Skip when watchers fire multiple times for the same frame-worthy state (Rough is expensive).
  if (currentHash === lastRenderedLayoutHash.value) {
    return;
  }

  isRendering.value = true;

  try {
    const generator = getRoughGenerator();
    if (!generator) {
      return;
    }

    // Clear existing rough elements completely
    if (edgesGroupRef.value) {
      while (edgesGroupRef.value.firstChild) {
        edgesGroupRef.value.removeChild(edgesGroupRef.value.firstChild);
      }
    }
    if (nodesGroupRef.value) {
      while (nodesGroupRef.value.firstChild) {
        nodesGroupRef.value.removeChild(nodesGroupRef.value.firstChild);
      }
    }

    // Render edges
    if (edgesGroupRef.value) {
      const edgeColor = getEdgeColor();
      for (const edge of computedEdges.value) {
        if (edge.from.position && edge.to.position) {
          const pathData = calculateEdgePath(
            edge.from.position,
            edge.to.position,
            getNodeHeight(edge.from),
            getNodeHeight(edge.to),
          );
          const roughPath = generator.path(pathData, {
            stroke: resolveColor(edgeColor) || "currentColor",
            strokeWidth: 2,
            fill: "none",
            roughness: DEFAULT_ROUGHNESS,
          });
          if (roughPath) {
            roughPath.setAttribute("class", "tree-edge-rough");
            edgesGroupRef.value.appendChild(roughPath);
          }
        }
      }
    }

    // Render nodes
    if (nodesGroupRef.value) {
      for (const node of Array.from(computedNodes.value.values())) {
        if (!node.position) {
          continue;
        }

        const nodeWidth = getNodeWidth(node);
        const nodeHeight = getNodeHeight(node);
        const colors = getNodeColors(node);

        // Calculate top-left position (Rough.js rectangle uses top-left, not center)
        const rectX = node.position.x - nodeWidth / 2;
        const rectY = node.position.y - nodeHeight / 2;

        const fillColor = resolveColor(colors.fill);
        const strokeColor = resolveColor(colors.stroke);

        const roughRect = generator.rectangle(rectX, rectY, nodeWidth, nodeHeight, {
          fill: fillColor || "transparent",
          stroke: strokeColor || "currentColor",
          strokeWidth: colors.strokeWidth,
          roughness: DEFAULT_ROUGHNESS,
          fillStyle: "solid",
          fillWeight: 0.3,
        });

        if (roughRect) {
          // Create a group for this node to maintain accessibility
          const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          nodeGroup.setAttribute("class", `tree-node-group-rough ${getNodeClass(node)}`);
          nodeGroup.setAttribute("data-node-id", node.id);
          nodeGroup.setAttribute("aria-label", getNodeAriaLabel(node));
          nodeGroup.setAttribute("aria-selected", focusedNodeId.value === node.id ? "true" : "false");
          nodeGroup.setAttribute("role", "button");
          // Set tabindex: focused node gets "0", first node gets "0" if none focused, others get "-1"
          // In production, target nodes should not be focusable
          const isFirstNode = Array.from(computedNodes.value.values()).indexOf(node) === 0;
          const shouldBeFocusable = (focusedNodeId.value === node.id
            || (!focusedNodeId.value && isFirstNode))
          && (isDevMode.value || !node.isTarget);
          nodeGroup.setAttribute("tabindex", shouldBeFocusable ? "0" : "-1");

          // Add an invisible hit area rectangle so the group is clickable
          const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          hitArea.setAttribute("x", String(node.position.x - nodeWidth / 2));
          hitArea.setAttribute("y", String(node.position.y - nodeHeight / 2));
          hitArea.setAttribute("width", String(nodeWidth));
          hitArea.setAttribute("height", String(nodeHeight));
          hitArea.setAttribute("fill", "transparent");
          hitArea.setAttribute("cursor", "pointer");
          hitArea.setAttribute("aria-hidden", "true");
          nodeGroup.appendChild(hitArea);

          // Add visual indicator for node state (non-color cue)
          // Add a shape indicator for different node types
          if (node.type === "animal") {
            // Add a small circle indicator for animals
            const indicator = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            indicator.setAttribute("cx", String(node.position.x - nodeWidth / 2 + 8));
            indicator.setAttribute("cy", String(node.position.y - nodeHeight / 2 + 8));
            indicator.setAttribute("r", "3");
            indicator.setAttribute("fill", "currentColor");
            indicator.setAttribute("aria-hidden", "true");
            if (node.isTarget) {
              indicator.setAttribute("class", "tree-node-indicator tree-node-indicator--target");
            } else if (node.isGuess) {
              indicator.setAttribute("class", "tree-node-indicator tree-node-indicator--guess");
            } else {
              indicator.setAttribute("class", "tree-node-indicator tree-node-indicator--animal");
            }
            nodeGroup.appendChild(indicator);
          } else {
            // Add a small square indicator for clades
            const indicator = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            indicator.setAttribute("x", String(node.position.x - nodeWidth / 2 + 5));
            indicator.setAttribute("y", String(node.position.y - nodeHeight / 2 + 5));
            indicator.setAttribute("width", "6");
            indicator.setAttribute("height", "6");
            indicator.setAttribute("fill", "currentColor");
            indicator.setAttribute("aria-hidden", "true");
            if (node.isLCA) {
              indicator.setAttribute("class", "tree-node-indicator tree-node-indicator--lca");
            } else {
              indicator.setAttribute("class", "tree-node-indicator tree-node-indicator--clade");
            }
            nodeGroup.appendChild(indicator);
          }

          // Add click handlers
          // Handle click event - this should fire on first click
          // In production, disable pointer events for target nodes to prevent clicking
          if (!isDevMode.value && node.isTarget) {
            nodeGroup.setAttribute("style", "pointer-events: none;");
            hitArea.setAttribute("cursor", "default");
          }
          nodeGroup.addEventListener("click", (e) => {
            e.stopPropagation();
            handleNodeClick(node);
          });
          nodeGroup.addEventListener("focus", () => {
            focusedNodeId.value = node.id;
            // Update tabindex for all nodes when one is focused
            nextTick(() => {
              updateNodeTabIndices();
            });
          });

          // Add keyboard navigation support
          nodeGroup.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleNodeClick(node);
            } else if (e.key === "Escape") {
              e.preventDefault();
              // Remove focus from node
              if (nodeGroup instanceof SVGElement) {
                nodeGroup.blur();
              }
              focusedNodeId.value = null;
            }
          });

          // Make the rough rect non-interactive (pointer events handled by group)
          roughRect.setAttribute("pointer-events", "none");
          nodeGroup.appendChild(roughRect);

          nodesGroupRef.value.appendChild(nodeGroup);
        }
      }
    }

    // Update hash after successful render
    lastRenderedLayoutHash.value = currentHash;
  } finally {
    isRendering.value = false;
  }
}

// Watch for layout changes and redraw tree
// Only triggers when layout actually changes (not on every reactive update)
watch(
  computedLayout,
  () => {
    // Use nextTick to batch updates and avoid redundant renders
    nextTick(() => {
      renderTreeWithRough();
    });
  },
  { deep: false }, // Shallow watch is sufficient - we check hash for actual changes
);

// Watch for focus changes to update tab indices without full re-render
// This prevents re-renders from interfering with click events
watch(
  focusedNodeId,
  () => {
    // Update tab indices when focus changes, but don't trigger full re-render
    nextTick(() => {
      updateNodeTabIndices();
      if (nodesGroupRef.value) {
        const nodeGroups = nodesGroupRef.value.querySelectorAll("[data-node-id]");
        nodeGroups.forEach((group) => {
          const nodeId = group.getAttribute("data-node-id");
          group.setAttribute("aria-selected", focusedNodeId.value === nodeId ? "true" : "false");
        });
      }
    });
  },
);

// Theme change: clear layout hash so Rough.js strokes/fills pick up new CSS variables.
watch(
  () => colorMode.value,
  () => {
    // Force re-render when color mode changes by clearing the hash
    lastRenderedLayoutHash.value = null;
    nextTick(() => {
      renderTreeWithRough();
    });
  },
);

/**
 * Update tabindex for all tree nodes based on focused node
 * Only the focused node should have tabindex="0", others should have "-1"
 * This enables arrow key navigation while preventing tab from cycling through all nodes
 * In production, target nodes should never be focusable
 */
function updateNodeTabIndices(): void {
  if (!nodesGroupRef.value) {
    return;
  }

  const nodeGroups = nodesGroupRef.value.querySelectorAll("[data-node-id]");
  nodeGroups.forEach((group) => {
    const nodeId = group.getAttribute("data-node-id");
    const isTargetNode = group.classList.contains("tree-node--target");
    // In production, target nodes should not be focusable
    if (!isDevMode.value && isTargetNode) {
      group.setAttribute("tabindex", "-1");
    } else if (nodeId === focusedNodeId.value) {
      group.setAttribute("tabindex", "0");
    } else {
      group.setAttribute("tabindex", "-1");
    }
  });
}

function getNodeAriaLabel(node: TreeNode): string {
  const parts: string[] = [];
  if (node.type === "animal") {
    parts.push(t("game.ariaNodeAnimal"));
    if (node.isTarget) {
      parts.push(t("game.ariaTarget"));
      // In production, don't reveal the target animal name in aria-label
      if (isDevMode.value) {
        parts.push(node.name);
      } else {
        parts.push(t("game.ariaUnknownTarget"));
      }
    } else {
      parts.push(node.name);
    }
    if (node.isGuess) {
      parts.push(t("game.ariaGuessed"));
    }
    // Only include scientific name if not target in production
    if (node.data?.scientificName && (isDevMode.value || !node.isTarget)) {
      parts.push(t("game.ariaScientificName", { name: node.data.scientificName }));
    }
  } else {
    parts.push(t("game.ariaNodeClade"));
    if (node.isLCA) {
      parts.push(t("game.lcaLabel"));
    }
    parts.push(node.name);
    if (node.cladeData?.rank) {
      parts.push(t("game.ariaRank", { rank: node.cladeData.rank }));
    }
  }
  return parts.join(", ");
}

function handleNodeClick(node: TreeNode): void {
  // In production, prevent clicking on target nodes to avoid revealing the answer
  if (!isDevMode.value && node.isTarget) {
    return;
  }
  focusedNodeId.value = node.id;
  updateNodeTabIndices();
  // Emit node click event for parent component to handle information display
  emit("nodeClick", node);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!hasTreeData.value || !props.treeData) {
    return;
  }

  // In production, filter out target nodes from navigation
  const allNodes = Array.from(computedNodes.value.values());
  const nodes = isDevMode.value
    ? allNodes
    : allNodes.filter(n => !n.isTarget);
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
          focusNodeElement(next.id);
        }
      } else if (nodes.length > 0) {
        focusedNodeId.value = nodes[0]!.id;
        focusNodeElement(nodes[0]!.id);
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
          focusNodeElement(prev.id);
        }
      }
      break;
    }
    case "ArrowRight": {
      event.preventDefault();
      // Move to first child node if available
      const current = nodes[currentIndex];
      if (current) {
        const child = nodes.find(n =>
          // Find a node that is a child of current (deeper depth, connected in tree)
          (n.depth || 0) > (current.depth || 0) && nodes.indexOf(n) > currentIndex,
        );
        if (child) {
          focusedNodeId.value = child.id;
          focusNodeElement(child.id);
        }
      }
      break;
    }
    case "ArrowLeft": {
      event.preventDefault();
      // Move to parent node if available
      const current = nodes[currentIndex];
      if (current && current.depth && current.depth > 0) {
        const parent = nodes
          .slice(0, currentIndex)
          .reverse()
          .find(n => (n.depth || 0) < (current.depth || 0));
        if (parent) {
          focusedNodeId.value = parent.id;
          focusNodeElement(parent.id);
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
      updateNodeTabIndices();
      // Return focus to container
      if (containerRef.value) {
        containerRef.value.focus();
      }
      break;
    }
    case "Home": {
      event.preventDefault();
      // Move to first node
      if (nodes.length > 0) {
        focusedNodeId.value = nodes[0]!.id;
        focusNodeElement(nodes[0]!.id);
      }
      break;
    }
    case "End": {
      event.preventDefault();
      // Move to last node
      if (nodes.length > 0) {
        focusedNodeId.value = nodes[nodes.length - 1]!.id;
        focusNodeElement(nodes[nodes.length - 1]!.id);
      }
      break;
    }
  }
}

function focusNodeElement(nodeId: string): void {
  nextTick(() => {
    if (nodesGroupRef.value) {
      const nodeGroup = nodesGroupRef.value.querySelector(`[data-node-id="${nodeId}"]`) as SVGElement;
      if (nodeGroup && typeof nodeGroup.focus === "function") {
        nodeGroup.focus();
      }
    }
    updateNodeTabIndices();
  });
}

// ResizeObserver to watch for container size changes
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          containerWidth.value = width;
          containerHeight.value = height;
        }
      }
    });
    resizeObserver.observe(containerRef.value);
  }

  // Initial render after mount
  nextTick(() => {
    renderTreeWithRough();
  });
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

async function copyTreeAsMermaid(): Promise<void> {
  if (!hasTreeData.value || !props.treeData) {
    return;
  }

  try {
    const mermaidText = treeToMermaid(props.treeData, isDevMode.value);
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
    :aria-label="t('game.treeAriaRoot')"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <!-- Copy Button (only in dev mode) -->
    <button
      v-if="hasTreeData && isDevMode"
      type="button"
      class="tree-visualization__copy-button"
      :aria-label="isCopied ? t('game.treeCopied') : t('game.treeCopyMermaid')"
      :title="isCopied ? t('game.treeCopied') : t('game.treeCopyMermaid')"
      @click="copyTreeAsMermaid"
    >
      <Icon
        :name="isCopied ? uiIcon.check : uiIcon.copy"
        class="tree-visualization__copy-icon"
      />
    </button>

    <!-- Empty State -->
    <div v-if="!hasTreeData" class="tree-visualization__empty">
      <p class="tree-visualization__empty-text">
        {{ t("game.treeEmptyState") }}
      </p>
    </div>

    <!-- SVG Tree Visualization -->
    <svg
      v-else
      ref="svgRef"
      :width="containerWidth"
      :height="containerHeight"
      :viewBox="svgViewBox"
      class="tree-visualization__svg"
      xmlns="http://www.w3.org/2000/svg"
      :aria-label="t('game.treeAriaSvg')"
    >
      <g ref="edgesGroupRef" class="tree-edges-rough" />

      <g ref="nodesGroupRef" class="tree-nodes-rough" />

      <g v-if="computedLayout" class="tree-node-labels">
        <template
          v-for="node in computedNodes.values()"
          :key="`label-${node.id}`"
        >
          <text
            v-if="node.position"
            class="tree-node__text"
            :class="{
              'tree-node__text--target': node.isTarget,
              'tree-node__text--guess': node.isGuess,
              'tree-node__text--lca': node.isLCA,
            }"
            :x="node.position.x"
            :y="node.position.y"
            text-anchor="middle"
            dominant-baseline="middle"
            :aria-hidden="true"
            pointer-events="none"
          >
            {{ node.isTarget && !props.showTarget ? "?" : node.name }}
          </text>
        </template>
      </g>
    </svg>

    <!-- Screen reader description -->
    <div
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
    >
      <template v-if="hasTreeData && treeData">
        Phylogenetic tree with {{ treeData.nodes.length }}
        {{ treeData.nodes.length === 1 ? "node" : "nodes" }}.
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
  background: var(--color-surface, #f9fafb);
  border: 1px solid var(--color-border-subtle, #e5e7eb);
  border-radius: 8px;
  overflow: auto;
  outline: none;
  /* Smooth scrolling for horizontal navigation */
  scroll-behavior: smooth;
  /* Enable momentum scrolling on iOS */
  -webkit-overflow-scrolling: touch;
}

.dark .tree-visualization {
  background: var(--color-surface, #1e293b);
  border-color: var(--color-border-subtle, #1f2937);
}

.tree-visualization:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
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
  color: var(--color-ink-subtle, #6b7280);
  font-size: 0.875rem;
}

.dark .tree-visualization__empty-text {
  color: var(--color-ink-subtle, #9ca3af);
}

.tree-visualization__svg {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.tree-edge-rough {
  pointer-events: none;
}

.tree-nodes-rough {
  cursor: pointer;
}

.tree-node-group-rough {
  cursor: pointer;
}

.tree-node-group-rough:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
}

.tree-node-labels {
  pointer-events: none;
}

.tree-annotations {
  pointer-events: none;
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
  fill: var(--color-paper, #f5f1e8);
  stroke: var(--color-border-subtle, #e5e7eb);
  stroke-width: 2;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .tree-node {
  fill: var(--color-surface-alt, #111827);
  stroke: var(--color-muted, #6b7280);
}

.tree-node--animal {
  fill: var(--color-primary-soft, #effdf5);
  stroke: var(--color-primary-strong, #6b8e6b);
}

.dark .tree-node--animal {
  fill: var(--color-primary-soft, #1f2937);
  stroke: var(--color-primary-strong, #6b8e6b);
}

.tree-node--animal.tree-node--target {
  fill: var(--color-error-soft, #fef2f2);
  stroke: var(--color-error, #b87d7a);
  stroke-width: 3;
}

.dark .tree-node--animal.tree-node--target {
  fill: var(--color-error-soft, #7f1d1d);
  stroke: var(--color-error, #fca5a5);
}

.tree-node--animal.tree-node--guess {
  fill: var(--color-secondary-soft, #eff6ff);
  stroke: var(--color-secondary, #6b7f8e);
}

.dark .tree-node--animal.tree-node--guess {
  fill: var(--color-secondary-soft, #1e293b);
  stroke: var(--color-secondary, #93c5fd);
}

.tree-node--clade {
  fill: var(--color-surface-alt, #f3f4f6);
  stroke: var(--color-muted, #6b7280);
}

.dark .tree-node--clade {
  fill: var(--color-surface-alt, #1f2937);
  stroke: var(--color-muted, #9ca3af);
}

.tree-node--clade.tree-node--lca {
  fill: var(--color-warning-soft, #fffbeb);
  stroke: var(--color-warning, #d4a574);
  stroke-width: 3;
}

.dark .tree-node--clade.tree-node--lca {
  fill: var(--color-warning-soft, #451a03);
  stroke: var(--color-warning, #eab308);
}

.tree-node--focused {
  stroke-width: 4;
  filter: drop-shadow(0 0 4px var(--color-focus-ring, #6b7f8e));
}

.tree-node:focus,
.tree-node-rect:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
  outline-offset: 2px;
}

/* Larger tap targets on mobile */
@media (max-width: 767px) {
  .tree-node-rect {
    min-width: 44px;
    min-height: 44px;
  }
}

.tree-node__text {
  font-size: 14px;
  font-weight: 500;
  fill: var(--color-ink, #111827);
  pointer-events: none;
  user-select: none;
}

.dark .tree-node__text {
  fill: var(--color-ink, #f9fafb);
}

.tree-node__text--target {
  fill: var(--color-error, #b91c1c);
  font-weight: 700;
}

.dark .tree-node__text--target {
  fill: var(--color-error, #fca5a5);
}

.tree-node__text--guess {
  fill: var(--color-secondary, #1e40af);
  font-weight: 600;
}

.dark .tree-node__text--guess {
  fill: var(--color-secondary, #93c5fd);
}

.tree-node__text--lca {
  fill: var(--color-warning, #a16207);
  font-weight: 600;
}

.dark .tree-node__text--lca {
  fill: var(--color-warning, #fde047);
}

/* Non-color visual indicators for tree nodes */
.tree-node-indicator {
  opacity: 0.8;
  pointer-events: none;
}

.tree-node-indicator--target {
  /* Target nodes: circle with thicker stroke */
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}

.tree-node-indicator--guess {
  /* Guessed nodes: circle with dashed stroke */
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-dasharray: 2, 2;
  fill: none;
}

.tree-node-indicator--animal {
  /* Regular animal nodes: filled circle */
  fill: currentColor;
}

.tree-node-indicator--lca {
  /* LCA clades: square with thicker stroke */
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}

.tree-node-indicator--clade {
  /* Regular clades: filled square */
  fill: currentColor;
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
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border-subtle, #e5e7eb);
  border-radius: 6px;
  color: var(--color-ink-muted, #374151);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  touch-action: manipulation; /* Prevent double-tap zoom */
}

.dark .tree-visualization__copy-button {
  background: var(--color-surface-alt, #1f2937);
  border-color: var(--color-border-subtle, #4b5563);
  color: var(--color-ink, #f9fafb);
}

.tree-visualization__copy-button:hover {
  background: var(--color-surface-alt, #f9fafb);
  border-color: var(--color-border-subtle, #d1d5db);
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
}

.dark .tree-visualization__copy-button:hover {
  background: var(--color-surface-alt, #4b5563);
  border-color: var(--color-muted, #6b7280);
}

.tree-visualization__copy-button:active {
  transform: scale(0.95);
}

.tree-visualization__copy-button:focus {
  outline: 2px solid var(--color-focus-ring, #6b7f8e);
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
    font-size: 12px;
  }

  .tree-node {
    /* Larger node hit area on small screens */
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
    font-size: 13px;
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
    font-size: 14px;
  }

  .tree-visualization__copy-button {
    top: 12px;
    right: 12px;
  }
}
</style>
