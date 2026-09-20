import { describe, expect, it } from "vitest";
import type { TreeNode } from "~/types/tree";
import { getTreeNodeBoxWidth, getTreeNodeDisplayLabel } from "~/utils/treeNodeWidth";

function animalNode(id: string, name: string): TreeNode {
  return {
    id: `animal-${id}`,
    type: "animal",
    name,
    data: {
      id,
      name,
      scientificName: "S. name",
      lineage: [{ id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 }],
    },
    children: [],
  };
}

function cladeNode(name: string, rank: string): TreeNode {
  return {
    id: `clade-${name}`,
    type: "clade",
    name,
    cladeData: { name, rank },
    children: [],
  };
}

describe("treeNodeWidth", () => {
  const stickerMap = { 47144: "🐕" };

  it("shows emoji and name by default when sticker map is provided", () => {
    const label = getTreeNodeDisplayLabel(animalNode("47144", "Dog"), true, stickerMap);
    expect(label).toBe("🐕 Dog");
  });

  it("shows emoji only when emojiOnly is enabled", () => {
    const label = getTreeNodeDisplayLabel(animalNode("47144", "Dog"), true, stickerMap, {
      emojiOnly: true,
    });
    expect(label).toBe("🐕");
  });

  it("maps clade labels through resolveCladeLabel when provided", () => {
    const label = getTreeNodeDisplayLabel(cladeNode("Laurasiatheria", "superorder"), true, undefined, {
      resolveCladeLabel: name => (name === "Laurasiatheria" ? "Group" : name),
    });
    expect(label).toBe("Group");
  });

  it("falls back to scientific clade name when resolveCladeLabel returns empty", () => {
    const label = getTreeNodeDisplayLabel(cladeNode("Laurasiatheria", "superorder"), true, undefined, {
      resolveCladeLabel: () => "",
    });
    expect(label).toBe("Laurasiatheria");
  });

  it("sizes emoji-only animal nodes for the large sticker font", () => {
    const emojiWidth = getTreeNodeBoxWidth(animalNode("47144", "Dog"), true, stickerMap, {
      emojiOnly: true,
    });
    const textWidth = getTreeNodeBoxWidth(animalNode("47144", "Dog"), true, stickerMap);
    // Large emoji font (26px) can be wider than small "emoji + name" text in the canvas mock.
    expect(emojiWidth).toBeGreaterThan(0);
    expect(textWidth).toBeGreaterThan(0);
    expect(emojiWidth).not.toBe(textWidth);
  });
});
