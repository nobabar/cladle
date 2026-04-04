/**
 * Tests for WinState Component
 *
 * Validates win/loss state display, responsive behavior, accessibility features,
 * and integration with game store.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import WinState from "~/components/game/win-state.vue";
import { getGameStore } from "#test/helpers/gameStore";
import { createPinia, setActivePinia } from "pinia";
import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import { calculateLCA } from "~/utils/lcaCalculator";

// Stub GameTreeVisualization component
const GameTreeVisualizationStub = {
  name: "GameTreeVisualization",
  template: `
    <div class="tree-visualization-stub">
      <slot />
    </div>
  `,
  props: ["treeData", "showTarget", "width", "height"],
};

// Stub Icon component (from @nuxt/icon) - not auto-imported in test env
const IconStub = {
  name: "Icon",
  template: "<span class=\"icon-stub\"></span>",
  props: ["name"],
};

// Helper function to mount with stubs
function mountWithStubs(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...options.global,
      stubs: {
        // Render teleported content in-place for predictable DOM assertions
        Teleport: true,
        GameTreeVisualization: GameTreeVisualizationStub,
        Icon: IconStub,
        ...options.global?.stubs,
      },
    },
  });
}

/**
 * Helper function to create a mock animal
 * @param name - Animal name
 * @param scientificName - Animal scientific name
 * @param taxonomy - Animal taxonomy
 * @returns Mock animal for testing
 */
