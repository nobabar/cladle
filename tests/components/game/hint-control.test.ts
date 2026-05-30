/**
 * Tests for GameHintControl component
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import HintControl from "~/components/game/hint-control.vue";
import { HINT_GUESS_COST } from "~/types/hint";

vi.mock("~/composables/useUiIcons", () => ({
  useUiIcons: () => ({
    hint: "i-mock-hint",
  }),
}));

const UButtonStub = {
  name: "UButton",
  template: "<button v-bind=\"$attrs\" @click=\"$emit('click', $event)\"><slot /></button>",
  emits: ["click"],
};

const UModalStub = {
  name: "UModal",
  props: { open: Boolean },
  emits: ["update:open"],
  template: "<div v-if=\"open\" class=\"u-modal-stub\"><slot name=\"content\" /></div>",
};

const UTooltipStub = {
  name: "UTooltip",
  props: { text: String },
  template: "<div class=\"u-tooltip-stub\" :data-tooltip=\"text\"><slot /></div>",
};

function mountHintControl(props: Record<string, unknown> = {}) {
  return mount(HintControl, {
    props: {
      disabled: false,
      ...props,
    },
    global: {
      stubs: {
        UButton: UButtonStub,
        UModal: UModalStub,
        UTooltip: UTooltipStub,
      },
    },
  });
}

describe("hintControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders icon-only hint button with accessible label and tooltip", () => {
    const wrapper = mountHintControl();
    const btn = wrapper.find("button");
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe("");
    expect(btn.attributes("aria-label")).toContain("Need a hint?");
    const tooltip = wrapper.find(".u-tooltip-stub");
    expect(tooltip.attributes("data-tooltip")).toContain("Need a hint?");
  });

  it("marks button disabled with aria-disabled and tooltip explanation", () => {
    const wrapper = mountHintControl({
      disabled: true,
      disabledReason: "game.hint.disabled.replay",
    });
    const btn = wrapper.find("button");
    expect(btn.attributes("disabled")).toBeDefined();
    expect(btn.attributes("aria-disabled")).toBe("true");
    expect(wrapper.find(".u-tooltip-stub").attributes("data-tooltip"))
      .toContain("Hints aren't available while viewing a past puzzle.");
  });

  it("does not open modal when disabled", async () => {
    const wrapper = mountHintControl({ disabled: true });
    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".u-modal-stub").exists()).toBe(false);
  });

  it("opens confirmation modal when enabled", async () => {
    const wrapper = mountHintControl();
    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Use a hint?");
    expect(wrapper.text()).toContain(`Spend ${HINT_GUESS_COST} guesses`);
  });

  it("cancel closes modal without emitting confirm", async () => {
    const wrapper = mountHintControl();
    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();
    const cancelBtn = wrapper.findAll("button").find(b => b.text() === "Cancel");
    expect(cancelBtn).toBeDefined();
    await cancelBtn!.trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("confirm")).toBeUndefined();
    expect(wrapper.find(".u-modal-stub").exists()).toBe(false);
  });

  it("confirm emits once and closes modal", async () => {
    const wrapper = mountHintControl();
    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();
    const confirmBtn = wrapper.findAll("button").find(b => b.text() === "Reveal clade");
    expect(confirmBtn).toBeDefined();
    await confirmBtn!.trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.find(".u-modal-stub").exists()).toBe(false);
  });

  it("announces success via aria-live region", () => {
    const wrapper = mountHintControl({
      announcement: "Hint: Mammalia revealed on the tree.",
    });
    const live = wrapper.find("[aria-live='polite'].sr-only");
    expect(live.exists()).toBe(true);
    expect(live.text()).toContain("Mammalia");
  });
});
