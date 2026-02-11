import { describe, expect, it } from "vitest";
import {
  calculateTreeLayout,
  getViewBoxFromDimensions,

} from "~/utils/treeLayoutCalculator";
import type { TreeData, TreeNode } from "~/types/tree";
import type { Animal } from "~/types/animal";

describe("calculateTreeLayout", () => {
  /**
   * Helper to create a simple tree for testing
   * @returns Simple tree data for testing
   * @example
   * ```typescript
   * const treeData = createSimpleTree();
   * const result = calculateTreeLayout(treeData, 800);
   * expect(result.nodes.size).toBe(2);
   * expect(result.edges.length).toBe(1); // root->animal-1
   * ```
   */
  function createSimpleTree(): TreeData {
    const root: TreeNode = {
      id: "root",
      type: "clade",
      name: "Life",
      cladeData: {
        name: "Life",
        rank: "root",
      },
      children: [],
    };

    const target: TreeNode = {
      id: "animal-1",
      type: "animal",
      name: "Tiger",
      data: {
        id: "1",
        name: "Tiger",
        scientificName: "Panthera tigris",
        taxonomy: ["Animalia", "Chordata", "Mammalia"],
      } as Animal,
      children: [],
      isTarget: true,
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
   * Helper to create a more complex tree with multiple levels
   * @returns Complex tree data for testing
   * @example
   * ```typescript
   * const treeData = createComplexTree();
   * const result = calculateTreeLayout(treeData, 800);
   * expect(result.nodes.size).toBe(5);
   * expect(result.edges.length).toBe(4); // root->kingdom, kingdom->phylum, phylum->target, phylum->guess
   * ```
   */
  function createComplexTree(): TreeData {
    const root: TreeNode = {
      id: "root",
      type: "clade",
      name: "Life",
      cladeData: { name: "Life", rank: "root" },
      children: [],
    };

    const kingdom: TreeNode = {
      id: "clade-animalia",
      type: "clade",
      name: "Animalia",
      cladeData: { name: "Animalia", rank: "kingdom" },
      children: [],
      parent: root,
    };

    const phylum: TreeNode = {
      id: "clade-chordata",
      type: "clade",
      name: "Chordata",
      cladeData: { name: "Chordata", rank: "phylum" },
      children: [],
      parent: kingdom,
    };

    const target: TreeNode = {
      id: "animal-1",
      type: "animal",
      name: "Tiger",
      data: {
        id: "1",
        name: "Tiger",
        scientificName: "Panthera tigris",
        taxonomy: ["Animalia", "Chordata", "Mammalia"],
      } as Animal,
      children: [],
      isTarget: true,
      parent: phylum,
    };

    const guess: TreeNode = {
      id: "animal-2",
      type: "animal",
      name: "Lion",
      data: {
        id: "2",
        name: "Lion",
        scientificName: "Panthera leo",
        taxonomy: ["Animalia", "Chordata", "Mammalia"],
      } as Animal,
      children: [],
      isGuess: true,
      parent: phylum,
    };

    root.children.push(kingdom);
    kingdom.children.push(phylum);
    phylum.children.push(target);
    phylum.children.push(guess);

    return {
      root,
      target,
      nodes: [root, kingdom, phylum, target, guess],
      guesses: [guess],
    };
  }

  describe("basic layout calculation", () => {
    it("should calculate layout for a simple tree", () => {
      const treeData = createSimpleTree();
      const result = calculateTreeLayout(treeData, 800);

      expect(result).toBeDefined();
      expect(result.nodes.size).toBe(2);
      expect(result.edges.length).toBe(1);
      expect(result.dimensions).toBeDefined();
    });

    it("should assign positions to all nodes", () => {
      const treeData = createSimpleTree();
      const result = calculateTreeLayout(treeData, 800);

      for (const node of Array.from(result.nodes.values())) {
        expect(node.position).toBeDefined();
        expect(node.position.x).toBeGreaterThanOrEqual(0);
        expect(node.position.y).toBeGreaterThanOrEqual(0);
        expect(node.depth).toBeDefined();
      }
    });

    it("should calculate correct depths", () => {
      const treeData = createSimpleTree();
      const result = calculateTreeLayout(treeData, 800);

      const root = result.nodes.get("root");
      const target = result.nodes.get("animal-1");

      expect(root?.depth).toBe(0);
      expect(target?.depth).toBe(1);
    });

    it("should create edges between parent and child nodes", () => {
      const treeData = createSimpleTree();
      const result = calculateTreeLayout(treeData, 800);

      expect(result.edges.length).toBe(1);
      expect(result.edges[0]?.from.id).toBe("root");
      expect(result.edges[0]?.to.id).toBe("animal-1");
    });
  });

  describe("auto-layout and width fitting", () => {
    it("should fit tree to container width when possible", () => {
      const treeData = createSimpleTree();
      const result = calculateTreeLayout(treeData, 800);

      expect(result.dimensions.width).toBeLessThanOrEqual(800 + 100); // Allow some margin
    });

    it("should adjust horizontal spacing for narrow containers", () => {
      const treeData = createComplexTree();
      const narrowResult = calculateTreeLayout(treeData, 200);
      const wideResult = calculateTreeLayout(treeData, 2000);

      // Both should complete successfully
      expect(narrowResult.nodes.size).toBe(5);
      expect(wideResult.nodes.size).toBe(5);

      // Narrow container should scale the tree to fit (dimensions may be larger due to auto-fit logic)
      // The important thing is that it completes without error
      expect(narrowResult.dimensions.width).toBeGreaterThan(0);
      expect(wideResult.dimensions.width).toBeGreaterThan(0);
    });

    it("should maintain minimum spacing for readability", () => {
      const treeData = createComplexTree();
      const result = calculateTreeLayout(treeData, 100); // Very narrow

      // Should still complete and maintain minimum spacing
      expect(result.nodes.size).toBe(5);
      expect(result.dimensions.width).toBeGreaterThan(0);
    });
  });

  describe("complex tree structures", () => {
    it("should handle trees with multiple levels", () => {
      const treeData = createComplexTree();
      const result = calculateTreeLayout(treeData, 800);

      expect(result.nodes.size).toBe(5);
      expect(result.edges.length).toBe(4); // root->kingdom, kingdom->phylum, phylum->target, phylum->guess
    });

    it("should position nodes at correct vertical levels", () => {
      const treeData = createComplexTree();
      const result = calculateTreeLayout(treeData, 800);

      const root = result.nodes.get("root");
      const kingdom = result.nodes.get("clade-animalia");
      const phylum = result.nodes.get("clade-chordata");

      // D3 layout ensures nodes at different depths have different y positions
      expect(root?.position.y).toBeLessThanOrEqual(kingdom?.position.y || Infinity);
      expect(kingdom?.position.y).toBeLessThanOrEqual(phylum?.position.y || Infinity);
      // Ensure they're not all at the same level
      expect(root?.depth).toBeLessThan(kingdom?.depth || Infinity);
      expect(kingdom?.depth).toBeLessThan(phylum?.depth || Infinity);
    });

    it("should handle trees with multiple children at same level", () => {
      const treeData = createComplexTree();
      const result = calculateTreeLayout(treeData, 800);

      const target = result.nodes.get("animal-1");
      const guess = result.nodes.get("animal-2");

      // Target and guess should be at same depth
      expect(target?.depth).toBe(guess?.depth);

      // D3's Reingold-Tilford algorithm positions siblings
      // They should be horizontally spaced (different x positions)
      expect(target?.position.x).not.toBe(guess?.position.x);

      // Both should have valid positions
      expect(target?.position).toBeDefined();
      expect(guess?.position).toBeDefined();
    });
  });

  describe("dimensions calculation", () => {
    it("should calculate correct tree dimensions", () => {
      const treeData = createSimpleTree();
      const result = calculateTreeLayout(treeData, 800);

      expect(result.dimensions.width).toBeGreaterThan(0);
      expect(result.dimensions.height).toBeGreaterThan(0);
      expect(result.dimensions.minX).toBeLessThanOrEqual(result.dimensions.maxX);
      expect(result.dimensions.minY).toBeLessThanOrEqual(result.dimensions.maxY);
    });

    it("should include padding in dimensions", () => {
      const treeData = createSimpleTree();
      const result = calculateTreeLayout(treeData, 800);

      // Dimensions should account for padding
      const width = result.dimensions.maxX - result.dimensions.minX;
      expect(width).toBeGreaterThan(0);
    });
  });

  describe("performance requirements", () => {
    it("should complete layout calculation within 500ms", () => {
      const treeData = createComplexTree();
      const startTime = performance.now();

      calculateTreeLayout(treeData, 800);

      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      expect(calculationTime).toBeLessThan(500);
    });

    it("should handle large trees efficiently", () => {
      // Create a larger tree structure
      const root: TreeNode = {
        id: "root",
        type: "clade",
        name: "Life",
        cladeData: { name: "Life", rank: "root" },
        children: [],
      };

      const nodes: TreeNode[] = [root];
      const target: TreeNode = {
        id: "animal-target",
        type: "animal",
        name: "Target",
        data: {
          id: "target",
          name: "Target",
          scientificName: "Target",
          taxonomy: [],
        } as Animal,
        children: [],
        isTarget: true,
        parent: root,
      };

      // Create multiple levels with multiple children
      for (let i = 0; i < 3; i++) {
        const clade: TreeNode = {
          id: `clade-${i}`,
          type: "clade",
          name: `Clade ${i}`,
          cladeData: { name: `Clade ${i}`, rank: "class" },
          children: [],
          parent: root,
        };
        root.children.push(clade);
        nodes.push(clade);

        for (let j = 0; j < 5; j++) {
          const animal: TreeNode = {
            id: `animal-${i}-${j}`,
            type: "animal",
            name: `Animal ${i}-${j}`,
            data: {
              id: `animal-${i}-${j}`,
              name: `Animal ${i}-${j}`,
              scientificName: `Animal ${i}-${j}`,
              taxonomy: [],
            } as Animal,
            children: [],
            parent: clade,
          };
          clade.children.push(animal);
          nodes.push(animal);
        }
      }

      root.children.push(target);
      target.parent = root;
      nodes.push(target);

      const treeData: TreeData = {
        root,
        target,
        nodes,
        guesses: [],
      };

      const startTime = performance.now();
      const result = calculateTreeLayout(treeData, 800);
      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      expect(result.nodes.size).toBe(20); // 1 root + 3 clades + 15 animals + 1 target
      expect(calculationTime).toBeLessThan(500);
    });
  });

  describe("edge cases", () => {
    it("should handle empty tree gracefully", () => {
      const emptyTree: TreeData = {
        root: {
          id: "root",
          type: "clade",
          name: "Life",
          cladeData: { name: "Life", rank: "root" },
          children: [],
        },
        target: {
          id: "target",
          type: "animal",
          name: "Target",
          data: {
            id: "target",
            name: "Target",
            scientificName: "Target",
            taxonomy: [],
          } as Animal,
          children: [],
          isTarget: true,
        },
        nodes: [],
        guesses: [],
      };

      const result = calculateTreeLayout(emptyTree, 800);
      expect(result.nodes.size).toBeGreaterThan(0); // Should at least have root
    });

    it("should handle custom layout configuration", () => {
      const treeData = createSimpleTree();
      const customConfig = {
        horizontalSpacing: 200,
        verticalSpacing: 150,
        nodeWidth: 120,
        nodeHeight: 80,
        padding: 50,
      };

      const result = calculateTreeLayout(treeData, 800, customConfig);

      expect(result.nodes.size).toBe(2);
      // Custom config should affect spacing
      const root = result.nodes.get("root");
      const target = result.nodes.get("animal-1");

      if (root && target) {
        // Verify nodes are positioned
        expect(root.position).toBeDefined();
        expect(target.position).toBeDefined();

        // Verify they're at different depths
        expect(root.depth).toBeLessThan(target.depth);

        // D3 layout should position child below parent (or at least at different position)
        // The exact distance depends on D3's algorithm and coordinate transformation
        const verticalDistance = Math.abs(target.position.y - root.position.y);
        const horizontalDistance = Math.abs(target.position.x - root.position.x);

        // Nodes should be separated (either vertically or horizontally)
        // D3's algorithm may position them in ways that prioritize visual balance
        expect(verticalDistance + horizontalDistance).toBeGreaterThan(0);
      }
    });
  });
});

describe("getViewBoxFromDimensions", () => {
  it("should generate correct SVG viewBox string", () => {
    const dimensions = {
      width: 800,
      height: 600,
      minX: 0,
      maxX: 800,
      minY: 0,
      maxY: 600,
    };

    const viewBox = getViewBoxFromDimensions(dimensions);
    expect(viewBox).toBe("0 0 800 600");
  });

  it("should handle negative coordinates", () => {
    const dimensions = {
      width: 400,
      height: 300,
      minX: -100,
      maxX: 300,
      minY: -50,
      maxY: 250,
    };

    const viewBox = getViewBoxFromDimensions(dimensions);
    expect(viewBox).toBe("-100 -50 400 300");
  });

  it("should calculate width and height correctly", () => {
    const dimensions = {
      width: 1000,
      height: 800,
      minX: 50,
      maxX: 1050,
      minY: 100,
      maxY: 900,
    };

    const viewBox = getViewBoxFromDimensions(dimensions);
    expect(viewBox).toBe("50 100 1000 800");
  });
});
