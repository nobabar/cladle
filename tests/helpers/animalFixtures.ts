import type { Animal } from "~/types/animal";
import type { TaxonInLineage } from "~/types/taxonInLineage";
import { lineageFromNames } from "~/utils/taxonLineage";

export { lineageFromNames };

/**
 * Lineages built from iNaturalist `/v1/taxa/{id}?include_ancestors=true`.
 */
export const TIGER_LINEAGE: TaxonInLineage[] = [
  { id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 },
  { id: "2", name: "Chordata", rank: "phylum", rankLevel: 60 },
  { id: "355675", name: "Vertebrata", rank: "subphylum", rankLevel: 57 },
  { id: "40151", name: "Mammalia", rank: "class", rankLevel: 50 },
  { id: "848317", name: "Theria", rank: "subclass", rankLevel: 47 },
  { id: "848320", name: "Placentalia", rank: "infraclass", rankLevel: 45 },
  { id: "848324", name: "Laurasiatheria", rank: "superorder", rankLevel: 43 },
  { id: "41573", name: "Carnivora", rank: "order", rankLevel: 40 },
  { id: "41944", name: "Felidae", rank: "family", rankLevel: 30 },
  { id: "846273", name: "Pantherinae", rank: "subfamily", rankLevel: 27 },
  { id: "41962", name: "Panthera", rank: "genus", rankLevel: 20 },
  { id: "41967", name: "Panthera tigris", rank: "species", rankLevel: 10 },
];

export const WOLF_LINEAGE: TaxonInLineage[] = [
  { id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 },
  { id: "2", name: "Chordata", rank: "phylum", rankLevel: 60 },
  { id: "355675", name: "Vertebrata", rank: "subphylum", rankLevel: 57 },
  { id: "40151", name: "Mammalia", rank: "class", rankLevel: 50 },
  { id: "848317", name: "Theria", rank: "subclass", rankLevel: 47 },
  { id: "848320", name: "Placentalia", rank: "infraclass", rankLevel: 45 },
  { id: "848324", name: "Laurasiatheria", rank: "superorder", rankLevel: 43 },
  { id: "41573", name: "Carnivora", rank: "order", rankLevel: 40 },
  { id: "42043", name: "Canidae", rank: "family", rankLevel: 30 },
  { id: "42044", name: "Canis", rank: "genus", rankLevel: 20 },
  { id: "42048", name: "Canis lupus", rank: "species", rankLevel: 10 },
];

export const LION_LINEAGE: TaxonInLineage[] = [
  { id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 },
  { id: "2", name: "Chordata", rank: "phylum", rankLevel: 60 },
  { id: "355675", name: "Vertebrata", rank: "subphylum", rankLevel: 57 },
  { id: "40151", name: "Mammalia", rank: "class", rankLevel: 50 },
  { id: "848317", name: "Theria", rank: "subclass", rankLevel: 47 },
  { id: "848320", name: "Placentalia", rank: "infraclass", rankLevel: 45 },
  { id: "848324", name: "Laurasiatheria", rank: "superorder", rankLevel: 43 },
  { id: "41573", name: "Carnivora", rank: "order", rankLevel: 40 },
  { id: "41944", name: "Felidae", rank: "family", rankLevel: 30 },
  { id: "846273", name: "Pantherinae", rank: "subfamily", rankLevel: 27 },
  { id: "41962", name: "Panthera", rank: "genus", rankLevel: 20 },
  { id: "41964", name: "Panthera leo", rank: "species", rankLevel: 10 },
];

export const BEAR_LINEAGE: TaxonInLineage[] = [
  { id: "1", name: "Animalia", rank: "kingdom", rankLevel: 70 },
  { id: "2", name: "Chordata", rank: "phylum", rankLevel: 60 },
  { id: "355675", name: "Vertebrata", rank: "subphylum", rankLevel: 57 },
  { id: "40151", name: "Mammalia", rank: "class", rankLevel: 50 },
  { id: "848317", name: "Theria", rank: "subclass", rankLevel: 47 },
  { id: "848320", name: "Placentalia", rank: "infraclass", rankLevel: 45 },
  { id: "848324", name: "Laurasiatheria", rank: "superorder", rankLevel: 43 },
  { id: "41573", name: "Carnivora", rank: "order", rankLevel: 40 },
  { id: "41636", name: "Ursidae", rank: "family", rankLevel: 30 },
  { id: "846255", name: "Ursinae", rank: "subfamily", rankLevel: 27 },
  { id: "41637", name: "Ursus", rank: "genus", rankLevel: 20 },
  { id: "41641", name: "Ursus arctos", rank: "species", rankLevel: 10 },
];

function animal(
  id: string,
  name: string,
  scientificName: string,
  lineage: TaxonInLineage[],
): Animal {
  return { id, name, scientificName, lineage };
}

export function tiger(): Animal {
  return animal("41967", "Tiger", "Panthera tigris", TIGER_LINEAGE);
}

export function wolf(): Animal {
  return animal("42048", "Wolf", "Canis lupus", WOLF_LINEAGE);
}

export function lion(): Animal {
  return animal("41964", "Lion", "Panthera leo", LION_LINEAGE);
}

export function bear(): Animal {
  return animal("41641", "Brown Bear", "Ursus arctos", BEAR_LINEAGE);
}

/** iNat taxon ids skipped when simulating a shorter guess path (misaligned LCA tests). */
const TIGER_GAP_STEP_IDS = new Set(["848317", "848320", "848324"]);

/**
 * Shorter guess path: Mammalia → Carnivora with no Theria / Placentalia / Laurasiatheria steps.
 * @returns The tiger lineage through carnivora.
 */
export function tigerLineageThroughCarnivora(): TaxonInLineage[] {
  const out: TaxonInLineage[] = [];
  for (const step of TIGER_LINEAGE) {
    if (TIGER_GAP_STEP_IDS.has(step.id)) {
      continue;
    }
    out.push(step);
    if (step.id === "41573") {
      break;
    }
  }
  return out;
}
