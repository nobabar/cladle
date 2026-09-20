/**
 * Baby Mode organism list and target selectors.
 */

import type { Animal } from "~/types/animal";
import type { TreeData, TreeNode } from "~/types/tree";
import type { LCAResult } from "~/utils/lcaCalculator";
import { assertPuzzleDate, hashPuzzleDate } from "~/utils/dateUtils";
import en from "~/locales/en.json";

export type BabyModeTaxonomicGroup
  = | "mammal"
    | "bird"
    | "reptile"
    | "amphibian"
    | "fish"
    | "insect"
    | "arachnid"
    | "crustacean"
    | "mollusk"
    | "cnidarian";

export interface BabyModeOrganism {
  /** iNaturalist taxon ID */
  id: string;
  beginnerName: string;
  scientificName: string;
  /** Unicode emoji sticker */
  emoji: string;
  taxonomicGroup: BabyModeTaxonomicGroup;
  educationalNote?: string;
}

export interface BabyModeDifficultyProfile {
  id: "baby";
  guessPool: "closed-subset";
  dailyRelation: "independent-date-seeded";
  minCount: number;
  maxCount: number;
  minTaxonomicGroups: 6;
}

export const BABY_MODE_MAX_GUESSES = 20;

export const BABY_MODE_DIFFICULTY_PROFILE: BabyModeDifficultyProfile = {
  id: "baby",
  guessPool: "closed-subset",
  dailyRelation: "independent-date-seeded",
  minCount: 30,
  maxCount: 50,
  minTaxonomicGroups: 6,
};

