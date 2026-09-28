import { describe, expect, it } from "vitest";
import type { Animal } from "~/types/animal";
import { revealedCladeNamesFromHistory } from "../../server/utils/gameProgress";

function animalWithLineage(names: string[]): Animal {
  return {
    id: "1",
    name: "Target",
    scientificName: "Targetus",
    lineage: names.map((name, index) => ({
      id: `t-${index}`,
      name,
      rank: "class",
      rankLevel: 50,
    })),
    imageUrl: "",
    description: "",
    wikipediaUrl: "",
    url: "",
  };
}

describe("gameProgress", () => {
  it("collects clade names from guess LCA paths and hint ancestors", () => {
    const target = animalWithLineage([
      "Animalia",
      "Chordata",
      "Mammalia",
      "Carnivora",
      "Felidae",
    ]);
    const names = revealedCladeNamesFromHistory(
      target,
      [{ clade: "Chordata", rank: "phylum", depth: 1, path: ["Animalia", "Chordata"] }],
      ["Mammalia"],
    );
    expect(names).toEqual(expect.arrayContaining([
      "Animalia",
      "Chordata",
      "Mammalia",
    ]));
  });
});
