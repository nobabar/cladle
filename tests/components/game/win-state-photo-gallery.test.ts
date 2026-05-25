/**
 * Tests for WinStatePhotoGallery polaroid strip
 */

import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import WinStatePhotoGallery from "~/components/game/win-state-photo-gallery.vue";
import type { TaxonGalleryPhoto } from "~/types/taxonGallery";

const mockPhotos: TaxonGalleryPhoto[] = [
  {
    id: "1",
    mediumUrl: "https://example.com/1m.jpg",
    largeUrl: "https://example.com/1l.jpg",
    attribution: "(c) Alice",
  },
  {
    id: "2",
    mediumUrl: "https://example.com/2m.jpg",
    largeUrl: "https://example.com/2l.jpg",
    attribution: "(c) Bob",
  },
  { id: "3", mediumUrl: "https://example.com/3m.jpg", largeUrl: "https://example.com/3l.jpg" },
  { id: "4", mediumUrl: "https://example.com/4m.jpg", largeUrl: "https://example.com/4l.jpg" },
  { id: "5", mediumUrl: "https://example.com/5m.jpg", largeUrl: "https://example.com/5l.jpg" },
];

vi.mock("~/composables/useBiologicalAPI", () => ({
  useBiologicalAPI: () => ({
    fetchTaxonGalleryPhotos: vi.fn(async () => ({
      data: mockPhotos,
      error: null,
    })),
  }),
}));

const IconStub = {
  name: "Icon",
  template: "<span />",
  props: ["name"],
};

function mountGallery(open = true) {
  return mount(WinStatePhotoGallery, {
    props: {
      open,
      taxonId: "42",
      taxonName: "Tiger",
      fallbackImageUrl: "https://example.com/fallback.jpg",
    },
    global: {
      stubs: {
        Teleport: true,
        Icon: IconStub,
      },
    },
  });
}

describe("winStatePhotoGallery", () => {
  it("renders full-page overlay instead of modal when open", async () => {
    const wrapper = mountGallery();
    await nextTick();
    await nextTick();

    expect(wrapper.findComponent({ name: "UModal" }).exists()).toBe(false);
    expect(wrapper.find("[data-testid=\"win-state-gallery-overlay\"]").exists()).toBe(true);
    expect(wrapper.find(".win-state-gallery__nav").exists()).toBe(false);
    expect(wrapper.findAll("[data-testid=\"win-state-gallery-polaroid\"]")).toHaveLength(5);
  });

  it("does not render overlay when closed", async () => {
    const wrapper = mountGallery(false);
    await nextTick();

    expect(wrapper.find("[data-testid=\"win-state-gallery-overlay\"]").exists()).toBe(false);
  });

  it("selects the middle (third) polaroid by default when five photos load", async () => {
    const wrapper = mountGallery();
    await nextTick();
    await nextTick();

    const cards = wrapper.findAll("[data-testid=\"win-state-gallery-polaroid\"]");
    expect(cards[2]?.classes()).toContain("win-state-gallery__polaroid--focus");
    expect(cards[2]?.attributes("aria-current")).toBe("true");
  });

  it("closes when clicking the overlay outside polaroids", async () => {
    const wrapper = mountGallery();
    await nextTick();
    await nextTick();

    await wrapper.find("[data-testid=\"win-state-gallery-overlay\"]").trigger("click");
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]);
  });

  it("has no title bar or close button chrome", async () => {
    const wrapper = mountGallery();
    await nextTick();
    await nextTick();

    expect(wrapper.find(".win-state-gallery__title").exists()).toBe(false);
    expect(wrapper.find(".win-state-gallery__close").exists()).toBe(false);
    expect(wrapper.find(".win-state-gallery__close-text").exists()).toBe(false);
  });

  it("focuses a card when another polaroid is clicked", async () => {
    const wrapper = mountGallery();
    await nextTick();
    await nextTick();

    const cards = wrapper.findAll("[data-testid=\"win-state-gallery-polaroid\"]");
    expect(cards[2]?.classes()).toContain("win-state-gallery__polaroid--focus");

    await cards[0]?.trigger("click");
    await nextTick();

    expect(cards[2]?.classes()).not.toContain("win-state-gallery__polaroid--focus");
    expect(cards[0]?.classes()).toContain("win-state-gallery__polaroid--focus");
    expect(cards[0]?.attributes("aria-current")).toBe("true");
  });

  it("shows attribution inside each polaroid frame when present", async () => {
    const wrapper = mountGallery();
    await nextTick();
    await nextTick();

    const captions = wrapper.findAll(".win-state-gallery__polaroid-caption");
    expect(captions.length).toBeGreaterThanOrEqual(2);
    expect(captions[0]?.text()).toContain("Alice");
    expect(captions[0]?.element.parentElement?.classList.contains("win-state-gallery__polaroid-frame")).toBe(true);
  });
});