export const BABY_MODE_ORGANISMS: BabyModeOrganism[] = [
  // Mammals
  { id: "47144", beginnerName: "Dog", scientificName: "Canis familiaris", emoji: "🐕", taxonomicGroup: "mammal", educationalNote: "Domestic dog, closest living relative of the gray wolf" },
  { id: "42069", beginnerName: "Fox", scientificName: "Vulpes vulpes", emoji: "🦊", taxonomicGroup: "mammal", educationalNote: "Red fox; same family as Dog (Canidae)" },
  { id: "118552", beginnerName: "Cat", scientificName: "Felis catus", emoji: "🐈", taxonomicGroup: "mammal", educationalNote: "House cat; same family as Lion (Felidae)" },
  { id: "41964", beginnerName: "Lion", scientificName: "Panthera leo", emoji: "🦁", taxonomicGroup: "mammal", educationalNote: "Big cat; same family as Cat (Felidae)" },
  { id: "41641", beginnerName: "Bear", scientificName: "Ursus arctos", emoji: "🐻", taxonomicGroup: "mammal", educationalNote: "Brown bear; same family as Panda (Ursidae)" },
  { id: "41659", beginnerName: "Panda", scientificName: "Ailuropoda melanoleuca", emoji: "🐼", taxonomicGroup: "mammal", educationalNote: "Bear that eats bamboo" },
  { id: "209233", beginnerName: "Horse", scientificName: "Equus caballus", emoji: "🐎", taxonomicGroup: "mammal", educationalNote: "Domestic horse; same family as Zebra (Equidae)" },
  { id: "43335", beginnerName: "Zebra", scientificName: "Equus quagga", emoji: "🦓", taxonomicGroup: "mammal", educationalNote: "Plains zebra; same genus as Horse (Equus)" },
  { id: "74113", beginnerName: "Cow", scientificName: "Bos taurus", emoji: "🐄", taxonomicGroup: "mammal", educationalNote: "Domestic cattle, a ruminant" },
  { id: "121578", beginnerName: "Sheep", scientificName: "Ovis aries", emoji: "🐑", taxonomicGroup: "mammal", educationalNote: "Domestic sheep; same family as Cow (Bovidae)" },
  { id: "123070", beginnerName: "Goat", scientificName: "Capra hircus", emoji: "🐐", taxonomicGroup: "mammal", educationalNote: "Domestic goat; same family as Cow (Bovidae)" },
  { id: "42223", beginnerName: "Deer", scientificName: "Odocoileus virginianus", emoji: "🦌", taxonomicGroup: "mammal", educationalNote: "White-tailed deer; a ruminant like Cow and Giraffe" },
  { id: "42157", beginnerName: "Giraffe", scientificName: "Giraffa camelopardalis", emoji: "🦒", taxonomicGroup: "mammal", educationalNote: "Tallest land mammal; a ruminant" },
  { id: "41482", beginnerName: "Dolphin", scientificName: "Tursiops truncatus", emoji: "🐬", taxonomicGroup: "mammal", educationalNote: "Toothed whale that lives in the ocean" },
  { id: "41553", beginnerName: "Whale", scientificName: "Balaenoptera musculus", emoji: "🐋", taxonomicGroup: "mammal", educationalNote: "Blue whale, a baleen whale" },
  { id: "43460", beginnerName: "Monkey", scientificName: "Macaca mulatta", emoji: "🐒", taxonomicGroup: "mammal", educationalNote: "Rhesus macaque, a primate" },
  { id: "43584", beginnerName: "Human", scientificName: "Homo sapiens", emoji: "🧑", taxonomicGroup: "mammal", educationalNote: "People; same order as Monkey (Primates)" },
  { id: "43580", beginnerName: "Gorilla", scientificName: "Gorilla gorilla", emoji: "🦍", taxonomicGroup: "mammal", educationalNote: "Western gorilla; same order as Monkey and Human (Primates)" },
  { id: "42888", beginnerName: "Kangaroo", scientificName: "Macropus giganteus", emoji: "🦘", taxonomicGroup: "mammal", educationalNote: "Marsupial that carries its baby in a pouch" },
  { id: "42983", beginnerName: "Koala", scientificName: "Phascolarctos cinereus", emoji: "🐨", taxonomicGroup: "mammal", educationalNote: "Marsupial that eats eucalyptus; same infraclass as Kangaroo" },
  { id: "44705", beginnerName: "Mouse", scientificName: "Mus musculus", emoji: "🐁", taxonomicGroup: "mammal", educationalNote: "House mouse, a rodent" },
  { id: "46001", beginnerName: "Squirrel", scientificName: "Sciurus vulgaris", emoji: "🐿️", taxonomicGroup: "mammal", educationalNote: "Red squirrel, a rodent" },
  { id: "43794", beginnerName: "Beaver", scientificName: "Castor canadensis", emoji: "🦫", taxonomicGroup: "mammal", educationalNote: "American beaver, a rodent that builds dams" },
  { id: "43151", beginnerName: "Rabbit", scientificName: "Oryctolagus cuniculus", emoji: "🐇", taxonomicGroup: "mammal", educationalNote: "European rabbit" },
  // Birds
  { id: "6930", beginnerName: "Duck", scientificName: "Anas platyrhynchos", emoji: "🦆", taxonomicGroup: "bird", educationalNote: "Mallard, a common dabbling duck" },
  { id: "6921", beginnerName: "Swan", scientificName: "Cygnus olor", emoji: "🦢", taxonomicGroup: "bird", educationalNote: "Mute swan; same order as Duck (Anseriformes)" },
  { id: "882", beginnerName: "Chicken", scientificName: "Gallus gallus", emoji: "🐓", taxonomicGroup: "bird", educationalNote: "Junglefowl / chicken" },
  { id: "1204", beginnerName: "Peacock", scientificName: "Pavo cristatus", emoji: "🦚", taxonomicGroup: "bird", educationalNote: "Indian peafowl; same order as Chicken (Galliformes)" },
  // Reptiles
  { id: "39659", beginnerName: "Turtle", scientificName: "Chelonia mydas", emoji: "🐢", taxonomicGroup: "reptile", educationalNote: "Green sea turtle" },
  { id: "238252", beginnerName: "Snake", scientificName: "Python bivittatus", emoji: "🐍", taxonomicGroup: "reptile", educationalNote: "Burmese python" },
  { id: "35912", beginnerName: "Lizard", scientificName: "Lacerta agilis", emoji: "🦎", taxonomicGroup: "reptile", educationalNote: "Sand lizard" },
  { id: "341972", beginnerName: "Crocodile", scientificName: "Crocodylus niloticus", emoji: "🐊", taxonomicGroup: "reptile", educationalNote: "Nile crocodile" },
  // Fish
  { id: "58612", beginnerName: "Goldfish", scientificName: "Carassius auratus", emoji: "🐠", taxonomicGroup: "fish", educationalNote: "Freshwater carp kept as a pet" },
  { id: "144017", beginnerName: "Blowfish", scientificName: "Arothron hispidus", emoji: "🐡", taxonomicGroup: "fish", educationalNote: "White-spotted puffer; same class as Goldfish (ray-finned fish)" },
  // Invertebrates
  { id: "48662", beginnerName: "Butterfly", scientificName: "Danaus plexippus", emoji: "🦋", taxonomicGroup: "insect", educationalNote: "Monarch butterfly" },
  { id: "47219", beginnerName: "Bee", scientificName: "Apis mellifera", emoji: "🐝", taxonomicGroup: "insect", educationalNote: "Honey bee" },
  { id: "52628", beginnerName: "Spider", scientificName: "Araneus diadematus", emoji: "🕷️", taxonomicGroup: "arachnid", educationalNote: "Garden orb-weaver; an arachnid with Scorpion" },
  { id: "127713", beginnerName: "Scorpion", scientificName: "Pandinus imperator", emoji: "🦂", taxonomicGroup: "arachnid", educationalNote: "Emperor scorpion; same class as Spider (Arachnida)" },
  { id: "120553", beginnerName: "Crab", scientificName: "Cancer pagurus", emoji: "🦀", taxonomicGroup: "crustacean", educationalNote: "Edible crab, a crustacean" },
  { id: "62410", beginnerName: "Lobster", scientificName: "Homarus gammarus", emoji: "🦞", taxonomicGroup: "crustacean", educationalNote: "European lobster; same order as Crab (Decapoda)" },
  { id: "118851", beginnerName: "Shrimp", scientificName: "Crangon crangon", emoji: "🦐", taxonomicGroup: "crustacean", educationalNote: "Brown shrimp; same order as Crab and Lobster" },
  { id: "49315", beginnerName: "Octopus", scientificName: "Octopus vulgaris", emoji: "🐙", taxonomicGroup: "mollusk", educationalNote: "Common octopus, a mollusk" },
  { id: "61523", beginnerName: "Snail", scientificName: "Helix pomatia", emoji: "🐌", taxonomicGroup: "mollusk", educationalNote: "Roman snail, a land mollusk" },
  { id: "53462", beginnerName: "Oyster", scientificName: "Ostrea edulis", emoji: "🦪", taxonomicGroup: "mollusk", educationalNote: "European flat oyster; a two-shelled mollusk" },
  { id: "48328", beginnerName: "Jellyfish", scientificName: "Aurelia aurita", emoji: "🪼", taxonomicGroup: "cnidarian", educationalNote: "Moon jelly; a very distant relative of all other animals in this set" },
];

