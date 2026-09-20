/**
 * Fetch iNaturalist taxa for Baby Mode and write baby-mode-bundle.json.
 *
 * Run manually to update the json if the animal list change:
 *   node scripts/generate-baby-mode-bundle.mjs
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const INATURALIST_BASE_URL = "https://api.inaturalist.org/v1";
const RATE_LIMIT_MS = 1000;
const SPECIES_RANK_LEVEL = 10;
const BELOW_SPECIES_RANKS = new Set(["subspecies", "variety", "form"]);
const BUNDLE_VERSION = 1;

/** Keep in sync with app/utils/babyMode.ts BABY_MODE_ORGANISMS */
const BABY_MODE_ORGANISMS = [
  { id: "47144", beginnerName: "Dog", scientificName: "Canis familiaris" },
  { id: "42069", beginnerName: "Fox", scientificName: "Vulpes vulpes" },
  { id: "118552", beginnerName: "Cat", scientificName: "Felis catus" },
  { id: "41964", beginnerName: "Lion", scientificName: "Panthera leo" },
  { id: "41641", beginnerName: "Bear", scientificName: "Ursus arctos" },
  { id: "41659", beginnerName: "Panda", scientificName: "Ailuropoda melanoleuca" },
  { id: "209233", beginnerName: "Horse", scientificName: "Equus caballus" },
  { id: "43335", beginnerName: "Zebra", scientificName: "Equus quagga" },
  { id: "74113", beginnerName: "Cow", scientificName: "Bos taurus" },
  { id: "121578", beginnerName: "Sheep", scientificName: "Ovis aries" },
  { id: "123070", beginnerName: "Goat", scientificName: "Capra hircus" },
  { id: "42223", beginnerName: "Deer", scientificName: "Odocoileus virginianus" },
  { id: "42157", beginnerName: "Giraffe", scientificName: "Giraffa camelopardalis" },
  { id: "41482", beginnerName: "Dolphin", scientificName: "Tursiops truncatus" },
  { id: "41553", beginnerName: "Whale", scientificName: "Balaenoptera musculus" },
  { id: "43460", beginnerName: "Monkey", scientificName: "Macaca mulatta" },
  { id: "43584", beginnerName: "Human", scientificName: "Homo sapiens" },
  { id: "43580", beginnerName: "Gorilla", scientificName: "Gorilla gorilla" },
  { id: "42888", beginnerName: "Kangaroo", scientificName: "Macropus giganteus" },
  { id: "42983", beginnerName: "Koala", scientificName: "Phascolarctos cinereus" },
  { id: "44705", beginnerName: "Mouse", scientificName: "Mus musculus" },
  { id: "46001", beginnerName: "Squirrel", scientificName: "Sciurus vulgaris" },
  { id: "43794", beginnerName: "Beaver", scientificName: "Castor canadensis" },
  { id: "43151", beginnerName: "Rabbit", scientificName: "Oryctolagus cuniculus" },
  { id: "6930", beginnerName: "Duck", scientificName: "Anas platyrhynchos" },
  { id: "6921", beginnerName: "Swan", scientificName: "Cygnus olor" },
  { id: "882", beginnerName: "Chicken", scientificName: "Gallus gallus" },
  { id: "1204", beginnerName: "Peacock", scientificName: "Pavo cristatus" },
  { id: "39659", beginnerName: "Turtle", scientificName: "Chelonia mydas" },
  { id: "238252", beginnerName: "Snake", scientificName: "Python bivittatus" },
  { id: "35912", beginnerName: "Lizard", scientificName: "Lacerta agilis" },
  { id: "341972", beginnerName: "Crocodile", scientificName: "Crocodylus niloticus" },
  { id: "58612", beginnerName: "Goldfish", scientificName: "Carassius auratus" },
  { id: "144017", beginnerName: "Blowfish", scientificName: "Arothron hispidus" },
  { id: "48662", beginnerName: "Butterfly", scientificName: "Danaus plexippus" },
  { id: "47219", beginnerName: "Bee", scientificName: "Apis mellifera" },
  { id: "52628", beginnerName: "Spider", scientificName: "Araneus diadematus" },
  { id: "127713", beginnerName: "Scorpion", scientificName: "Pandinus imperator" },
  { id: "120553", beginnerName: "Crab", scientificName: "Cancer pagurus" },
  { id: "62410", beginnerName: "Lobster", scientificName: "Homarus gammarus" },
  { id: "118851", beginnerName: "Shrimp", scientificName: "Crangon crangon" },
  { id: "49315", beginnerName: "Octopus", scientificName: "Octopus vulgaris" },
  { id: "61523", beginnerName: "Snail", scientificName: "Helix pomatia" },
  { id: "53462", beginnerName: "Oyster", scientificName: "Ostrea edulis" },
  { id: "48328", beginnerName: "Jellyfish", scientificName: "Aurelia aurita" },
];

