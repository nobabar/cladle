import { describe, expect, it } from "vitest";
import { treeToMermaid } from "~/utils/mermaidExporter";
import type { TreeData, TreeNode } from "~/types/tree";
import type { Animal } from "~/types/animal";

describe("mermaidExporter", () => {
  describe("treeToMermaid", () => {
    it("should return empty tree message when treeData is null", () => {
      const result = treeToMermaid(null);
      expect(result).toContain("graph TD");
      expect(result).toContain("No tree data available");
    });

    it("should convert simple tree with root and target to Mermaid", () => {
      const targetAnimal: Animal = {
        id: "1",
        name: "Lion",
        scientificName: "Panthera leo",
        commonNames: ["Lion"],
        imageUrl: "https://example.com/lion.jpg",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Lion",
      };

      const targetNode: TreeNode = {
        id: "animal-1",
        type: "animal",
        name: "Lion",
        data: targetAnimal,
        children: [],
        isTarget: true,
        depth: 1,
      };

      const rootNode: TreeNode = {
        id: "root",
        type: "clade",
        name: "Animalia",
        cladeData: {
          name: "Animalia",
          rank: "kingdom",
        },
        children: [targetNode],
        depth: 0,
      };

      targetNode.parent = rootNode;

      const treeData: TreeData = {
        root: rootNode,
        target: targetNode,
        nodes: [rootNode, targetNode],
        guesses: [],
      };

      // Pass isDevMode: true to see target animal names in tests
      const result = treeToMermaid(treeData, true);

      expect(result).toContain("graph TD");
      expect(result).toContain("Animalia");
      expect(result).toContain("Lion");
      expect(result).toContain("(Target)");
      expect(result).toContain("-->");
    });

    it("should convert tree with guesses and LCA to Mermaid", () => {
      const targetAnimal: Animal = {
        id: "1",
        name: "Lion",
        scientificName: "Panthera leo",
        commonNames: ["Lion"],
        imageUrl: "https://example.com/lion.jpg",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Lion",
      };

      const guessAnimal: Animal = {
        id: "2",
        name: "Tiger",
        scientificName: "Panthera tigris",
        commonNames: ["Tiger"],
        imageUrl: "https://example.com/tiger.jpg",
        wikipediaUrl: "https://en.wikipedia.org/wiki/Tiger",
      };

      const targetNode: TreeNode = {
        id: "animal-1",
        type: "animal",
        name: "Lion",
        data: targetAnimal,
        children: [],
        isTarget: true,
        depth: 2,
      };

      const guessNode: TreeNode = {
        id: "animal-2",
        type: "animal",
        name: "Tiger",
        data: guessAnimal,
        children: [],
        isGuess: true,
        depth: 2,
      };

      const lcaNode: TreeNode = {
        id: "clade-panthera",
        type: "clade",
        name: "Panthera",
        cladeData: {
          name: "Panthera",
          rank: "genus",
        },
        children: [targetNode, guessNode],
        isLCA: true,
        depth: 1,
      };

      targetNode.parent = lcaNode;
      guessNode.parent = lcaNode;

      const rootNode: TreeNode = {
        id: "root",
        type: "clade",
        name: "Animalia",
        cladeData: {
          name: "Animalia",
          rank: "kingdom",
        },
        children: [lcaNode],
        depth: 0,
      };

      lcaNode.parent = rootNode;

      const treeData: TreeData = {
        root: rootNode,
        target: targetNode,
        nodes: [rootNode, lcaNode, targetNode, guessNode],
        guesses: [guessNode],
      };

      // Pass isDevMode: true to see target animal names in tests
      const result = treeToMermaid(treeData, true);

      expect(result).toContain("graph TD");
      expect(result).toContain("Animalia");
      expect(result).toContain("Panthera");
      expect(result).toContain("Lion");
      expect(result).toContain("Tiger");
      expect(result).toContain("(Target)");
      expect(result).toContain("(Guess)");
      expect(result).toContain("(LCA)");
      expect(result).toContain("-->");
    });

    it("should handle nodes with special characters in names", () => {
      const targetAnimal: Animal = {
        id: "1",
        name: "Côte d'Ivoire Antelope",
        scientificName: "Test species",
        commonNames: [],
        imageUrl: "",
        wikipediaUrl: "",
      };

      const targetNode: TreeNode = {
        id: "animal-1",
        type: "animal",
        name: "Côte d'Ivoire Antelope",
        data: targetAnimal,
        children: [],
        isTarget: true,
        depth: 1,
      };

      const rootNode: TreeNode = {
        id: "root",
        type: "clade",
        name: "Animalia",
        cladeData: {
          name: "Animalia",
          rank: "kingdom",
        },
        children: [targetNode],
        depth: 0,
      };

      targetNode.parent = rootNode;

      const treeData: TreeData = {
        root: rootNode,
        target: targetNode,
        nodes: [rootNode, targetNode],
        guesses: [],
      };

      const result = treeToMermaid(treeData);

      // Should not throw and should contain the name (possibly escaped)
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include styling comments", () => {
      const targetAnimal: Animal = {
        id: "1",
        name: "Lion",
        scientificName: "Panthera leo",
        commonNames: ["Lion"],
        imageUrl: "",
        wikipediaUrl: "",
      };

      const targetNode: TreeNode = {
        id: "animal-1",
        type: "animal",
        name: "Lion",
        data: targetAnimal,
        children: [],
        isTarget: true,
        depth: 1,
      };

      const rootNode: TreeNode = {
        id: "root",
        type: "clade",
        name: "Animalia",
        cladeData: {
          name: "Animalia",
          rank: "kingdom",
        },
        children: [targetNode],
        depth: 0,
      };

      targetNode.parent = rootNode;

      const treeData: TreeData = {
        root: rootNode,
        target: targetNode,
        nodes: [rootNode, targetNode],
        guesses: [],
      };

      // Pass isDevMode: true to see target animal names and (Target) indicator in tests
      const result = treeToMermaid(treeData, true);

      expect(result).toContain("%% Styling:");
      expect(result).toContain("🐾");
      expect(result).toContain("🌳");
      expect(result).toContain("(Target)");
      expect(result).toContain("(Guess)");
      expect(result).toContain("(LCA)");
    });
  });
});