const BABY_MODE_IDS = new Set(BABY_MODE_ORGANISMS.map(organism => organism.id));

export function isBabyModeOrganism(id: string): boolean {
  return BABY_MODE_IDS.has(id);
}

export function getBabyModeOrganismById(id: string): BabyModeOrganism | undefined {
  return BABY_MODE_ORGANISMS.find(organism => organism.id === id);
}

export function getBabyModeEmoji(id: string): string | undefined {
  return getBabyModeOrganismById(id)?.emoji;
}

export function babyModeStickerMap(): Record<string, string> {
  return Object.fromEntries(
    BABY_MODE_ORGANISMS.map(organism => [organism.id, organism.emoji]),
  );
}

export function selectBabyModeTarget(date: string): string {
  assertPuzzleDate(date);

  if (BABY_MODE_ORGANISMS.length === 0) {
    throw new Error("Baby Mode organism list is empty. Cannot select target.");
  }

  const seed = hashPuzzleDate(`baby:${date}`);
  const index = seed % BABY_MODE_ORGANISMS.length;
  return BABY_MODE_ORGANISMS[index]!.id;
}

export function selectRandomBabyModeTarget(): string {
  if (BABY_MODE_ORGANISMS.length === 0) {
    throw new Error("Baby Mode organism list is empty. Cannot select target.");
  }

  const randomIndex = Math.floor(Math.random() * BABY_MODE_ORGANISMS.length);
  return BABY_MODE_ORGANISMS[randomIndex]!.id;
}

const BABY_MODE_LABELED_CLADES = new Set(Object.keys(en.babyMode.clades));

/**
 * Whether this clade has an explicit kid-friendly name in the locale catalog.
 * @param cladeName - Scientific clade name
 * @returns True if the clade has an explicit kid-friendly name in the locale catalog
 */
