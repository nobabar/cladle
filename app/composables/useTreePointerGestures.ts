import type { Ref } from "vue";
import { onMounted, onUnmounted, watch } from "vue";
import type { useTreeViewport } from "~/composables/useTreeViewport";

const PAN_THRESHOLD_PX = 5;

type TreeViewport = ReturnType<typeof useTreeViewport>;

interface PointerRecord {
  clientX: number;
  clientY: number;
}

export interface UseTreePointerGesturesOptions {
  svgRef: Ref<SVGSVGElement | null>;
  viewport: TreeViewport;
  enabled: Ref<boolean>;
}

export function useTreePointerGestures(options: UseTreePointerGesturesOptions) {
  const activePointers = new Map<number, PointerRecord>();
  let panPointerId: number | null = null;
  let panStartClient = { clientX: 0, clientY: 0 };
  let panLastClient = { clientX: 0, clientY: 0 };
  let isPanning = false;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let pinchFocalLayout = { x: 0, y: 0 };
  let lastPinchMid = { x: 0, y: 0 };

  function isNodeTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof Element)) {
      return false;
    }
    return !!target.closest(".tree-node-group-rough");
  }

  function getSvg(): SVGSVGElement | null {
    return options.svgRef.value;
  }

  function getMidpoint(): { x: number; y: number } | null {
    const pts = Array.from(activePointers.values());
    if (pts.length < 2) {
      return null;
    }
    const [a, b] = pts;
    if (!a || !b) {
      return null;
    }
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    };
  }

  function getPinchDistance(): number {
    const pts = Array.from(activePointers.values());
    if (pts.length < 2) {
      return 0;
    }
    const [a, b] = pts;
    if (!a || !b) {
      return 0;
    }
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }

  function onWheel(event: WheelEvent): void {
    if (!options.enabled.value) {
      return;
    }
    const svg = getSvg();
    if (!svg) {
      return;
    }
    event.preventDefault();
    const focal = options.viewport.clientToLayout(event.clientX, event.clientY, svg);
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    options.viewport.zoomBy(factor, focal);
  }

  function onPointerDown(event: PointerEvent): void {
    if (!options.enabled.value) {
      return;
    }
    const svg = getSvg();
    if (!svg || isNodeTarget(event.target)) {
      return;
    }

    activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    svg.setPointerCapture(event.pointerId);

    if (activePointers.size === 1) {
      panPointerId = event.pointerId;
      panStartClient = { clientX: event.clientX, clientY: event.clientY };
      panLastClient = { clientX: event.clientX, clientY: event.clientY };
      isPanning = false;
    } else if (activePointers.size === 2) {
      panPointerId = null;
      isPanning = false;
      pinchStartDistance = getPinchDistance();
      pinchStartScale = options.viewport.scale.value;
      const mid = getMidpoint();
      if (mid && svg) {
        pinchFocalLayout = options.viewport.clientToLayout(mid.x, mid.y, svg);
        lastPinchMid = { ...mid };
      }
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!options.enabled.value) {
      return;
    }
    const svg = getSvg();
    if (!svg || !activePointers.has(event.pointerId)) {
      return;
    }

    activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

    if (activePointers.size >= 2) {
      const dist = getPinchDistance();
      if (pinchStartDistance > 0 && dist > 0) {
        const factor = (pinchStartScale * (dist / pinchStartDistance)) / options.viewport.scale.value;
        if (Math.abs(factor - 1) > 0.001) {
          options.viewport.zoomBy(factor, pinchFocalLayout);
        }
      }

      const mid = getMidpoint();
      if (mid) {
        options.viewport.panBy(mid.x - lastPinchMid.x, mid.y - lastPinchMid.y);
        lastPinchMid = { ...mid };
      }
      return;
    }

    if (panPointerId !== event.pointerId) {
      return;
    }

    if (!isPanning) {
      const moved = Math.hypot(
        event.clientX - panStartClient.clientX,
        event.clientY - panStartClient.clientY,
      );
      if (moved < PAN_THRESHOLD_PX) {
        return;
      }
      isPanning = true;
    }

    const dx = event.clientX - panLastClient.clientX;
    const dy = event.clientY - panLastClient.clientY;
    options.viewport.panBy(dx, dy);
    panLastClient = { clientX: event.clientX, clientY: event.clientY };
  }

  function onPointerUp(event: PointerEvent): void {
    const svg = getSvg();
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
    activePointers.delete(event.pointerId);

    if (panPointerId === event.pointerId) {
      panPointerId = null;
      isPanning = false;
    }

    if (activePointers.size === 1) {
      const remaining = Array.from(activePointers.entries())[0];
      if (remaining) {
        panPointerId = remaining[0];
        panStartClient = { ...remaining[1] };
        panLastClient = { ...remaining[1] };
        isPanning = false;
      }
      pinchStartDistance = 0;
    } else if (activePointers.size === 2) {
      pinchStartDistance = getPinchDistance();
      pinchStartScale = options.viewport.scale.value;
      const mid = getMidpoint();
      const svgEl = getSvg();
      if (mid && svgEl) {
        pinchFocalLayout = options.viewport.clientToLayout(
          mid.x,
          mid.y,
          svgEl,
        );
        lastPinchMid = { ...mid };
      }
    }
  }

  function bind(): void {
    const svg = getSvg();
    if (!svg) {
      return;
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointercancel", onPointerUp);
  }

  function unbind(): void {
    const svg = getSvg();
    if (!svg) {
      return;
    }
    svg.removeEventListener("wheel", onWheel);
    svg.removeEventListener("pointerdown", onPointerDown);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", onPointerUp);
    svg.removeEventListener("pointercancel", onPointerUp);
  }

  watch(
    () => options.svgRef.value,
    (svg, prev) => {
      if (prev) {
        unbind();
      }
      if (svg) {
        bind();
      }
    },
  );

  onMounted(() => {
    bind();
  });

  onUnmounted(() => {
    unbind();
  });
}
