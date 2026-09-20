import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import BabyOrganismPicker from "~/components/game/baby-organism-picker.vue";
import type { Animal } from "~/types/animal";

vi.mock("~/composables/useUiIcons", () => ({
  useUiIcons: () => ({
    emojiPicker: "i-mock-emoji-picker",
  }),
}));

const UButtonStub = {
  name: "UButton",
  template: "<button v-bind=\"$attrs\" @click=\"$emit('click', $event)\"><slot /></button>",
  emits: ["click"],
};

const UPopoverStub = {
  name: "UPopover",
  template: `
    <div class="u-popover-stub">
      <slot />
      <div class="u-popover-content-stub">
        <slot name="content" :close="() => {}" />
      </div>
    </div>
  `,
};

const dog: Animal = {
  id: "47144",
  name: "Dog",
  scientificName: "Canis familiaris",
  lineage: [{ id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 }],
};

const cat: Animal = {
  id: "118552",
  name: "Cat",
  scientificName: "Felis catus",
  lineage: [{ id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 }],
};

interface PickerMountProps {
  animals: Animal[];
  stickerByAnimalId?: Record<string, string>;
  guessHistory?: Animal[];
  disabled?: boolean;
}

function mountPicker(props: PickerMountProps) {
  return mount(BabyOrganismPicker, {
    props,
    global: {
      stubs: {
        UButton: UButtonStub,
        UPopover: UPopoverStub,
      },
    },
  });
}

describe("babyOrganismPicker", () => {
  it("renders a trigger button and menu grid with visible names when open", () => {
    const wrapper = mountPicker({
      animals: [dog, cat],
      stickerByAnimalId: { 47144: "🐕", 118552: "🐈" },
    });

    expect(wrapper.find(".baby-organism-picker__trigger").exists()).toBe(true);
    expect(wrapper.findAll(".baby-organism-picker__choice")).toHaveLength(2);
    expect(wrapper.text()).toContain("Dog");
    expect(wrapper.text()).toContain("Cat");
  });

  it("emits select when an unguessed animal is clicked", async () => {
    const wrapper = mountPicker({
      animals: [dog, cat],
      stickerByAnimalId: { 47144: "🐕" },
    });

    await wrapper.findAll(".baby-organism-picker__choice")[0]!.trigger("click");

    expect(wrapper.emitted("select")).toEqual([[dog]]);
  });

  it("disables animals that were already guessed", async () => {
    const wrapper = mountPicker({
      animals: [dog, cat],
      guessHistory: [dog],
    });

    const buttons = wrapper.findAll(".baby-organism-picker__choice");
    expect(buttons[0]!.attributes("disabled")).toBeDefined();
    expect(buttons[1]!.attributes("disabled")).toBeUndefined();

    await buttons[0]!.trigger("click");
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("uses word-based aria-labels, not emoji-only", () => {
    const wrapper = mountPicker({
      animals: [dog],
      stickerByAnimalId: { 47144: "🐕" },
    });

    const button = wrapper.find(".baby-organism-picker__choice");
    expect(button.attributes("aria-label")).toContain("Dog");
    expect(button.attributes("aria-label")).not.toContain("🐕");
    expect(wrapper.find(".baby-organism-picker__emoji").attributes("aria-hidden")).toBe("true");
  });

  it("does not emit when picker is disabled", async () => {
    const wrapper = mountPicker({
      animals: [dog],
      disabled: true,
    });

    await wrapper.find(".baby-organism-picker__choice").trigger("click");
    expect(wrapper.emitted("select")).toBeUndefined();
    expect(wrapper.find(".baby-organism-picker__trigger").attributes("disabled")).toBeDefined();
  });
});