export function hasBabyModeCladeInCatalog(cladeName: string): boolean {
  return BABY_MODE_LABELED_CLADES.has(cladeName);
}

/**
 * Whether a clade has an explicit kid-friendly common name in i18n.
 * @param cladeName - Scientific clade name
 * @param hasKey - Optional vue-i18n `te` checker, defaults to the locale catalog
 * @returns True if the clade has an explicit kid-friendly common name in i18n
 */
export function hasBabyModeCladeLabel(
  cladeName: string,
  hasKey?: (key: string) => boolean,
): boolean {
  if (hasKey) {
    return hasKey(`babyMode.clades.${cladeName}`);
  }
  return hasBabyModeCladeInCatalog(cladeName);
}

/**
 * Kid-friendly common name for a clade, or null when none is defined.
 * Only explicit `babyMode.clades.*` entries count, no rank or generic fallbacks.
 * @param cladeName - The clade name to look up
 * @param lookup - A function that looks up a key in the locale catalog
 * @param hasKey - A function that checks if a key exists in the locale catalog
 * @returns The kid-friendly common name for the clade, or null when none is defined
 */
export function getBabyModeCladeLabel(
  cladeName: string,
  lookup: (key: string) => string,
  hasKey: (key: string) => boolean,
): string | null {
  const cladeKey = `babyMode.clades.${cladeName}`;
  if (hasKey(cladeKey)) {
    return lookup(cladeKey);
  }
  return null;
}

function lcaResultForCladeOnPath(
  referenceAnimal: Animal,
  cladeName: string,
  path: string[],
): LCAResult {
  const lineage = referenceAnimal.lineage ?? [];
  const pathIndex = path.indexOf(cladeName);
  const lineageIndex = lineage.findIndex(taxon => taxon.name === cladeName);
  const depth = lineageIndex >= 0 ? lineageIndex : pathIndex;
  const taxon = lineageIndex >= 0 ? lineage[lineageIndex] : undefined;

  return {
    clade: cladeName,
    rank: taxon?.rank ?? "unknown",
    depth: depth >= 0 ? depth : 0,
    path: pathIndex >= 0 ? path.slice(0, pathIndex + 1) : [cladeName],
  };
}

/**
 * In beginner mode, use the nearest labeled ancestor when the true LCA has no common name.
 * E.g. Laurasiatheria -> Mammalia.
 * @param lcaResult - The LCA result to resolve
 * @param referenceAnimal - The reference animal to use for the LCA calculation
 * @returns The resolved LCA result
 */
export function resolveBabyModeLCA(
  lcaResult: LCAResult,
  referenceAnimal: Animal,
): LCAResult {
  if (hasBabyModeCladeInCatalog(lcaResult.clade)) {
    return lcaResult;
  }

  const path = lcaResult.path.length > 0
    ? lcaResult.path
    : (referenceAnimal.lineage ?? []).map(taxon => taxon.name);

  if (path.length === 0) {
    return lcaResultForCladeOnPath(referenceAnimal, "Animalia", ["Animalia"]);
  }

  const lcaIndex = path.indexOf(lcaResult.clade);
  const startIndex = lcaIndex >= 0 ? lcaIndex - 1 : path.length - 2;

  for (let i = startIndex; i >= 0; i--) {
    const ancestorName = path[i]!;
    if (hasBabyModeCladeInCatalog(ancestorName)) {
      return lcaResultForCladeOnPath(referenceAnimal, ancestorName, path);
    }
  }

  return lcaResultForCladeOnPath(referenceAnimal, "Animalia", path);
}

