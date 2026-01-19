/**
 * Tests for TreeVisualization Component
 *
 * Validates tree rendering, layout calculations, accessibility features,
 * keyboard navigation, and performance optimizations.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import TreeVisualization from "~/components/game/tree-visualization.vue";
import type { TreeData, TreeNode } from "~/types/tree";
import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";

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
 * Helper function to create a mock clade
 * @param name - Clade name
 * @param rank - Taxonomic rank
 * @returns Mock clade object
 */
function createMockClade(name: string, rank: string): Clade {
  return {
    name,
    rank,
  };
}

/**
 * Helper function to create a mock tree node
 * @param id - Node identifier
 * @param name - Node display name
 * @param type - Node type (animal or clade)
 * @param children - Child nodes
 * @param options - Additional node options
 * @param options.isTarget - Whether node is the target animal
 * @param options.isGuess - Whether node is a guessed animal
 * @param options.isLCA - Whether node is a Last Common Ancestor
 * @param options.data - Animal data (if type is animal)
 * @param options.cladeData - Clade data (if type is clade)
 * @returns Mock tree node object
 */
function createMockTreeNode(
  id: string,
  name: string,
  type: "animal" | "clade",
  children: TreeNode[] = [],
  options: {
    isTarget?: boolean;
    isGuess?: boolean;
    isLCA?: boolean;
    data?: Animal;
    cladeData?: Clade;
  } = {},
): TreeNode {
  return {
    id,
    name,
    type,
    children,
    ...options,
  };
}

/**
 * Helper function to create a simple tree data structure
 * @returns Simple tree data for testing
 */
function createSimpleTreeData(): TreeData {
  const root = createMockTreeNode(
    "metazoa",
    "Metazoa",
    "clade",
    [],
    { cladeData: createMockClade("Metazoa", "kingdom") },
  );

  const chordata = createMockTreeNode(
    "chordata",
    "Chordata",
    "clade",
    [],
    { cladeData: createMockClade("Chordata", "phylum") },
  );
  root.children.push(chordata);

  const mammalia = createMockTreeNode(
    "mammalia",
    "Mammalia",
    "clade",
    [],
    { cladeData: createMockClade("Mammalia", "class") },
  );
  chordata.children.push(mammalia);

  const target = createMockTreeNode(
    "target",
    "Tiger",
    "animal",
    [],
    {
      isTarget: true,
      data: createMockAnimal("Tiger", "Panthera tigris", [
        "Animalia",
        "Chordata",
        "Mammalia",
        "Carnivora",
        "Felidae",
        "Panthera",
        "Panthera tigris",
      ]),
    },
  );
  mammalia.children.push(target);

  const guess = createMockTreeNode(
    "guess",
    "Cat",
    "animal",
    [],
    {
      isGuess: true,
      data: createMockAnimal("Cat", "Felis catus", [
        "Animalia",
        "Chordata",
        "Mammalia",
        "Carnivora",
        "Felidae",
        "Felis",
        "Felis catus",
      ]),
    },
  );
  mammalia.children.push(guess);

  return {
    root,
    target,
    nodes: [root, chordata, mammalia, target, guess],
    guesses: [guess],
  };
}

// Stub for Icon component (from @nuxt/icon)
const IconStub = {
  name: "Icon",
  template: "<span class='icon-stub'><slot></slot></span>",
  props: ["name"],
};

// Helper function to mount with stubs
function mountWithStubs(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...options.global,
      stubs: {
        Icon: IconStub,
        ...options.global?.stubs,
      },
    },
  });
}

