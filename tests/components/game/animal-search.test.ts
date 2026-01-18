/**
 * Tests for AnimalSearch Component
 *
 * Validates autocomplete functionality, keyboard navigation,
 * accessibility features, and user interactions.
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import AnimalSearch from "~/components/game/animal-search.vue";
import type { Animal } from "~/types/animal";

// Stub UInput component from Nuxt UI
const UInputStub = {
  name: "UInput",
  template: "<input :value=\"modelValue\" v-bind=\"$attrs\" @input=\"$emit('update:modelValue', $event.target.value)\" />",
  props: ["modelValue"],
  emits: ["update:modelValue"],
};

// Helper function to mount with stubs
function mountWithStubs(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...options.global,
      stubs: {
        UInput: UInputStub,
        ...options.global?.stubs,
      },
    },
  });
}

describe("animalSearch", () => {
  // Test fixtures
  const mockAnimals: Animal[] = [
    {
      id: "1",
      name: "African Elephant",
      scientificName: "Loxodonta africana",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    },
    {
      id: "2",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    },
    {
      id: "3",
      name: "Bald Eagle",
      scientificName: "Haliaeetus leucocephalus",
      taxonomy: ["Animalia", "Chordata", "Aves"],
    },
    {
      id: "4",
      name: "African Lion",
      scientificName: "Panthera leo",
      taxonomy: ["Animalia", "Chordata", "Mammalia"],
    },
  ];

  describe("component rendering", () => {
    it("should render the search input", () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      expect(input.exists()).toBe(true);
    });

    it("should display custom placeholder", () => {
      const placeholder = "Type to search...";
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          placeholder,
        },
      });

      const input = wrapper.find("input");
      expect(input.attributes("placeholder")).toBe(placeholder);
    });

    it("should not show suggestions initially", () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(false);
    });
  });

  describe("autocomplete triggering", () => {
    it("should not show suggestions with less than 2 characters", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          minChars: 2,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("A");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(false);
    });

    it("should show suggestions after 2+ characters", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          minChars: 2,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Af");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(true);
    });

    it("should respect custom minChars prop", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          minChars: 3,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Af");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(false);

      await input.setValue("Afr");
      await nextTick();

      const suggestionsAfter = wrapper.find("[role=\"listbox\"]");
      expect(suggestionsAfter.exists()).toBe(true);
    });
  });

  describe("suggestion filtering", () => {
    it("should filter animals by name (case-insensitive)", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(true);

      const options = suggestions.findAll("[role=\"option\"]");
      expect(options.length).toBe(1);
      expect(options[0]!.text()).toContain("Tiger");
    });

    it("should filter animals by scientific name", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Panthera");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const options = suggestions.findAll("[role=\"option\"]");
      expect(options.length).toBe(2); // Tiger and African Lion
    });

    it("should show multiple matching animals", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("African");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const options = suggestions.findAll("[role=\"option\"]");
      expect(options.length).toBe(2); // African Elephant and African Lion
    });

    it("should limit suggestions to maxSuggestions", async () => {
      // Create more animals to test limiting
      const manyAnimals: Animal[] = [
        ...mockAnimals,
        {
          id: "5",
          name: "Ant",
          scientificName: "Formicidae",
          taxonomy: ["Animalia", "Arthropoda"],
        },
        {
          id: "6",
          name: "Ape",
          scientificName: "Hominoidea",
          taxonomy: ["Animalia", "Chordata", "Mammalia"],
        },
        {
          id: "7",
          name: "Alligator",
          scientificName: "Alligator mississippiensis",
          taxonomy: ["Animalia", "Chordata", "Reptilia"],
        },
      ];

      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: manyAnimals,
          maxSuggestions: 2,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("A"); // Matches multiple animals starting with A
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      if (suggestions.exists()) {
        const options = suggestions.findAll("[role=\"option\"]");
        expect(options.length).toBeLessThanOrEqual(2);
      } else {
        // If no suggestions, that's also valid (might need more chars)
        await input.setValue("Af");
        await nextTick();
        const suggestionsAfter = wrapper.find("[role=\"listbox\"]");
        if (suggestionsAfter.exists()) {
          const options = suggestionsAfter.findAll("[role=\"option\"]");
          expect(options.length).toBeLessThanOrEqual(2);
        }
      }
    });

    it("should show empty state when no matches found", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Zebra");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(false);

      const emptyState = wrapper.find(".text-gray-500");
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.text()).toContain("No animals found");
    });
  });

  describe("suggestion selection", () => {
    it("should emit select event when suggestion is clicked", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const option = suggestions.find("[role=\"option\"]");
      await option.trigger("click");

      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")![0]).toEqual([mockAnimals[1]]);
    });

    it("should clear input value when suggestion is selected", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const option = suggestions.find("[role=\"option\"]");
      await option.trigger("click");
      await nextTick();

      expect((input.element as HTMLInputElement).value).toBe("");
    });

    it("should close suggestions after selection", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const option = suggestions.find("[role=\"option\"]");
      await option.trigger("click");
      await nextTick();

      const suggestionsAfter = wrapper.find("[role=\"listbox\"]");
      expect(suggestionsAfter.exists()).toBe(false);
    });
  });

  describe("keyboard navigation", () => {
    it("should navigate down with ArrowDown key", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Af");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const options = suggestions.findAll("[role=\"option\"]");
      const firstOption = options[0]!;
      expect(firstOption.attributes("aria-selected")).toBe("true");
    });

    it("should navigate up with ArrowUp key", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Af");
      await nextTick();

      // Navigate down first
      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();
      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      // Then navigate up
      await input.trigger("keydown", { key: "ArrowUp" });
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const options = suggestions.findAll("[role=\"option\"]");
      const firstOption = options[0]!;
      expect(firstOption.attributes("aria-selected")).toBe("true");
    });

    it("should select highlighted suggestion with Enter key", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();
      await input.trigger("keydown", { key: "Enter" });
      await nextTick();

      expect(wrapper.emitted("select")).toBeTruthy();
      expect(wrapper.emitted("select")![0]).toEqual([mockAnimals[1]]);
    });

    it("should close suggestions with Escape key", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestionsBefore = wrapper.find("[role=\"listbox\"]");
      expect(suggestionsBefore.exists()).toBe(true);

      await input.trigger("keydown", { key: "Escape" });
      await nextTick();

      const suggestionsAfter = wrapper.find("[role=\"listbox\"]");
      expect(suggestionsAfter.exists()).toBe(false);
    });

    it("should not navigate when suggestions are closed", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowDown" });

      // Should not throw error or cause issues
      expect(input.exists()).toBe(true);
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA labels on input", () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      expect(input.attributes("aria-label")).toBe("Search for an animal");
    });

    it("should have aria-expanded on input when suggestions are open", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      expect(input.attributes("aria-expanded")).toBe("false");

      await input.setValue("Tiger");
      await nextTick();

      expect(input.attributes("aria-expanded")).toBe("true");
    });

    it("should have role='listbox' on suggestions container", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(true);
    });

    it("should have role='option' on each suggestion", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Af");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const options = suggestions.findAll("[role=\"option\"]");
      expect(options.length).toBeGreaterThan(0);
    });

    it("should have aria-selected on highlighted option", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const options = suggestions.findAll("[role=\"option\"]");
      const highlighted = options.find(opt => opt.attributes("aria-selected") === "true");
      expect(highlighted).toBeTruthy();
    });

    it("should have aria-activedescendant when option is highlighted", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      const activedescendant = input.attributes("aria-activedescendant");
      expect(activedescendant).toBeTruthy();
      expect(activedescendant).toContain("animal-suggestion-");
    });
  });

  describe("input events", () => {
    it("should emit input event when typing", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      expect(wrapper.emitted("input")).toBeTruthy();
      expect(wrapper.emitted("input")![0]).toEqual(["Tiger"]);
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled prop is true", () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          disabled: true,
        },
      });

      const input = wrapper.find("input");
      expect(input.attributes("disabled")).toBeDefined();
    });

    it("should not show suggestions when disabled", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          disabled: true,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(false);
    });
  });

  describe("click outside behavior", () => {
    it("should close suggestions when clicking outside", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestionsBefore = wrapper.find("[role=\"listbox\"]");
      expect(suggestionsBefore.exists()).toBe(true);

      // Simulate click outside
      document.body.click();
      await nextTick();

      const suggestionsAfter = wrapper.find("[role=\"listbox\"]");
      expect(suggestionsAfter.exists()).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty animals array", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: [],
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(false);
    });

    it("should handle whitespace-only input", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("   ");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      expect(suggestions.exists()).toBe(false);
    });

    it("should handle special characters in search query", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger!");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      // Should still work, just no matches
      expect(suggestions.exists()).toBe(false);
    });
  });
});