function buildCladeMapFromTree(root: TreeNode): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>();
  const walk = (node: TreeNode): void => {
    if (node.type === "clade" && node.name) {
      map.set(node.name, node);
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return map;
}

function getSubtreeTaxonomyPath(node: TreeNode): string[] | undefined {
  if (node.taxonomyPath?.length) {
    return node.taxonomyPath;
  }
  for (const child of node.children) {
    const path = getSubtreeTaxonomyPath(child);
    if (path) {
      return path;
    }
  }
  return undefined;
}

function nearestLabeledAncestorInPath(
  path: string[],
  fromCladeName: string,
  hasLabel: (cladeName: string) => boolean,
): string | null {
  const idx = path.indexOf(fromCladeName);
  const startIndex = idx >= 0 ? idx - 1 : path.length - 2;

  for (let i = startIndex; i >= 0; i--) {
    const name = path[i]!;
    if (hasLabel(name)) {
      return name;
    }
  }
  return null;
}

function ensureCladeNode(
  root: TreeNode,
  cladeMap: Map<string, TreeNode>,
  cladeName: string,
  path: string[],
): TreeNode {
  const existing = cladeMap.get(cladeName);
  if (existing) {
    return existing;
  }

  const idx = path.indexOf(cladeName);
  let parent: TreeNode = root;
  for (let i = idx - 1; i >= 0; i--) {
    const ancestorNode = cladeMap.get(path[i]!);
    if (ancestorNode) {
      parent = ancestorNode;
      break;
    }
  }

  const newNode: TreeNode = {
    id: `clade-${cladeName.toLowerCase().replace(/\s+/g, "-")}`,
    type: "clade",
    name: cladeName,
    cladeData: { name: cladeName, rank: "unknown" },
    children: [],
    parent,
    isLCA: true,
    taxonomyPath: idx >= 0 ? path.slice(0, idx + 1) : [cladeName],
  };
  parent.children.push(newNode);
  cladeMap.set(cladeName, newNode);
  return newNode;
}

function cloneTreeNodeForDisplay(node: TreeNode, parent?: TreeNode): TreeNode {
  const cloned: TreeNode = {
    id: node.id,
    type: node.type,
    name: node.name,
    data: node.data ? { ...node.data } : undefined,
    cladeData: node.cladeData ? { ...node.cladeData } : undefined,
    children: [],
    parent,
    position: node.position ? { ...node.position } : undefined,
    depth: node.depth,
    taxonomicDepth: node.taxonomicDepth,
    taxonomyPath: node.taxonomyPath ? [...node.taxonomyPath] : undefined,
    isTarget: node.isTarget,
    isGuess: node.isGuess,
    isLCA: node.isLCA,
  };
  cloned.children = node.children.map(child => cloneTreeNodeForDisplay(child, cloned));
  return cloned;
}

function collectTreeNodes(root: TreeNode): TreeNode[] {
  const nodes: TreeNode[] = [];
  const walk = (node: TreeNode): void => {
    nodes.push(node);
    for (const child of node.children) {
      walk(child);
    }
  };
  walk(root);
  return nodes;
}

function findTreeNodeById(root: TreeNode, id: string): TreeNode | undefined {
  if (root.id === id) {
    return root;
  }
  for (const child of root.children) {
    const found = findTreeNodeById(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Display-only tree: removes clade nodes that have no kid-friendly common name,
 * hoisting their children to the parent (may skip several taxonomic steps).
 * @param treeData - The tree data to simplify
 * @param hasLabel - A function that checks if a clade has a kid-friendly common name
 * @returns The simplified tree data
 */
export function simplifyBabyModeTree(
  treeData: TreeData,
  hasLabel: (cladeName: string) => boolean = hasBabyModeCladeInCatalog,
): TreeData {
  const root = cloneTreeNodeForDisplay(treeData.root);
  const cladeMap = buildCladeMapFromTree(root);

  const collapseUnlabeled = (node: TreeNode): void => {
    for (const child of node.children) {
      collapseUnlabeled(child);
    }

    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]!;
      if (child.type !== "clade" || !child.name || hasLabel(child.name)) {
        continue;
      }

      const path = child.taxonomyPath ?? getSubtreeTaxonomyPath(child);
      const anchorName = path
        ? nearestLabeledAncestorInPath(path, child.name, hasLabel)
        : null;
      const anchor = anchorName && path
        ? ensureCladeNode(root, cladeMap, anchorName, path)
        : node;

      for (const grandchild of child.children) {
        grandchild.parent = anchor;
        if (!anchor.children.includes(grandchild)) {
          anchor.children.push(grandchild);
        }
      }

      node.children.splice(i, 1);
    }
  };

  collapseUnlabeled(root);

  const nodes = collectTreeNodes(root);
  const target = findTreeNodeById(root, treeData.target.id)
    ?? nodes.find(node => node.isTarget)
    ?? root;
  const guesses = nodes.filter(node => node.isGuess);

  return { root, target, nodes, guesses };
}
