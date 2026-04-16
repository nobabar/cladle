import type { Page } from "@playwright/test";

const TAXONOMY = {
  tiger: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
  lion: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera leo"],
  wolf: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Canidae", "Canis", "Canis lupus"],
} as const;

const TAXA_BY_ID: Record<string, {
  id: number;
  scientificName: string;
  commonName: string;
  taxonomy: string[];
}> = {
  41967: { id: 41967, scientificName: "Panthera tigris", commonName: "Tiger", taxonomy: [...TAXONOMY.tiger] },
  41964: { id: 41964, scientificName: "Panthera leo", commonName: "Lion", taxonomy: [...TAXONOMY.lion] },
  42051: { id: 42051, scientificName: "Canis lupus", commonName: "Gray Wolf", taxonomy: [...TAXONOMY.wolf] },
};

function toAncestors(taxonomy: string[]) {
  return taxonomy.slice(0, -1).map((name, index) => ({
    id: 1000 + index,
    name,
    rank: ["kingdom", "phylum", "class", "order", "family", "genus"][index],
  }));
}

function createTaxonResponse(id: string) {
  const selected = TAXA_BY_ID[id] ?? TAXA_BY_ID["41967"];
  if (!selected) {
    throw new Error(`Missing fixture taxon for id: ${id}`);
  }
  return {
    results: [{
      id: selected.id,
      name: selected.scientificName,
      // eslint-disable-next-line camelcase -- matches iNaturalist API payload
      preferred_common_name: selected.commonName,
      rank: "species",
      // eslint-disable-next-line camelcase -- matches iNaturalist API payload
      ancestor_ids: [48460],
      ancestors: toAncestors(selected.taxonomy),
      // eslint-disable-next-line camelcase -- matches iNaturalist API payload
      iconic_taxon_name: "Animalia",
      // eslint-disable-next-line camelcase -- matches iNaturalist API payload
      observations_count: 900000,
      // eslint-disable-next-line camelcase -- matches iNaturalist API payload
      wikipedia_url: `https://en.wikipedia.org/wiki/${selected.commonName.replace(/\s+/g, "_")}`,
      // eslint-disable-next-line camelcase -- matches iNaturalist API payload
      default_photo: {
        // eslint-disable-next-line camelcase -- matches iNaturalist API payload
        medium_url: "https://example.com/fake-photo.jpg",
      },
    }],
  };
}

export async function mockINaturalist(page: Page) {
  await page.route("**/v1/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get("q") || "").toLowerCase();

    const results = Object.values(TAXA_BY_ID)
      .filter(taxon =>
        taxon.commonName.toLowerCase().includes(query)
        || taxon.scientificName.toLowerCase().includes(query),
      )
      .map(taxon => ({
        type: "Taxon",
        score: 100,
        record: {
          id: taxon.id,
          name: taxon.scientificName,
          // eslint-disable-next-line camelcase -- matches iNaturalist API payload
          preferred_common_name: taxon.commonName,
          rank: "species",
          // eslint-disable-next-line camelcase -- matches iNaturalist API payload
          ancestor_ids: [48460],
          // eslint-disable-next-line camelcase -- matches iNaturalist API payload
          iconic_taxon_name: "Animalia",
          // eslint-disable-next-line camelcase -- matches iNaturalist API payload
          observations_count: 100000,
          // eslint-disable-next-line camelcase -- matches iNaturalist API payload
          wikipedia_url: `https://en.wikipedia.org/wiki/${taxon.commonName.replace(/\s+/g, "_")}`,
        },
      }));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results }),
    });
  });

  await page.route("**/v1/taxa/*?include_ancestors=true**", async (route) => {
    const match = route.request().url().match(/\/taxa\/(\d+)\?include_ancestors=true/);
    const id = match?.[1] ?? "41967";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createTaxonResponse(id)),
    });
  });
}

export function getTodayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}
