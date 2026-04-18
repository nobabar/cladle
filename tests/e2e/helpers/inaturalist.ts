import type { Page } from "@playwright/test";

/** Must match `playwright.config.ts` webServer port / baseURL origin. */
const E2E_ORIGIN = "http://localhost:4173";

/**
 * Force English UI for E2E (aligns with @nuxtjs/i18n `cladle_locale` cookie).
 * Call before the first navigation in a test.
 * @param page - Playwright page.
 */
export async function ensureE2ELocale(page: Page) {
  await page.context().addCookies([
    { name: "cladle_locale", value: "en", url: E2E_ORIGIN },
  ]);
}

/**
 * Broad Playwright URL globs for taxa details can accidentally match animal search URLs that
 * include "sources=taxa" in the query string. Use these predicates instead of fragile path globs.
 * @param url - The URL to check.
 * @returns True if the URL is a valid iNaturalist search URL.
 */
export function isINaturalistSearchUrl(url: URL): boolean {
  return url.hostname === "api.inaturalist.org" && url.pathname === "/v1/search";
}

export function isINaturalistTaxonDetailUrl(url: URL): boolean {
  return url.hostname === "api.inaturalist.org"
    && /^\/v1\/taxa\/\d+$/.test(url.pathname)
    && url.searchParams.get("include_ancestors") === "true";
}

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

export async function mockINaturalistSearch(page: Page) {
  await page.route(isINaturalistSearchUrl, async (route) => {
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
}

export async function mockINaturalistTaxa(page: Page) {
  await ensureE2ELocale(page);
  await page.route(isINaturalistTaxonDetailUrl, async (route) => {
    const match = route.request().url().match(/\/taxa\/(\d+)\?include_ancestors=true/);
    const id = match?.[1] ?? "41967";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createTaxonResponse(id)),
    });
  });
}

export async function mockINaturalist(page: Page) {
  await mockINaturalistSearch(page);
  await mockINaturalistTaxa(page);
}

export function getTodayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}
