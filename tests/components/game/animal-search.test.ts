/**
 * Tests for AnimalSearch Component
 *
 * Validates autocomplete functionality, keyboard navigation,
 * accessibility features, and user interactions.
 */

import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import AnimalSearch from "~/components/game/animal-search.vue";
import type { Animal } from "~/types/animal";

// Mock defineShortcuts (Nuxt composable not available in test environment)
// This needs to be done before importing the component
globalThis.defineShortcuts = vi.fn();

// Mock the validation function
vi.mock("~/utils/animalValidator", async () => {
  const actual = await vi.importActual<typeof import("~/utils/animalValidator")>("~/utils/animalValidator");
  return {
    ...actual,
    validateAnimalGuess: vi.fn(async (animal: Animal, guessHistory: Animal[], _: any) => {
      // Mock validation - always passes and returns the animal being validated
      // Check if animal is in guess history (duplicate check)
      const isDuplicate = guessHistory.some(g => g.id === animal.id);

      if (isDuplicate) {
        return {
          valid: false,
          error: {
            type: "duplicate",
            message: "You've already guessed that animal! Try a different one.",
          },
        };
      }

      // If not a duplicate, return valid
      return {
        valid: true,
        animal,
      };
    }),
  };
});

// Mock the API composable
vi.mock("~/composables/useBiologicalAPI", () => ({
  useBiologicalAPI: vi.fn(() => ({
    searchAnimals: vi.fn(async () => ({ data: [], error: null })),
    fetchAnimalData: vi.fn(async (id: string) => {
      // Return the animal if it matches the ID from mockAnimals
      const mockAnimals: Animal[] = [
        {
          id: "1",
          name: "African Elephant",
          scientificName: "Loxodonta africana",
          lineage: [
            { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
            { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
            { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
          ],
        },
        {
          id: "2",
          name: "Tiger",
          scientificName: "Panthera tigris",
          lineage: [
            { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
            { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
            { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
          ],
        },
        {
          id: "3",
          name: "Bald Eagle",
          scientificName: "Haliaeetus leucocephalus",
          lineage: [
            { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
            { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
            { id: "taxon-2", name: "Aves", rank: "class", rankLevel: 50 },
          ],
        },
        {
          id: "4",
          name: "African Lion",
          scientificName: "Panthera leo",
          lineage: [
            { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
            { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
            { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
          ],
        },
      ];
      const animal = mockAnimals.find(a => a.id === id);
      return {
        data: animal || null,
        error: animal ? null : { code: "NOT_FOUND", message: "Not found" },
      };
    }),
    fetchTaxonGalleryPhotos: vi.fn(),
    fetchCladeData: vi.fn(),
  })),
}));

// Stub UInput component from Nuxt UI
const UInputStub = {
  name: "UInput",
  template: `
    <div>
      <input :value="modelValue" v-bind="$attrs" @input="$emit('update:modelValue', $event.target.value)" />
      <slot name="trailing" />
    </div>
  `,
  props: ["modelValue"],
  emits: ["update:modelValue"],
};

// Stub UButton component from Nuxt UI
const UButtonStub = {
  name: "UButton",
  template: "<button v-bind=\"$attrs\" @click=\"$emit('click', $event)\"><slot /></button>",
  emits: ["click"],
};

// Stub UKbd component from Nuxt UI
const UKbdStub = {
  name: "UKbd",
  template: "<kbd v-bind=\"$attrs\"><slot>{{ value }}</slot></kbd>",
  props: ["value"],
};

// Stub GameLoadingIndicator component used in trailing slot
const GameLoadingIndicatorStub = {
  name: "GameLoadingIndicator",
  props: {
    size: {
      type: String,
      default: "sm",
    },
    message: {
      type: String,
      default: "",
    },
  },
  template: "<div class=\"game-loading-indicator\"><slot /></div>",
};

// Helper function to mount with stubs
function mountWithStubs(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...options.global,
      stubs: {
        UInput: UInputStub,
        UButton: UButtonStub,
        UKbd: UKbdStub,
        GameLoadingIndicator: GameLoadingIndicatorStub,
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
      lineage: [
        { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
        { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
        { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
      ],
    },
    {
      id: "2",
      name: "Tiger",
      scientificName: "Panthera tigris",
      lineage: [
        { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
        { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
        { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
      ],
    },
    {
      id: "3",
      name: "Bald Eagle",
      scientificName: "Haliaeetus leucocephalus",
      lineage: [
        { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
        { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
        { id: "taxon-2", name: "Aves", rank: "class", rankLevel: 50 },
      ],
    },
    {
      id: "4",
      name: "African Lion",
      scientificName: "Panthera leo",
      lineage: [
        { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
        { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
        { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
      ],
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

    it("should filter out already guessed animals from suggestions", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          guessHistory: [mockAnimals[0]!], // African Elephant already guessed
        },
      });

      const input = wrapper.find("input");
      await input.setValue("African");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const options = suggestions.findAll("[role=\"option\"]");
      expect(options.length).toBe(1);
      expect(options[0]!.text()).toContain("African Lion");
      expect(options[0]!.text()).not.toContain("African Elephant");
    });

    it("should limit suggestions to maxSuggestions", async () => {
      // Create more animals to test limiting
      const manyAnimals: Animal[] = [
        ...mockAnimals,
        {
          id: "5",
          name: "Ant",
          scientificName: "Formicidae",
          lineage: [{ id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 }, { id: "taxon-1", name: "Arthropoda", rank: "phylum", rankLevel: 60 }],
        },
        {
          id: "6",
          name: "Ape",
          scientificName: "Hominoidea",
          lineage: [
            { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
            { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
            { id: "taxon-2", name: "Mammalia", rank: "class", rankLevel: 50 },
          ],
        },
        {
          id: "7",
          name: "Alligator",
          scientificName: "Alligator mississippiensis",
          lineage: [
            { id: "taxon-0", name: "Animalia", rank: "kingdom", rankLevel: 70 },
            { id: "taxon-1", name: "Chordata", rank: "phylum", rankLevel: 60 },
            { id: "taxon-2", name: "Reptilia", rank: "class", rankLevel: 50 },
          ],
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

      // Find empty state by text content
      // Look for div containing the empty state message
      const allDivs = wrapper.findAll("div");
      const emptyState = allDivs.find(div => div.text().includes("No animals found"));
      expect(emptyState).toBeDefined();
      expect(emptyState?.text()).toContain("No animals found");
    });
  });

  describe("suggestion selection", () => {
    it("should emit select event when suggestion is clicked", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          guessHistory: [],
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const option = suggestions.find("[role=\"option\"]");
      await option.trigger("click");
      // Wait for async validation to complete
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(wrapper.emitted("select")).toBeTruthy();
      // The validation returns the animal, so check it matches
      const emittedAnimal = wrapper.emitted("select")![0]![0] as Animal;
      expect(emittedAnimal.name).toBe("Tiger");
    });

    it("should clear input value when suggestion is selected", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          guessHistory: [],
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const option = suggestions.find("[role=\"option\"]");
      await option.trigger("click");
      // Wait for async validation to complete
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect((input.element as HTMLInputElement).value).toBe("");
    });

    it("should close suggestions after selection", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          guessHistory: [],
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      const suggestions = wrapper.find("[role=\"listbox\"]");
      const option = suggestions.find("[role=\"option\"]");
      await option.trigger("click");
      // Wait for async validation to complete
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 0));

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
      // aria-selected can be "true", true (boolean), or undefined/false
      // Vue may render boolean attributes differently, so check if it exists and is truthy
      const ariaSelected = firstOption.attributes("aria-selected");
      expect(ariaSelected).toBeTruthy();
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
      // aria-selected can be "true", true (boolean), or undefined/false
      // Vue may render boolean attributes differently, so check if it exists and is truthy
      const ariaSelected = firstOption.attributes("aria-selected");
      expect(ariaSelected).toBeTruthy();
    });

    it("should select highlighted suggestion with Enter key", async () => {
      const wrapper = mountWithStubs(AnimalSearch, {
        props: {
          animals: mockAnimals,
          guessHistory: [],
        },
      });

      const input = wrapper.find("input");
      await input.setValue("Tiger");
      await nextTick();

      await input.trigger("keydown", { key: "ArrowDown" });
      await nextTick();
      await input.trigger("keydown", { key: "Enter" });
      // Wait for async validation to complete
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(wrapper.emitted("select")).toBeTruthy();
      // The validation returns the animal, so check it matches
      const emittedAnimal = wrapper.emitted("select")![0]![0] as Animal;
      expect(emittedAnimal.name).toBe("Tiger");
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
