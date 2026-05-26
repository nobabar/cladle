import { computed, ref } from "vue";

/** Portal element inside the fullscreen tree; post-it teleports here while fullscreen. */
export const treeFullscreenDetailPortal = ref<HTMLElement | null>(null);

export const isTreeFullscreen = ref(false);

/**
 * Coordinates teleporting the information post-it into the tree while fullscreen is active.
 * @returns The tree fullscreen portal.
 */
export function useTreeFullscreenPortal() {
  const teleportTarget = computed(() =>
    isTreeFullscreen.value && treeFullscreenDetailPortal.value
      ? treeFullscreenDetailPortal.value
      : "body",
  );

  function enterFullscreen(portal: HTMLElement): void {
    treeFullscreenDetailPortal.value = portal;
    isTreeFullscreen.value = true;
  }

  function exitFullscreen(): void {
    isTreeFullscreen.value = false;
    treeFullscreenDetailPortal.value = null;
  }

  return {
    teleportTarget,
    isTreeFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
