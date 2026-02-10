import type { TreeData, TreeNode } from "~/types/tree";

/**
 * Convert a tree node ID to a valid Mermaid node ID
 * Mermaid node IDs must be alphanumeric and start with a letter
 * @param id - Original node ID
 * @returns Valid Mermaid node ID
 */
function sanitizeNodeId(id: string): string {
  // Replace non-alphanumeric characters with underscores
  // Ensure it starts with a letter
  const sanitized = id.replace(/\W/g, "_");
  return sanitized.match(/^[a-z]/i) ? sanitized : `N${sanitized}`;
}

/**
 * Escape special characters in node labels for Mermaid
 * @param text - Text to escape
 * @returns Escaped text safe for Mermaid
 */
function escapeMermaidLabel(text: string): string {
  // Mermaid labels can contain most characters, but we should escape quotes
  return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Get node label with styling indicators
 * @param node - Tree node
 * @param isDevMode - Whether we're in development mode
 * @returns Formatted label string
 */
function getNodeLabel(node: TreeNode, isDevMode: boolean = false): string {
  const parts: string[] = [];

  // Add type indicator
  if (node.type === "animal") {
    parts.push("🐾");
  } else {
    parts.push("🌳");
  }

  // Add name - in production, don't reveal target animal name
  if (node.isTarget && !isDevMode) {
    parts.push("?");
  } else {
    parts.push(node.name);
  }

  // Add special indicators - in production, don't reveal target indicator
  if (node.isTarget && isDevMode) {
    parts.push("(Target)");
  }
  if (node.isGuess) {
    parts.push("(Guess)");
  }
  if (node.isLCA) {
    parts.push("(LCA)");
  }

  return escapeMermaidLabel(parts.join(" "));
}

/**
 * Recursively build Mermaid diagram from tree node
 * @param node - Current tree node
 * @param visited - Set of visited node IDs to prevent cycles
 * @param lines - Array to collect Mermaid lines
 * @param isDevMode - Whether we're in development mode
 */
function buildMermaidLines(
  node: TreeNode,
  visited: Set<string>,
  lines: string[],
  isDevMode: boolean = false,
): void {
  const nodeId = sanitizeNodeId(node.id);
  const label = getNodeLabel(node, isDevMode);

  // Skip if already visited (prevent cycles)
  if (visited.has(nodeId)) {
    return;
  }
  visited.add(nodeId);

  // Process children (safety check for undefined/null)
  const children = node.children || [];
  if (children.length > 0) {
    for (const child of children) {
      if (!child) continue; // Skip null/undefined children

      const childId = sanitizeNodeId(child.id);
      const childLabel = getNodeLabel(child, isDevMode);

      // Add connection line
      lines.push(`    ${nodeId}["${label}"] --> ${childId}["${childLabel}"]`);

      // Recursively process child
      buildMermaidLines(child, visited, lines, isDevMode);
    }
  }
}

/**
 * Convert TreeData to Mermaid flowchart format
 * @param treeData - Tree data structure
 * @param isDevMode - Whether we're in development mode (defaults to false for production safety)
 * @returns Mermaid diagram string
 */
export function treeToMermaid(treeData: TreeData | null, isDevMode: boolean = false): string {
  if (!treeData || !treeData.root) {
    return "graph TD\n    Empty[No tree data available]";
  }

  const lines: string[] = [];
  const visited = new Set<string>();

  // Start with graph declaration (Top-Down layout)
  lines.push("graph TD");

  // Build the tree structure starting from root
  buildMermaidLines(treeData.root, visited, lines, isDevMode);

  // Add styling information as comments
  lines.push("");
  lines.push("    %% Styling:");
  lines.push("    %% 🐾 = Animal node");
  lines.push("    %% 🌳 = Clade node");
  if (isDevMode) {
    lines.push("    %% (Target) = Target animal");
  }
  lines.push("    %% (Guess) = Guessed animal");
  lines.push("    %% (LCA) = Last Common Ancestor");

  return lines.join("\n");
}