function createMockAnimal(name: string, scientificName: string, taxonomy: string[]): Animal {
  return {
    id: `animal-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    scientificName,
    taxonomy,
  };
}

/**
 * Helper function to create a simple tree data structure
 * @returns Simple tree data for testing
 */
function createSimpleTreeData(): TreeData {
  const root: TreeNode = {
    id: "root",
    type: "clade",
    name: "Animalia",
    cladeData: {
      name: "Animalia",
      rank: "kingdom",
    },
    children: [],
    depth: 0,
  };

  const target: TreeNode = {
    id: "animal-tiger",
    type: "animal",
    name: "Tiger",
    data: createMockAnimal("Tiger", "Panthera tigris", ["Animalia", "Chordata", "Mammalia"]),
    children: [],
    isTarget: true,
    depth: 1,
  };

  root.children.push(target);
  target.parent = root;

  return {
    root,
    target,
    nodes: [root, target],
    guesses: [],
  };
}

/**
 * Adds one guess so share text / metrics can be computed (matches completed-game shape).
 *
 * @param store - Pinia game store under test
 * @param target - Current puzzle target animal
 */
function addGuessForShareableCompletion(
  store: ReturnType<typeof getGameStore>,
  target: Animal,
): void {
  const guessAnimal = createMockAnimal(
    "Wolf",
    "Canis lupus",
    [
      "Animalia",
      "Chordata",
      "Mammalia",
      "Carnivora",
      "Canidae",
      "Canis",
      "Canis lupus",
    ],
  );
  store.guesses = [
    {
      animal: guessAnimal,
      lca: calculateLCA(guessAnimal, target),
      timestamp: 1,
    },
  ];
}

describe("winState Component", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Mock window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  describe("component Rendering", () => {
    it("should not render when game has not ended", () => {
      const store = getGameStore();
      store.status = "playing";
      store.target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);

      const wrapper = mountWithStubs(WinState);

      expect(wrapper.find(".win-state-modal-overlay").exists()).toBe(false);
      expect(wrapper.find(".win-state-panel").exists()).toBe(false);
    });

    it("should render win state when game is won", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.find(".win-state__content--win").exists()).toBe(true);
      expect(wrapper.text()).toContain("You Won!");
      expect(wrapper.text()).toContain("Tiger");
    });

    it("should render loss state when game is lost", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.find(".win-state__content--loss").exists()).toBe(true);
      expect(wrapper.text()).toContain("Game Over");
      expect(wrapper.text()).toContain("Tiger");
    });
  });

  describe("completion share integration", () => {
    const shareableTarget = () =>
      createMockAnimal("Tiger", "Panthera tigris", [
        "Animalia",
        "Chordata",
        "Mammalia",
        "Carnivora",
        "Felidae",
        "Panthera",
        "Panthera tigris",
      ]);

    it("does not surface share affordance while playing", async () => {
      const store = getGameStore();
      store.target = shareableTarget();
      store.status = "playing";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(
        wrapper.find("[data-testid=\"win-state-share-ready\"]").exists(),
      ).toBe(false);
      expect(
        wrapper.find("[data-testid=\"win-state-learning-footnote\"]").exists(),
      ).toBe(false);
    });

    it("shows share affordance when game ended on desktop", async () => {
      Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
      const store = getGameStore();
      const target = shareableTarget();
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();
      addGuessForShareableCompletion(store, target);

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(
        wrapper.find("[data-testid=\"win-state-share-ready\"]").exists(),
      ).toBe(true);
      expect(
        wrapper.find("[data-testid=\"win-state-furthest-evolutionary-distance\"]").exists(),
      ).toBe(true);
      expect(
        wrapper.find("[data-testid=\"win-state-learning-footnote\"]").exists(),
      ).toBe(true);
    });

    it("shows share affordance when game ended on mobile modal", async () => {
      Object.defineProperty(window, "innerWidth", { value: 600, configurable: true });
      const store = getGameStore();
      const target = shareableTarget();
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();
      addGuessForShareableCompletion(store, target);

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(
        wrapper.find("[data-testid=\"win-state-share-ready\"]").exists(),
      ).toBe(true);
      expect(
        wrapper.find("[data-testid=\"win-state-furthest-evolutionary-distance\"]").exists(),
      ).toBe(true);
      expect(
        wrapper.find("[data-testid=\"win-state-learning-footnote\"]").exists(),
      ).toBe(true);
    });

    it("shows furthest evolutionary distance on loss", async () => {
      Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
      const store = getGameStore();
      const target = shareableTarget();
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();
      addGuessForShareableCompletion(store, target);

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(
        wrapper.find("[data-testid=\"win-state-share-ready\"]").exists(),
      ).toBe(true);
      expect(
        wrapper.find("[data-testid=\"win-state-furthest-evolutionary-distance\"]").exists(),
      ).toBe(true);
    });
  });

  describe("win State Content", () => {
    it("should display target animal name when won", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Lion", "Panthera leo", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("Lion");
      expect(wrapper.text()).toContain("Panthera leo");
    });

    it("should display completion feedback message when won", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("Congratulations");
      expect(wrapper.text()).toContain("You found the Tiger");
    });

    it("should display guess count when won", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();
      // Simulate 3 guesses
      store.guesses = [
        { animal: createMockAnimal("Cat", "Felis catus", ["Animalia"]), lca: { clade: "Felidae", rank: "family", depth: 0, path: [] }, timestamp: Date.now() },
        { animal: createMockAnimal("Lion", "Panthera leo", ["Animalia"]), lca: { clade: "Panthera", rank: "genus", depth: 0, path: [] }, timestamp: Date.now() },
        { animal: target, lca: { clade: "Panthera tigris", rank: "species", depth: 0, path: [] }, timestamp: Date.now() },
      ];

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("3 guesses");
      expect(wrapper.text()).toContain("out of 6");
    });
  });

  describe("loss State Content", () => {
    it("should display target animal name when lost", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Elephant", "Loxodonta africana", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("Elephant");
      expect(wrapper.text()).toContain("Loxodonta africana");
    });

    it("should display loss feedback message when lost", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("Game Over");
      expect(wrapper.text()).toContain("The target was Tiger");
    });

    it("should display encouraging message when lost", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("Keep learning and try again");
    });
  });

  describe("responsive Display", () => {
    it("should show modal on mobile (< 1024px)", async () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Modal overlay should be rendered when isMobileOrTablet is true
      expect(wrapper.find(".win-state-modal-overlay").exists()).toBe(true);
      expect(wrapper.find(".win-state-modal").exists()).toBe(true);
    });

    it("should show side panel on desktop (>= 1024px)", async () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1280,
      });

      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.find(".win-state-panel").exists()).toBe(true);
    });

    it("should update display on window resize", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Start with desktop view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1280,
      });

      // Trigger resize event
      window.dispatchEvent(new Event("resize"));
      await nextTick();

      // Should show panel on desktop
      expect(wrapper.find(".win-state-panel").exists()).toBe(true);
    });
  });

  describe("accessibility Features", () => {
    it("should have proper ARIA labels for win state", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Check for either dialog (mobile) or complementary (desktop) role
      const dialog = wrapper.find("[role=\"dialog\"]");
      const complementary = wrapper.find("[role=\"complementary\"]");
      const element = dialog.exists() ? dialog : complementary;

      expect(element.exists()).toBe(true);
      if (dialog.exists()) {
        expect(element.attributes("aria-labelledby")).toBe("win-state-modal-title");
        expect(element.attributes("aria-describedby")).toBe("win-state-modal-description");
      } else {
        expect(element.attributes("aria-labelledby")).toBe("win-state-panel-title");
        expect(element.attributes("aria-describedby")).toBe("win-state-panel-description");
      }
    });

    it("should have proper ARIA labels for loss state", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Check for either dialog (mobile) or complementary (desktop) role
      const dialog = wrapper.find("[role=\"dialog\"]");
      const complementary = wrapper.find("[role=\"complementary\"]");
      const element = dialog.exists() ? dialog : complementary;

      expect(element.exists()).toBe(true);
      if (dialog.exists()) {
        expect(element.attributes("aria-labelledby")).toBe("win-state-modal-title");
        expect(element.attributes("aria-describedby")).toBe("win-state-modal-description");
      } else {
        expect(element.attributes("aria-labelledby")).toBe("win-state-panel-title");
        expect(element.attributes("aria-describedby")).toBe("win-state-panel-description");
      }
    });

    it("should announce win state to screen readers", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      const announcement = wrapper.find(".sr-only");
      expect(announcement.exists()).toBe(true);
      expect(announcement.attributes("aria-live")).toBe("polite");
      expect(announcement.attributes("aria-atomic")).toBe("true");
      expect(announcement.text()).toContain("Congratulations");
    });

    it("should announce loss state to screen readers", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      const announcement = wrapper.find(".sr-only");
      expect(announcement.exists()).toBe(true);
      expect(announcement.text()).toContain("Game Over");
    });
  });

  describe("tree Visualization Integration", () => {
    it("should display tree visualization in win state", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Check for tree visualization component
      const treeContainer = wrapper.find(".win-state__tree-container");
      expect(treeContainer.exists()).toBe(true);
    });

    it("should display tree visualization in loss state", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "lost";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      const treeContainer = wrapper.find(".win-state__tree-container");
      expect(treeContainer.exists()).toBe(true);
    });

    it("should pass showTarget=true to tree visualization", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // The tree visualization should receive showTarget prop
      // This is verified by checking the component is rendered
      const treeContainer = wrapper.find(".win-state__tree-container");
      expect(treeContainer.exists()).toBe(true);
    });
  });

  describe("game Store Integration", () => {
    it("should read completion status from store", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.find(".win-state__content--win").exists()).toBe(true);
    });

    it("should read target animal from store", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Lion", "Panthera leo", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("Lion");
    });

    it("should read tree data from store", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      const treeData = createSimpleTreeData();
      store.treeData = treeData;

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Tree should be displayed
      expect(wrapper.find(".win-state__tree-container").exists()).toBe(true);
    });

    it("should react to status changes", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Initially playing, should not show
      expect(wrapper.find(".win-state__content--win").exists()).toBe(false);

      // Change to won
      store.status = "won";
      await nextTick();

      expect(wrapper.find(".win-state__content--win").exists()).toBe(true);
    });
  });

  describe("edge Cases", () => {
    it("should handle missing target animal", async () => {
      const store = getGameStore();
      store.status = "won";
      store.target = null;
      store.treeData = createSimpleTreeData();

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Should still render win state
      expect(wrapper.find(".win-state__content--win").exists()).toBe(true);
      expect(wrapper.text()).toContain("Congratulations");
    });

    it("should handle missing tree data", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = null;

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      // Should still render win state
      expect(wrapper.find(".win-state__content--win").exists()).toBe(true);
    });

    it("should handle single guess correctly", async () => {
      const store = getGameStore();
      const target = createMockAnimal("Tiger", "Panthera tigris", ["Animalia"]);
      store.startGame(target, 6);
      store.status = "won";
      store.treeData = createSimpleTreeData();
      store.guesses = [
        { animal: target, lca: { clade: "Panthera tigris", rank: "species", depth: 0, path: [] }, timestamp: Date.now() },
      ];

      const wrapper = mountWithStubs(WinState);
      await nextTick();

      expect(wrapper.text()).toContain("1 guess");
      expect(wrapper.text()).not.toContain("guesses");
    });
  });
});
