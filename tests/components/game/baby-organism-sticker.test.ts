/**
 * Tests for GameBabyOrganismSticker component
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BabyOrganismSticker from "~/components/game/baby-organism-sticker.vue";

describe("babyOrganismSticker", () => {
  it("shows the name as visible text", () => {
    const wrapper = mount(BabyOrganismSticker, {
      props: {
        emoji: "🐈",
        name: "Cat",
      },
    });

    expect(wrapper.text()).toContain("Cat");
    expect(wrapper.find(".baby-organism-sticker__name").text()).toBe("Cat");
  });

  it("marks the emoji as aria-hidden decorative content", () => {
    const wrapper = mount(BabyOrganismSticker, {
      props: {
        emoji: "🐈",
        name: "Cat",
      },
    });

    const emoji = wrapper.find(".baby-organism-sticker__emoji");
    expect(emoji.exists()).toBe(true);
    expect(emoji.text()).toBe("🐈");
    expect(emoji.attributes("aria-hidden")).toBe("true");
  });

  it("does not set aria-label on the root when the name is visible", () => {
    const wrapper = mount(BabyOrganismSticker, {
      props: {
        emoji: "🦁",
        name: "Lion",
      },
    });

    expect(wrapper.find(".baby-organism-sticker").attributes("aria-label")).toBeUndefined();
  });

  it("applies size modifier classes", () => {
    const wrapper = mount(BabyOrganismSticker, {
      props: {
        emoji: "🐕",
        name: "Dog",
        size: "sm",
      },
    });

    expect(wrapper.find(".baby-organism-sticker--sm").exists()).toBe(true);
  });
});
