import { computed, ref } from "vue";
import type { ComputedRef, Ref } from "vue";
import type { LayoutResult } from "~/utils/treeLayoutCalculator";

export interface TreeViewportBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export const TREE_VIEWPORT_MIN_SCALE = 0.6;
export const TREE_VIEWPORT_MAX_SCALE = 4;
export const TREE_VIEWPORT_ZOOM_STEP = 1.2;
export const TREE_VIEWPORT_FIT_PADDING = 0.05;

export interface UseTreeViewportOptions {
  bounds: ComputedRef<TreeViewportBounds | null>;
  containerWidth: Ref<number>;
  containerHeight: Ref<number>;
}

/**
 * Manages zoom/pan transform for the phylogenetic tree SVG viewport.
 * Transform: translate(tx, ty) scale(s) applied to layout-coordinate content.
 * @param options - The options for the tree viewport.
 * @returns The tree viewport.
 */
export function useTreeViewport(options: UseTreeViewportOptions) {
  const scale = ref(1);
  const translateX = ref(0);
  const translateY = ref(0);
  const userAdjusted = ref(false);

  const transform = computed(
    () => `translate(${translateX.value},${translateY.value}) scale(${scale.value})`,
  );

  function clampScale(value: number): number {
    return Math.min(TREE_VIEWPORT_MAX_SCALE, Math.max(TREE_VIEWPORT_MIN_SCALE, value));
  }

  function getContentBounds(): TreeViewportBounds | null {
    const b = options.bounds.value;
    if (!b || b.width <= 0 || b.height <= 0) {
      return null;
    }
    return b;
  }

  function fitToView(markUserAdjusted = false): void {
    const bounds = getContentBounds();
    const cw = options.containerWidth.value;
    const ch = options.containerHeight.value;
    if (!bounds || cw <= 0 || ch <= 0) {
      return;
    }

    const padding = TREE_VIEWPORT_FIT_PADDING;
    const availableW = cw * (1 - padding * 2);
    const availableH = ch * (1 - padding * 2);
    const fitScale = Math.min(availableW / bounds.width, availableH / bounds.height);
    const s = clampScale(fitScale);

    const contentCenterX = bounds.minX + bounds.width / 2;
    const contentCenterY = bounds.minY + bounds.height / 2;

    scale.value = s;
    translateX.value = cw / 2 - contentCenterX * s;
    translateY.value = ch / 2 - contentCenterY * s;

    if (!markUserAdjusted) {
      userAdjusted.value = false;
    }
  }

  /**
   * Convert client (screen) coords inside the SVG to layout coordinates.
   * @param clientX - The x coordinate of the client in the SVG.
   * @param clientY - The y coordinate of the client in the SVG.
   * @param svgElement - The SVG element.
   * @returns The layout coordinates.
   */
  function clientToLayout(
    clientX: number,
    clientY: number,
    svgElement: SVGSVGElement,
  ): { x: number; y: number } {
    const pt = svgElement.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgElement.getScreenCTM();
    if (!ctm) {
      return { x: clientX, y: clientY };
    }
    const svgPt = pt.matrixTransform(ctm.inverse());
    const s = scale.value;
    return {
      x: (svgPt.x - translateX.value) / s,
      y: (svgPt.y - translateY.value) / s,
    };
  }

  function zoomBy(factor: number, focalPoint?: { x: number; y: number }): void {
    const bounds = getContentBounds();
    const cw = options.containerWidth.value;
    const ch = options.containerHeight.value;
    if (!bounds || cw <= 0 || ch <= 0) {
      return;
    }

    const oldScale = scale.value;
    const newScale = clampScale(oldScale * factor);
    if (newScale === oldScale) {
      return;
    }

    const focal = focalPoint ?? {
      x: bounds.minX + bounds.width / 2,
      y: bounds.minY + bounds.height / 2,
    };

    // screen = translate + layout * scale; keep focal fixed on screen
    translateX.value += focal.x * (oldScale - newScale);
    translateY.value += focal.y * (oldScale - newScale);
    scale.value = newScale;
    userAdjusted.value = true;
  }

  function zoomIn(focalPoint?: { x: number; y: number }): void {
    zoomBy(TREE_VIEWPORT_ZOOM_STEP, focalPoint);
  }

  function zoomOut(focalPoint?: { x: number; y: number }): void {
    zoomBy(1 / TREE_VIEWPORT_ZOOM_STEP, focalPoint);
  }

  function panBy(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      return;
    }
    translateX.value += dx;
    translateY.value += dy;
    userAdjusted.value = true;
  }

  function resetView(): void {
    fitToView(false);
  }

  function layoutBoundsFromDimensions(dimensions: LayoutResult["dimensions"]): TreeViewportBounds {
    return {
      minX: dimensions.minX,
      minY: dimensions.minY,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  return {
    scale,
    translateX,
    translateY,
    userAdjusted,
    transform,
    fitToView,
    zoomBy,
    zoomIn,
    zoomOut,
    panBy,
    resetView,
    clientToLayout,
    layoutBoundsFromDimensions,
  };
}
