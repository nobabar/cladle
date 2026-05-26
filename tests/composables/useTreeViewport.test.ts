import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import {
  TREE_VIEWPORT_MAX_SCALE,
  TREE_VIEWPORT_MIN_SCALE,
  TREE_VIEWPORT_ZOOM_STEP,
  useTreeViewport,
} from "~/composables/useTreeViewport";

describe("useTreeViewport", () => {
  const containerWidth = ref(800);
  const containerHeight = ref(600);
  const bounds = ref({
    minX: 100,
    minY: 50,
    width: 400,
    height: 300,
  });

  function createViewport() {
    return useTreeViewport({
      bounds: computed(() => bounds.value),
      containerWidth,
      containerHeight,
    });
  }

  it("fitToView centers content and resets userAdjusted", () => {
    const viewport = createViewport();
    viewport.userAdjusted.value = true;
    viewport.fitToView();

    expect(viewport.userAdjusted.value).toBe(false);
    expect(viewport.scale.value).toBeGreaterThan(0);
    expect(viewport.scale.value).toBeLessThanOrEqual(TREE_VIEWPORT_MAX_SCALE);

    const centerLayoutX = bounds.value.minX + bounds.value.width / 2;
    const centerLayoutY = bounds.value.minY + bounds.value.height / 2;
    const screenX = viewport.translateX.value + centerLayoutX * viewport.scale.value;
    const screenY = viewport.translateY.value + centerLayoutY * viewport.scale.value;
    expect(screenX).toBeCloseTo(containerWidth.value / 2, 0);
    expect(screenY).toBeCloseTo(containerHeight.value / 2, 0);
  });

  it("zoomBy keeps focal point stable on screen", () => {
    const viewport = createViewport();
    viewport.fitToView();

    const focal = { x: 200, y: 150 };
    const screenBeforeX = viewport.translateX.value + focal.x * viewport.scale.value;
    const screenBeforeY = viewport.translateY.value + focal.y * viewport.scale.value;

    viewport.zoomBy(TREE_VIEWPORT_ZOOM_STEP, focal);

    const screenAfterX = viewport.translateX.value + focal.x * viewport.scale.value;
    const screenAfterY = viewport.translateY.value + focal.y * viewport.scale.value;

    expect(screenAfterX).toBeCloseTo(screenBeforeX, 5);
    expect(screenAfterY).toBeCloseTo(screenBeforeY, 5);
    expect(viewport.userAdjusted.value).toBe(true);
  });

  it("clamps scale to min and max", () => {
    const viewport = createViewport();
    viewport.scale.value = TREE_VIEWPORT_MAX_SCALE;
    viewport.zoomBy(2);
    expect(viewport.scale.value).toBe(TREE_VIEWPORT_MAX_SCALE);

    viewport.scale.value = TREE_VIEWPORT_MIN_SCALE;
    viewport.zoomBy(0.1);
    expect(viewport.scale.value).toBe(TREE_VIEWPORT_MIN_SCALE);
  });

  it("panBy updates translate and marks userAdjusted", () => {
    const viewport = createViewport();
    viewport.fitToView();
    const tx = viewport.translateX.value;
    const ty = viewport.translateY.value;

    viewport.panBy(10, -20);

    expect(viewport.translateX.value).toBe(tx + 10);
    expect(viewport.translateY.value).toBe(ty - 20);
    expect(viewport.userAdjusted.value).toBe(true);
  });

  it("resetView calls fitToView", () => {
    const viewport = createViewport();
    viewport.panBy(50, 50);
    viewport.resetView();
    expect(viewport.userAdjusted.value).toBe(false);
  });

  it("exposes transform string", () => {
    const viewport = createViewport();
    viewport.translateX.value = 10;
    viewport.translateY.value = 20;
    viewport.scale.value = 2;
    expect(viewport.transform.value).toBe("translate(10,20) scale(2)");
  });
});