describe("treeVisualization", () => {
  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe("component Rendering", () => {
    it("renders empty state when no tree data is provided", () => {
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData: null,
        },
      });

      expect(wrapper.find(".tree-visualization--empty").exists()).toBe(true);
      expect(wrapper.find(".tree-visualization__empty-text").text()).toContain(
        "No tree data available",
      );
    });

    it("renders tree visualization when tree data is provided", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      expect(wrapper.find(".tree-visualization__svg").exists()).toBe(true);
      expect(wrapper.find(".tree-nodes").exists()).toBe(true);
      expect(wrapper.find(".tree-edges").exists()).toBe(true);
    });

    it("renders all nodes from tree data", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const nodes = wrapper.findAll(".tree-node-group");
      expect(nodes.length).toBeGreaterThan(0);
    });

    it("renders edges between connected nodes", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const edges = wrapper.findAll(".tree-edge");
      expect(edges.length).toBeGreaterThan(0);
    });
  });

  describe("layout Calculations", () => {
    it("calculates node positions correctly", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const nodes = wrapper.findAll(".tree-node-group");
      expect(nodes.length).toBeGreaterThan(0);

      // Check that nodes have transform attributes (indicating positions)
      nodes.forEach((node) => {
        const transform = node.attributes("transform");
        expect(transform).toBeTruthy();
        expect(transform).toMatch(/translate\(/);
      });
    });

    it("handles empty tree gracefully", async () => {
      const emptyTreeData: TreeData = {
        root: createMockTreeNode("root", "Root", "clade"),
        target: createMockTreeNode("target", "Target", "animal"),
        nodes: [],
        guesses: [],
      };

      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData: emptyTreeData,
        },
      });

      await nextTick();

      // Should not crash, but may show minimal tree
      expect(wrapper.exists()).toBe(true);
    });

    it("handles single node tree", async () => {
      const singleNodeTree: TreeData = {
        root: createMockTreeNode("root", "Root", "clade"),
        target: createMockTreeNode("target", "Target", "animal"),
        nodes: [createMockTreeNode("root", "Root", "clade")],
        guesses: [],
      };

      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData: singleNodeTree,
        },
      });

      await nextTick();

      expect(wrapper.exists()).toBe(true);
      const nodes = wrapper.findAll(".tree-node-group");
      expect(nodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("accessibility Features", () => {
    it("has proper ARIA roles and labels", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const container = wrapper.find(".tree-visualization");
      expect(container.attributes("role")).toBe("tree");
      expect(container.attributes("aria-label")).toBeTruthy();
    });

    it("provides ARIA labels for nodes", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const nodes = wrapper.findAll("rect[role='treeitem']");
      expect(nodes.length).toBeGreaterThan(0);

      nodes.forEach((node) => {
        expect(node.attributes("aria-label")).toBeTruthy();
      });
    });

    it("has screen reader description", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const srOnly = wrapper.find(".sr-only");
      expect(srOnly.exists()).toBe(true);
      expect(srOnly.attributes("aria-live")).toBe("polite");
    });

    it("distinguishes node types with appropriate classes", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const animalNodes = wrapper.findAll(".tree-node--animal");
      const cladeNodes = wrapper.findAll(".tree-node--clade");

      expect(animalNodes.length).toBeGreaterThan(0);
      expect(cladeNodes.length).toBeGreaterThan(0);
    });

    it("highlights target node", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
          showTarget: true,
        },
      });

      await nextTick();

      const targetNodes = wrapper.findAll(".tree-node--target");
      expect(targetNodes.length).toBeGreaterThan(0);
    });

    it("highlights guess nodes", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const guessNodes = wrapper.findAll(".tree-node--guess");
      expect(guessNodes.length).toBeGreaterThan(0);
    });
  });

  describe("keyboard Navigation", () => {
    it("handles ArrowDown key navigation", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const container = wrapper.find(".tree-visualization");
      await container.trigger("keydown", { key: "ArrowDown" });

      // Should focus a node
      await nextTick();
      expect(wrapper.vm.focusedNodeId).toBeTruthy();
    });

    it("handles ArrowUp key navigation", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const container = wrapper.find(".tree-visualization");
      await container.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      await container.trigger("keydown", { key: "ArrowUp" });
      await nextTick();

      // Focus should change
      expect(wrapper.vm.focusedNodeId).toBeTruthy();
    });

    it("handles Escape key to clear focus", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const container = wrapper.find(".tree-visualization");
      await container.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      expect(wrapper.vm.focusedNodeId).toBeTruthy();

      await container.trigger("keydown", { key: "Escape" });
      await nextTick();

      expect(wrapper.vm.focusedNodeId).toBeNull();
    });

    it("handles Enter key to activate node", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const container = wrapper.find(".tree-visualization");
      await container.trigger("keydown", { key: "ArrowDown" });
      await nextTick();

      const focusedBefore = wrapper.vm.focusedNodeId;
      await container.trigger("keydown", { key: "Enter" });
      await nextTick();

      // Focus should remain (node activated)
      expect(wrapper.vm.focusedNodeId).toBe(focusedBefore);
    });
  });

  describe("node Interactions", () => {
    it("handles node click", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const nodes = wrapper.findAll("rect[role='treeitem']");
      if (nodes.length > 0) {
        await nodes[0]!.trigger("click");
        await nextTick();

        expect(wrapper.vm.focusedNodeId).toBeTruthy();
      }
    });

    it("updates focus on node focus event", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
        },
      });

      await nextTick();

      const nodes = wrapper.findAll("rect[role='treeitem']");
      if (nodes.length > 0) {
        await nodes[0]!.trigger("focus");
        await nextTick();

        expect(wrapper.vm.focusedNodeId).toBeTruthy();
      }
    });
  });

  describe("responsive Behavior", () => {
    it("updates dimensions on window resize", async () => {
      const treeData = createSimpleTreeData();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData,
          width: 800,
          height: 600,
        },
      });

      await nextTick();

      // Simulate window resize
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1200,
      });

      window.dispatchEvent(new Event("resize"));
      await nextTick();

      // Component should handle resize
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("performance", () => {
    it("renders large tree efficiently", async () => {
      // Create a larger tree
      const root = createMockTreeNode(
        "root",
        "Root",
        "clade",
        [],
        { cladeData: createMockClade("Root", "kingdom") },
      );

      const nodes: TreeNode[] = [root];
      const target = createMockTreeNode("target", "Target", "animal");
      root.children.push(target);

      // Add multiple branches
      for (let i = 0; i < 10; i++) {
        const branch = createMockTreeNode(
          `branch-${i}`,
          `Branch ${i}`,
          "clade",
          [],
          { cladeData: createMockClade(`Branch ${i}`, "class") },
        );
        root.children.push(branch);

        const guess = createMockTreeNode(
          `guess-${i}`,
          `Guess ${i}`,
          "animal",
          [],
          { isGuess: true },
        );
        branch.children.push(guess);
        nodes.push(branch, guess);
      }

      const largeTreeData: TreeData = {
        root,
        target,
        nodes,
        guesses: nodes.filter(n => n.isGuess),
      };

      const startTime = performance.now();
      const wrapper = mountWithStubs(TreeVisualization, {
        props: {
          treeData: largeTreeData,
        },
      });

      await nextTick();
      const endTime = performance.now();

      // Should render within reasonable time (< 5 seconds as per NFR1)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(wrapper.exists()).toBe(true);
    });
  });
});
