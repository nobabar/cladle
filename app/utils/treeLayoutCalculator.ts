import { hierarchy, tree } from "d3-hierarchy";
import type { TreeData, TreeLayoutConfig, TreeNode } from "~/types/tree";
import { getTreeNodeBoxWidth } from "~/utils/treeNodeWidth";

export interface Edge {
  from: TreeNode;
  to: TreeNode;
  path?: string;
}

export interface PositionedNode extends TreeNode {
  position: { x: number; y: number };
  depth: number;
}

export interface LayoutResult {
  nodes: Map<string, PositionedNode>;
  edges: Edge[];
  dimensions: {
    width: number;
    height: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/** Options that must stay aligned with tree visualization rendering. */
export interface CalculateTreeLayoutOptions {
  /**
   * When false, the target leaf uses "?" width (game mode). Defaults to true.
   */
  showTarget?: boolean;
}

const DEFAULT_CONFIG: TreeLayoutConfig = {
  horizontalSpacing: 150,
  verticalSpacing: 120,
  nodeWidth: 100,
  nodeHeight: 60,
  padding: 40,
};

/**
 * Calculate tree layout positions using D3's Reingold-Tilford algorithm
 *
 * This function uses D3.hierarchy internally for tree layout calculations.
 * The algorithm provides proper node alignment and balanced layout for unbalanced trees.
 *
 * @param treeData - The tree data structure to layout
 * @param containerWidth - Width of the container (for auto-fitting)
 * @param config - Optional layout configuration
 * @param options
 * @returns Layout result with positioned nodes, edges, and dimensions
 */
export function calculateTreeLayout(
  treeData: TreeData,
  containerWidth: number = 800,
  config: Partial<TreeLayoutConfig> = {},
  options: CalculateTreeLayoutOptions = {},
): LayoutResult {
  const layoutConfig: TreeLayoutConfig = { ...DEFAULT_CONFIG, ...config };
  const showTargetForLayout = options.showTarget ?? true;
  const dx = layoutConfig.horizontalSpacing;
  /** Minimum gap between adjacent node rectangles (pixels). */
  const siblingGapPx = 12;

  // Convert to D3 hierarchy and calculate layout
  const d3Root = hierarchy(treeData.root, d => d.children);
  const treeLayout = tree<TreeNode>()
    .nodeSize([layoutConfig.horizontalSpacing, layoutConfig.verticalSpacing])
    .separation((a, b) => {
      // d3-hierarchy passes layout nodes; `.data` is our TreeNode.
      const na = a.data;
      const nb = b.data;
      const wa = getTreeNodeBoxWidth(na, showTargetForLayout);
      const wb = getTreeNodeBoxWidth(nb, showTargetForLayout);
      const minCenterDistance = wa / 2 + wb / 2 + siblingGapPx;
      const sepUnits = minCenterDistance / dx;
      return a.parent === b.parent ? Math.max(1, sepUnits) : Math.max(2, sepUnits);
    });

  const layoutedRoot = treeLayout(d3Root);

  // Build positioned nodes and calculate bounds in a single pass
  const nodeMap = new Map<string, PositionedNode>();
  const edges: Edge[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  // Process all nodes to build nodeMap and calculate raw bounds
  for (const d3Node of layoutedRoot.descendants()) {
    const treeNode = d3Node.data;
    const rawX = d3Node.x ?? 0;
    const rawY = d3Node.y ?? 0;

    // Center horizontally and add vertical padding
    const centeredX = rawX + containerWidth / 2;
    const positionedY = rawY + layoutConfig.padding;

    const positionedNode: PositionedNode = {
      ...treeNode,
      position: { x: centeredX, y: positionedY },
      depth: d3Node.depth ?? 0,
    };

    nodeMap.set(treeNode.id, positionedNode);

    const nodeW = getTreeNodeBoxWidth(treeNode, showTargetForLayout);
    const nodeLeft = centeredX - nodeW / 2;
    const nodeRight = centeredX + nodeW / 2;
    const nodeTop = positionedY - layoutConfig.nodeHeight / 2;
    const nodeBottom = positionedY + layoutConfig.nodeHeight / 2;

    minX = Math.min(minX, nodeLeft);
    maxX = Math.max(maxX, nodeRight);
    minY = Math.min(minY, nodeTop);
    maxY = Math.max(maxY, nodeBottom);
  }

  function buildEdges(node: TreeNode): void {
    const parentNode = nodeMap.get(node.id);
    if (!parentNode) return;

    for (const child of node.children) {
      const childNode = nodeMap.get(child.id);
      if (childNode) {
        edges.push({ from: parentNode, to: childNode });
        buildEdges(child);
      }
    }
  }

  buildEdges(treeData.root);

  if (nodeMap.size === 0) {
    return {
      nodes: new Map(),
      edges: [],
      dimensions: {
        width: containerWidth,
        height: layoutConfig.nodeHeight + layoutConfig.padding * 2,
        minX: 0,
        maxX: containerWidth,
        minY: 0,
        maxY: layoutConfig.nodeHeight + layoutConfig.padding * 2,
      },
    };
  }

  // Calculate viewBox dimensions with padding
  const treeWidth = maxX - minX;
  const treeHeight = maxY - minY;
  const padding = layoutConfig.padding;

  const viewBoxWidth = Math.max(containerWidth, treeWidth + padding * 2);
  const viewBoxHeight = treeHeight + padding * 2;
  const centerOffsetX = (viewBoxWidth - treeWidth) / 2;

  const dimensions = {
    width: viewBoxWidth,
    height: viewBoxHeight,
    minX: minX - centerOffsetX,
    maxX: maxX + centerOffsetX,
    minY: Math.max(0, minY - padding),
    maxY: maxY + padding,
  };

  return {
    nodes: nodeMap,
    edges,
    dimensions,
  };
}

/**
 * Get SVG viewBox string from layout dimensions
 *
 * @param dimensions - Layout dimensions
 * @returns SVG viewBox string
 */
export function getViewBoxFromDimensions(dimensions: LayoutResult["dimensions"]): string {
  return `${dimensions.minX} ${dimensions.minY} ${dimensions.width} ${dimensions.height}`;
}
