import type { TreeNode } from "~/types/tree";

const DEFAULT_FONT_SIZE = 14;
/** Matches `.tree-node__text--emoji` in tree-visualization.vue. */
const EMOJI_ONLY_FONT_SIZE = 26;

/**
 * Indie Flower `@font-face` `size-adjust` in `app/assets/css/main.css`
 * (milder than full Atkinson x-height match of ≈1.36).
 */
export const INDIE_FLOWER_SIZE_ADJUST = 1.18;

const DEFAULT_FONT_FAMILY
  = "\"Indie Flower\", \"Atkinson Hyperlegible Next\", system-ui, -apple-system, sans-serif";
const READABLE_MEASURE_STACK
  = "\"Atkinson Hyperlegible Next\", system-ui, -apple-system, sans-serif";

function isReadableFontActive(): boolean {
  return typeof document !== "undefined"
    && document.documentElement.classList.contains("font-readable");
}

function measureFontFamilyForDocument(): string {
  if (typeof document === "undefined") {
    return DEFAULT_FONT_FAMILY;
  }
  return isReadableFontActive() ? READABLE_MEASURE_STACK : DEFAULT_FONT_FAMILY;
}

/**
 * Whether measurement should treat Indie Flower's size-adjust as applying.
 * Canvas uses the face metrics when the font is loaded; the SSR/char-width
 * fallback must apply the factor explicitly.
 * @param fontFamily - Font stack being measured
 * @returns True when Indie Flower size-adjust should scale the SSR estimate
 */
function shouldApplyIndieFlowerSizeAdjust(fontFamily: string): boolean {
  return fontFamily.includes("Indie Flower") && !isReadableFontActive();
}

const HORIZONTAL_PADDING = 20;
const MIN_BOX_WIDTH = 60;

/**
 * Approximate rendered width of a tree node box from its label (padding included).
 * Uses canvas when available; character estimate on SSR.
 * @param text - Text to measure
 * @param fontSize - Font size to use
 * @param fontFamily - Font family to use
 * @returns Measured width of the text
 */
export function measureTreeLabelBoxWidth(
  text: string,
  fontSize: number = DEFAULT_FONT_SIZE,
  fontFamily: string = measureFontFamilyForDocument(),
): number {
  const label = text ?? "";
  const applyIndieAdjust = shouldApplyIndieFlowerSizeAdjust(fontFamily);

  if (typeof window === "undefined") {
    const effectiveSize = applyIndieAdjust
      ? fontSize * INDIE_FLOWER_SIZE_ADJUST
      : fontSize;
    const avgCharWidth = effectiveSize * 0.6;
    const textWidth = label.length * avgCharWidth;
    return Math.max(MIN_BOX_WIDTH, textWidth + HORIZONTAL_PADDING * 2);
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    const effectiveSize = applyIndieAdjust
      ? fontSize * INDIE_FLOWER_SIZE_ADJUST
      : fontSize;
    const avgCharWidth = effectiveSize * 0.6;
    const textWidth = label.length * avgCharWidth;
    return Math.max(MIN_BOX_WIDTH, textWidth + HORIZONTAL_PADDING * 2);
  }

  // Canvas uses the loaded @font-face, including size-adjust on Indie Flower.
  context.font = `${fontSize}px ${fontFamily}`;
  const textWidth = context.measureText(label).width;
  return Math.max(MIN_BOX_WIDTH, textWidth + HORIZONTAL_PADDING * 2);
}

export interface TreeNodeLabelOptions {
  /** When true, animal nodes show sticker emoji only (no name suffix). */
  emojiOnly?: boolean;
  /** Maps clade scientific names to simpler tree labels. */
  resolveCladeLabel?: (name: string, rank?: string) => string;
}

/**
 * Visible SVG label for a tree node, optionally prefixed with a baby mode sticker.
 * Clade nodes and hidden mystery targets ignore the sticker map.
 * @param node - Tree node to label
 * @param showTarget - Whether the target animal name is visible
 * @param stickerByAnimalId - Optional id -> emoji map for baby mode labels
 * @param labelOptions - Baby mode presentation overrides
 * @returns Label string drawn in the SVG (may include a leading emoji)
 */
export function getTreeNodeDisplayLabel(
  node: TreeNode,
  showTarget: boolean,
  stickerByAnimalId?: Record<string, string>,
  labelOptions?: TreeNodeLabelOptions,
): string {
  if (node.isTarget && !showTarget) {
    return "?";
  }

  if (node.type === "clade" && node.name && labelOptions?.resolveCladeLabel) {
    const resolved = labelOptions.resolveCladeLabel(node.name, node.cladeData?.rank);
    return resolved || node.name;
  }

  if (node.type === "animal" && stickerByAnimalId && node.data?.id) {
    const sticker = stickerByAnimalId[node.data.id];
    if (sticker) {
      return labelOptions?.emojiOnly ? sticker : `${sticker} ${node.name}`;
    }
  }

  return node.name;
}

/**
 * Node width used for layout and rendering. When the target is hidden in game mode,
 * width matches "?" so the layout does not leak the name length.
 * @param node - Tree node to measure
 * @param showTarget - Whether to show the target node
 * @param stickerByAnimalId - Optional id -> emoji map for baby mode labels
 * @param labelOptions - Presentation overrides
 * @returns Measured width of the node box
 */
export function getTreeNodeBoxWidth(
  node: TreeNode,
  showTarget: boolean,
  stickerByAnimalId?: Record<string, string>,
  labelOptions?: TreeNodeLabelOptions,
): number {
  const label = getTreeNodeDisplayLabel(node, showTarget, stickerByAnimalId, labelOptions);
  const fontSize = labelOptions?.emojiOnly && node.type === "animal" && stickerByAnimalId?.[node.data?.id ?? ""]
    ? EMOJI_ONLY_FONT_SIZE
    : DEFAULT_FONT_SIZE;
  return measureTreeLabelBoxWidth(label, fontSize);
}
