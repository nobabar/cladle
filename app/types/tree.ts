import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";

/**
 * Tree Node Data Interface
 *
 * Represents a node in the phylogenetic tree visualization.
 * Nodes can be either animals (leaf nodes) or clades (internal nodes).
 */
export interface TreeNode {
  /** Unique identifier for the node */
  id: string;

  /** Type of node: 'animal' for leaf nodes, 'clade' for internal nodes */
  type: "animal" | "clade";

  /** Display name of the node */
  name: string;

  /** Animal data (if type is 'animal') */
  data?: Animal;

  /** Clade data (if type is 'clade') */
  cladeData?: Clade;

  /** Child nodes */
  children: TreeNode[];

  /** Parent node (undefined for root) */
  parent?: TreeNode;

  /** Calculated position for rendering (x, y coordinates) */
  position?: { x: number; y: number };

  /** Depth in the tree (0 for root) */
  depth?: number;

  /** Whether this node represents the target animal */
  isTarget?: boolean;

  /** Whether this node represents a guessed animal */
  isGuess?: boolean;

  /** Whether this node is a Last Common Ancestor (LCA) */
  isLCA?: boolean;
}

/**
 * Tree Data Structure
 *
 * Represents the complete phylogenetic tree structure for visualization.
 */
export interface TreeData {
  /** Root node (typically Metazoa) */
  root: TreeNode;

  /** Target animal node */
  target: TreeNode;

  /** All nodes in the tree (flat list for easy access) */
  nodes: TreeNode[];

  /** Guessed animals (leaf nodes) */
  guesses: TreeNode[];
}

/**
 * Tree Layout Configuration
 *
 * Configuration for tree layout calculations.
 */
export interface TreeLayoutConfig {
  /** Horizontal spacing between nodes at the same level */
  horizontalSpacing: number;

  /** Vertical spacing between levels */
  verticalSpacing: number;

  /** Width of each node */
  nodeWidth: number;

  /** Height of each node */
  nodeHeight: number;

  /** Padding around the tree */
  padding: number;
}
