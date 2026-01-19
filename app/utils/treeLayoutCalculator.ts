import type { TreeData, TreeLayoutConfig, TreeNode } from "~/types/tree";

/**
 * Edge interface for tree connections
 */
export interface Edge {
  /** Source node */
  from: TreeNode;
  /** Target node */
  to: TreeNode;
  /** SVG path string for the edge */
  path?: string;
}

/**
 * Positioned node with calculated coordinates
 */
export interface PositionedNode extends TreeNode {
  /** Calculated position (required) */
  position: { x: number; y: number };
  /** Depth in tree (required) */
  depth: number;
}

/**
 * Layout calculation result
 */
export interface LayoutResult {
  /** Map of node IDs to positioned nodes */
  nodes: Map<string, PositionedNode>;
  /** Array of edges connecting nodes */
  edges: Edge[];
  /** Calculated tree dimensions */
  dimensions: {
    width: number;
    height: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Default layout configuration
 */
const DEFAULT_CONFIG: TreeLayoutConfig = {
  horizontalSpacing: 150,
  verticalSpacing: 120,
  nodeWidth: 100,
  nodeHeight: 60,
  padding: 40,
};

/**
 * Calculate tree layout positions
 *
 * Implements a top-to-bottom hierarchical layout algorithm optimized for performance.
 * The algorithm:
 * 1. Assigns depths to all nodes
 * 2. Groups nodes by depth
 * 3. Calculates horizontal positions with proper spacing
 * 4. Fits tree to container width when possible
 * 5. Returns positioned nodes, edges, and dimensions
 *
 * @param treeData - The tree data structure to layout
 * @param containerWidth - Width of the container (for auto-fitting)
 * @param config - Optional layout configuration
 * @returns Layout result with positioned nodes, edges, and dimensions
 */
export function calculateTreeLayout(
  treeData: TreeData,
  containerWidth: number = 800,
  config: Partial<TreeLayoutConfig> = {},
): LayoutResult {
  const startTime = performance.now();
  const layoutConfig: TreeLayoutConfig = { ...DEFAULT_CONFIG, ...config };

  // Build node map and assign depths
  const nodeMap = new Map<string, PositionedNode>();
  const visited = new Set<string>();

  /**
   * Assign depths to nodes recursively
   * @param node - The tree node to process
   * @param depth - Current depth in the tree (default: 0)
   */
  function assignDepths(node: TreeNode, depth: number = 0): void {
    if (visited.has(node.id)) {
      return;
    }
    visited.add(node.id);

    const positionedNode: PositionedNode = {
      ...node,
      depth,
      position: { x: 0, y: 0 }, // Will be calculated later
    };

    nodeMap.set(node.id, positionedNode);

    for (const child of node.children) {
      assignDepths(child, depth + 1);
    }
  }

  assignDepths(treeData.root, 0);

  // Group nodes by depth for efficient layout calculation
  const nodesByDepth = new Map<number, PositionedNode[]>();
  for (const node of nodeMap.values()) {
    const depth = node.depth;
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth)!.push(node);
  }

  // Calculate positions for each depth level
  const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

  // Find maximum width needed at any depth
  let maxNodesAtDepth = 0;
  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodesAtDepth = nodesByDepth.get(depth) || [];
    maxNodesAtDepth = Math.max(maxNodesAtDepth, nodesAtDepth.length);
  }

  // Calculate optimal horizontal spacing to fit container width
  const availableWidth = containerWidth - layoutConfig.padding * 2 - layoutConfig.nodeWidth;
  const requiredWidth = maxNodesAtDepth > 1
    ? (maxNodesAtDepth - 1) * layoutConfig.horizontalSpacing
    : 0;

  // Auto-fit: adjust spacing if tree is wider than container
  let horizontalSpacing = layoutConfig.horizontalSpacing;
  if (requiredWidth > availableWidth && maxNodesAtDepth > 1) {
    horizontalSpacing = Math.max(
      50, // Minimum spacing for readability
      availableWidth / (maxNodesAtDepth - 1),
    );
  }

  // Calculate tree width for centering
  const treeWidth = maxNodesAtDepth > 0
    ? (maxNodesAtDepth - 1) * horizontalSpacing + layoutConfig.nodeWidth
    : layoutConfig.nodeWidth;

  // Position nodes at each depth level
  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodesAtDepth = nodesByDepth.get(depth) || [];
    if (nodesAtDepth.length === 0) {
      continue;
    }

    const nodeCount = nodesAtDepth.length;
    const totalWidth = nodeCount > 1 ? (nodeCount - 1) * horizontalSpacing : 0;
    const startX = treeWidth / 2 - totalWidth / 2;

    nodesAtDepth.forEach((node, index) => {
      const x = startX + index * horizontalSpacing;
      const y = layoutConfig.padding + depth * layoutConfig.verticalSpacing;
      node.position = { x, y };
      nodeMap.set(node.id, node);
    });
  }

  // Calculate edges (connections between nodes)
  const edges = calculateEdges(nodeMap, treeData.root);

  // Calculate tree dimensions
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodeMap.values()) {
    const { x, y } = node.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // Add padding to dimensions
  const padding = layoutConfig.padding;
  const dimensions = {
    width: Math.max(containerWidth, maxX - minX + layoutConfig.nodeWidth + padding * 2),
    height: maxY - minY + layoutConfig.nodeHeight + padding * 2,
    minX: minX - padding,
    maxX: maxX + layoutConfig.nodeWidth + padding,
    minY: minY - padding,
    maxY: maxY + layoutConfig.nodeHeight + padding,
  };

  // Performance check: ensure calculation completes within 500ms
  const endTime = performance.now();
  const calculationTime = endTime - startTime;
  if (calculationTime > 500) {
    console.warn(
      `Tree layout calculation took ${calculationTime.toFixed(2)}ms, exceeding 500ms threshold`,
    );
  }

  return {
    nodes: nodeMap,
    edges,
    dimensions,
  };
}

/**
 * Calculate edges (connections) between nodes
 *
 * @param nodeMap - Map of node IDs to positioned nodes
 * @param root - Root node of the tree
 * @returns Array of edges connecting parent to child nodes
 */
function calculateEdges(
  nodeMap: Map<string, PositionedNode>,
  root: TreeNode,
): Edge[] {
  const edges: Edge[] = [];

  /**
   * Recursively collect edges
   * @param node - The tree node to process
   */
  function collectEdges(node: TreeNode): void {
    const parentNode = nodeMap.get(node.id);
    if (!parentNode) {
      return;
    }

    for (const child of node.children) {
      const childNode = nodeMap.get(child.id);
      if (childNode && parentNode.position && childNode.position) {
        edges.push({
          from: parentNode,
          to: childNode,
        });
        collectEdges(child);
      }
    }
  }

  collectEdges(root);
  return edges;
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
