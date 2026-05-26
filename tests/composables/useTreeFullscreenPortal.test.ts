import { beforeEach, describe, expect, it } from "vitest";
import {
  isTreeFullscreen,
  treeFullscreenDetailPortal,
  useTreeFullscreenPortal,
} from "~/composables/useTreeFullscreenPortal";

describe("useTreeFullscreenPortal", () => {
  beforeEach(() => {
    isTreeFullscreen.value = false;
    treeFullscreenDetailPortal.value = null;
  });

  it("teleports to body when not fullscreen", () => {
    const { teleportTarget } = useTreeFullscreenPortal();
    expect(teleportTarget.value).toBe("body");
  });

  it("teleports to portal element when fullscreen", () => {
    const portal = document.createElement("div");
    const { enterFullscreen, teleportTarget } = useTreeFullscreenPortal();

    enterFullscreen(portal);

    expect(isTreeFullscreen.value).toBe(true);
    expect(teleportTarget.value).toBe(portal);
  });

  it("returns to body after exitFullscreen", () => {
    const portal = document.createElement("div");
    const { enterFullscreen, exitFullscreen, teleportTarget } = useTreeFullscreenPortal();

    enterFullscreen(portal);
    exitFullscreen();

    expect(isTreeFullscreen.value).toBe(false);
    expect(teleportTarget.value).toBe("body");
  });
});
