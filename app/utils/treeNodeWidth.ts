import type { TreeNode } from "~/types/tree";

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_FONT_FAMILY = "system-ui, -apple-system, sans-serif";
const HORIZONTAL_PADDING = 20;
const MIN_BOX_WIDTH = 60;

/**
 * Approximate rendered width of a tree node box from its label (padding included).
 * Uses canvas when available; character estimate on SSR.
 * @param text
 * @param fontSize
 * @param fontFamily
 */
export function measureTreeLabelBoxWidth(
  text: string,
  fontSize: number = DEFAULT_FONT_SIZE,
  fontFamily: string = DEFAULT_FONT_FAMILY,
): number {
  const label = text ?? "";
  if (typeof window === "undefined") {
    const avgCharWidth = fontSize * 0.6;
    const textWidth = label.length * avgCharWidth;
    return Math.max(MIN_BOX_WIDTH, textWidth + HORIZONTAL_PADDING * 2);
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    const avgCharWidth = fontSize * 0.6;
    const textWidth = label.length * avgCharWidth;
    return Math.max(MIN_BOX_WIDTH, textWidth + HORIZONTAL_PADDING * 2);
  }

  context.font = `${fontSize}px ${fontFamily}`;
  const textWidth = context.measureText(label).width;
  return Math.max(MIN_BOX_WIDTH, textWidth + HORIZONTAL_PADDING * 2);
}

/**
 * Node width used for layout and rendering. When the target is hidden in game mode,
 * width matches "?" so the layout does not leak the name length.
 * @param node
 * @param showTarget
 */
export function getTreeNodeBoxWidth(node: TreeNode, showTarget: boolean): number {
  if (node.isTarget && !showTarget) {
    return measureTreeLabelBoxWidth("?", DEFAULT_FONT_SIZE);
  }
  return measureTreeLabelBoxWidth(node.name, DEFAULT_FONT_SIZE);
}
