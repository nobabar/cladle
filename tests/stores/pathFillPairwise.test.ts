import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { getGameStore } from "#test/helpers/gameStore";
import type { Animal } from "~/types/animal";
import type { TreeNode } from "~/types/tree";
import type { TaxonInLineage } from "~/types/taxonInLineage";
import { calculateLCA } from "~/utils/lcaCalculator";

function T(id: string, name: string, rank: string, rankLevel: number): TaxonInLineage {
  return { id, name, rank, rankLevel };
}

const sharedVert = [
  T("1", "Animalia", "kingdom", 70),
  T("2", "Chordata", "phylum", 60),
  T("355675", "Vertebrata", "subphylum", 57),
];

const mammalBase = [
  ...sharedVert,
  T("40151", "Mammalia", "class", 50),
  T("848317", "Theria", "subclass", 47),
  T("848320", "Placentalia", "infraclass", 45),
  T("848324", "Laurasiatheria", "superorder", 43),
  T("152870", "Artiodactyla", "order", 40),
];

const mystery: Animal = {
  id: "mystery-deer",
  name: "Mystery Deer",
  scientificName: "Odocoileus virginianus",
  lineage: [
    ...mammalBase,
    T("42158", "Cervidae", "family", 30),
    T("42219", "Odocoileus", "genus", 20),
    T("42223", "Odocoileus virginianus", "species", 10),
  ],
};

const humpback: Animal = {
  id: "41566",
  name: "Humpback Whale",
  scientificName: "Megaptera novaeangliae",
  lineage: [
    ...mammalBase,
    T("925158", "Whippomorpha", "suborder", 37),
    T("152871", "Cetacea", "infraorder", 35),
    T("424321", "Mysticeti", "parvorder", 34.5),
    T("41546", "Balaenopteridae", "family", 30),
    T("41565", "Megaptera", "genus", 20),
    T("41566", "Megaptera novaeangliae", "species", 10),
  ],
};

const greyWhale: Animal = {
  id: "41478",
  name: "Grey Whale",
  scientificName: "Eschrichtius robustus",
  lineage: [
    ...mammalBase,
    T("925158", "Whippomorpha", "suborder", 37),
    T("152871", "Cetacea", "infraorder", 35),
    T("424321", "Mysticeti", "parvorder", 34.5),
    T("41476", "Eschrichtiidae", "family", 30),
    T("41477", "Eschrichtius", "genus", 20),
    T("41478", "Eschrichtius robustus", "species", 10),
  ],
};

const hawk: Animal = {
  id: "5212",
  name: "Red-tailed Hawk",
  scientificName: "Buteo jamaicensis",
  lineage: [
    ...sharedVert,
    T("3", "Aves", "class", 50),
    T("71261", "Accipitriformes", "order", 40),
    T("5067", "Accipitridae", "family", 30),
    T("1542783", "Buteoninae", "subfamily", 27),
    T("5179", "Buteo", "genus", 20),
    T("5212", "Buteo jamaicensis", "species", 10),
  ],
};

const eagle: Animal = {
  id: "5305",
  name: "Bald Eagle",
  scientificName: "Haliaeetus leucocephalus",
  lineage: [
    ...sharedVert,
    T("3", "Aves", "class", 50),
    T("71261", "Accipitriformes", "order", 40),
    T("5067", "Accipitridae", "family", 30),
    T("1542783", "Buteoninae", "subfamily", 27),
    T("5303", "Haliaeetus", "genus", 20),
    T("5305", "Haliaeetus leucocephalus", "species", 10),
  ],
};

const gho: Animal = {
  id: "20044",
  name: "Great Horned Owl",
  scientificName: "Bubo virginianus",
  lineage: [
    ...sharedVert,
    T("3", "Aves", "class", 50),
    T("19350", "Strigiformes", "order", 40),
    T("19728", "Strigidae", "family", 30),
    T("20034", "Bubo", "genus", 20),
    T("20044", "Bubo virginianus", "species", 10),
  ],
};

const barred: Animal = {
  id: "19893",
  name: "Barred Owl",
  scientificName: "Strix varia",
  lineage: [
    ...sharedVert,
    T("3", "Aves", "class", 50),
    T("19350", "Strigiformes", "order", 40),
    T("19728", "Strigidae", "family", 30),
    T("19885", "Strix", "genus", 20),
    T("19893", "Strix varia", "species", 10),
  ],
};

describe("path-fill + pairwise on secondary branches", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("nests birds and whales under guess-side LCAs when target is known", () => {
    const store = getGameStore();
    store.startGame(mystery, 20);
    for (const a of [humpback, greyWhale, hawk, eagle, gho, barred]) {
      store.processGuess(a);
    }

    expect(store.treeData?.nodes.find((n: TreeNode) => n.name === "Buteoninae")).toBeDefined();
    expect(store.treeData?.nodes.find((n: TreeNode) => n.name === "Strigidae")).toBeDefined();
    expect(store.treeData?.nodes.find((n: TreeNode) => n.name === "Mysticeti")).toBeDefined();
    expect(
      store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${hawk.id}`)?.parent?.name,
    ).toBe("Buteoninae");
  });

  it("still nests guess-side LCAs in sealed mode (target null)", () => {
    const store = getGameStore();
    store.startGame(mystery, 20);
    // Simulate sealed daily: mystery animal cleared, LCA comes from server/local calc snapshot
    store.target = null;
    store.gameToken = "sealed-test-token";

    const whaleLca = calculateLCA(humpback, mystery);
    const greyLca = calculateLCA(greyWhale, mystery);
    const hawkLca = calculateLCA(hawk, mystery);
    const eagleLca = calculateLCA(eagle, mystery);
    const ghoLca = calculateLCA(gho, mystery);
    const barredLca = calculateLCA(barred, mystery);

    for (const [animal, lca] of [
      [humpback, whaleLca],
      [greyWhale, greyLca],
      [hawk, hawkLca],
      [eagle, eagleLca],
      [gho, ghoLca],
      [barred, barredLca],
    ] as const) {
      store.guesses.push({ animal, lca, timestamp: Date.now() });
      store.updateTreeWithGuess(animal, lca);
    }

    const aves = store.treeData?.nodes.find((n: TreeNode) => n.name === "Aves" && n.isLCA);
    const buteoninae = store.treeData?.nodes.find((n: TreeNode) => n.name === "Buteoninae" && n.isLCA);
    const strigidae = store.treeData?.nodes.find((n: TreeNode) => n.name === "Strigidae" && n.isLCA);
    const mysticeti = store.treeData?.nodes.find((n: TreeNode) => n.name === "Mysticeti" && n.isLCA);
    const hawkNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${hawk.id}`);
    const barredNode = store.treeData?.nodes.find((n: TreeNode) => n.id === `animal-${barred.id}`);

    expect(aves).toBeDefined();
    expect(buteoninae).toBeDefined();
    expect(strigidae).toBeDefined();
    expect(mysticeti).toBeDefined();
    expect(buteoninae?.parent?.name).toBe("Aves");
    expect(strigidae?.parent?.name).toBe("Aves");
    expect(hawkNode?.parent?.name).toBe("Buteoninae");
    expect(barredNode?.parent?.name).toBe("Strigidae");
  });
});
