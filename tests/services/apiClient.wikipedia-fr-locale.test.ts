/**
 * French locale: iNaturalist hydrate (EN taxon + Wikipedia langlinks + REST) and mapping.
 * Uses {@link createApiClient} with a forced locale so Nuxt is not required.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { createApiClient } from "~/services/apiClient";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";
import { cacheService } from "~/services/cacheService";

function fetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof Request) {
    return input.url;
  }
  return String(input);
}

describe("api client — French locale Wikipedia bridge", () => {
  let client: BiologicalAPIClient;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await cacheService.init();
    vi.clearAllMocks();
    vi.useFakeTimers();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    client = createApiClient("fr");
    globalThis.fetch = vi.fn();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    try {
      await cacheService.clear("animals");
      await cacheService.clear("clades");
      await cacheService.clear("lca");
    } catch {
      // ignore
    }
  });

  it("hydrates from EN iNaturalist + fr Wikipedia when FR iNat has no wiki URL", async () => {
    const taxonId = 424483;
    /* eslint-disable camelcase */
    const frInat = {
      results: [{
        id: taxonId,
        name: "Panthera leo",
        preferred_common_name: "Lion",
        rank: "species",
        ancestors: [
          { id: 48460, name: "Animalia", rank: "kingdom" },
          { id: 1, name: "Chordata", rank: "phylum" },
          { id: 2, name: "Mammalia", rank: "class" },
          { id: 355675, name: "Carnivora", rank: "order" },
          { id: 40151, name: "Felidae", rank: "family" },
          { id: 41066, name: "Panthera", rank: "genus" },
        ],
        default_photo: { medium_url: "https://example.com/lion.jpg" },
      }],
    };
    const enInat = {
      results: [{
        id: taxonId,
        name: "Panthera leo",
        preferred_common_name: "Lion",
        rank: "species",
        wikipedia_url: "https://en.wikipedia.org/wiki/Lion",
      }],
    };
    /* eslint-enable camelcase */

    const langlinksJson = {
      query: {
        pages: {
          123: {
            langlinks: [{ "lang": "fr", "*": "Lion" }],
          },
        },
      },
    };

    const restFrJson = {
      type: "standard",
      extract: "Le lion est un mammifère carnivore.",
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = fetchUrl(input);
      if (url.includes("api.inaturalist.org/v1/taxa/424483") && url.includes("locale=fr")) {
        return { ok: true, status: 200, json: async () => frInat } as Response;
      }
      if (
        url.includes("api.inaturalist.org/v1/taxa/424483")
        && url.includes("locale=en")
        && !url.includes("include_ancestors")
      ) {
        return { ok: true, status: 200, json: async () => enInat } as Response;
      }
      if (url.includes("en.wikipedia.org/w/api.php")) {
        return { ok: true, status: 200, json: async () => langlinksJson } as Response;
      }
      if (url.includes("fr.wikipedia.org/api/rest_v1/page/summary")) {
        return { ok: true, status: 200, json: async () => restFrJson } as Response;
      }
      throw new Error(`Unexpected fetch URL in French locale test: ${url}`);
    });

    const promise = client.fetchAnimalData(String(taxonId));
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.name).toBe("Lion");
    expect(result.data?.scientificName).toBe("Panthera leo");
    expect(result.data?.description).toContain("Le lion est un mammifère carnivore.");
    expect(result.data?.wikipediaUrl).toBe("https://fr.wikipedia.org/wiki/Lion");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("taxa/424483?include_ancestors=true&locale=fr"),
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("taxa/424483?locale=en"),
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/en\.wikipedia\.org\/w\/api\.php.*lllang=fr/),
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("fr.wikipedia.org/api/rest_v1/page/summary/Lion"),
      expect.any(Object),
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
