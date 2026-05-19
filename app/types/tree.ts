import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";

/**
 * Tree Node Data Interface
 *
 * Represents a node in the phylogenetic tree visualization.
 * Nodes can be either animals (leaf nodes) or clades (internal nodes).
 */
export interface TreeNode {
  id: string;

  /** Leaf vs internal (clade) node */
  type: "animal" | "clade";

  name: string;

  /** Animal data (if type is 'animal') */
  data?: Animal;

  /** Clade data (if type is 'clade') */
  cladeData?: Clade;

  /** Child nodes */
  children: TreeNode[];

  /** Parent node (undefined for root) */
  parent?: TreeNode;

  position?: { x: number; y: number };

  /** Depth in the tree (0 for root) */
  depth?: number;

  /** Taxonomic depth from LCA calculation (0 = kingdom, 1 = phylum, …) */
  taxonomicDepth?: number;

  /** Taxonomy path prefix from kingdom through this clade */
  taxonomyPath?: string[];

  isTarget?: boolean;
  isGuess?: boolean;
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
  target: TreeNode;
  nodes: TreeNode[];
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