function isAtOrAboveSpecies(rankLevel, rank) {
  if (rankLevel !== undefined && !Number.isNaN(rankLevel)) {
    return rankLevel >= SPECIES_RANK_LEVEL;
  }
  if (!rank) {
    return true;
  }
  return !BELOW_SPECIES_RANKS.has(rank.toLowerCase());
}

function trimPreAnimalia(taxa) {
  const animaliaIndex = taxa.findIndex(
    t => t.rank === "kingdom" && t.name.trim().toLowerCase() === "animalia",
  );
  if (animaliaIndex >= 0) {
    return taxa.slice(animaliaIndex);
  }
  return taxa.filter(t => t.rank !== "stateofmatter");
}

function toLineageEntry(taxon) {
  const entry = {
    id: String(taxon.id),
    name: taxon.name,
    rank: taxon.rank,
  };
  if (taxon.rank_level !== undefined && !Number.isNaN(taxon.rank_level)) {
    entry.rankLevel = taxon.rank_level;
  }
  return entry;
}

/** Mirrors app/utils/taxonLineage.ts buildLineageFromAncestors */
/**
 * @param ancestors - iNaturalist ancestor taxa.
 * @param taxon - Terminal species taxon.
 * @returns Playable lineage entries.
 */
function buildLineageFromAncestors(ancestors, taxon) {
  const ordered = trimPreAnimalia([...ancestors, taxon]);
  const lineage = [];
  const seenIds = new Set();

  for (const source of ordered) {
    if (!isAtOrAboveSpecies(source.rank_level, source.rank)) {
      continue;
    }
    const id = String(source.id);
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    lineage.push(toLineageEntry(source));
  }

  return lineage;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTaxonWithAncestors(id, attempt = 1) {
  const url = `${INATURALIST_BASE_URL}/taxa/${id}?include_ancestors=true`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iNat fetch failed for ${id}: HTTP ${response.status}`);
    }
    const payload = await response.json();
    const taxon = payload.results?.[0];
    if (!taxon) {
      throw new Error(`iNat returned no taxon for id ${id}`);
    }
    return taxon;
  }
  catch (error) {
    if (attempt >= 3) {
      throw error;
    }
    await sleep(RATE_LIMIT_MS * attempt * 2);
    return fetchTaxonWithAncestors(id, attempt + 1);
  }
}

function mapToAnimal(taxon, beginnerName, scientificName) {
  const ancestors = taxon.ancestors ?? [];
  const lineage = buildLineageFromAncestors(ancestors, taxon);

  return {
    id: String(taxon.id),
    name: beginnerName,
    scientificName,
    lineage,
    url: `https://www.inaturalist.org/taxa/${taxon.id}`,
  };
}

async function main() {
  const animals = [];

  for (let i = 0; i < BABY_MODE_ORGANISMS.length; i++) {
    const organism = BABY_MODE_ORGANISMS[i];
    if (i > 0) {
      await sleep(RATE_LIMIT_MS);
    }

    console.log(`Fetching ${organism.beginnerName} (${organism.id})…`);
    const taxon = await fetchTaxonWithAncestors(organism.id);

    if (String(taxon.id) !== organism.id) {
      throw new Error(`ID mismatch for ${organism.beginnerName}: expected ${organism.id}, got ${taxon.id}`);
    }

    const animal = mapToAnimal(taxon, organism.beginnerName, organism.scientificName);
    if (animal.lineage.length === 0) {
      throw new Error(`Empty lineage for ${organism.beginnerName} (${organism.id})`);
    }

    animals.push(animal);
  }

  const bundle = {
    version: BUNDLE_VERSION,
    generatedAt: new Date().toISOString(),
    animals,
  };

  const outDir = path.join(process.cwd(), "app/assets/data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "baby-mode-bundle.json");
  fs.writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  console.log(`Wrote ${animals.length} animals to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
