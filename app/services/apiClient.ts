/**
 * iNaturalist client: ~1 req/s throttle, retries with backoff, validation, optional IndexedDB via `cacheService`.
 * @see useBiologicalAPI.ts
 */

import type { Animal } from "~/types/animal";
import { TAXON_GALLERY_MAX_PHOTOS } from "~/types/taxonGallery";
import type { TaxonGalleryPhoto } from "~/types/taxonGallery";
import type { Clade } from "~/types/clade";
import type { ApiError, ApiResponse } from "~/types/api";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";
import { CacheKeys, cacheService, TTL_VALUES } from "~/services/cacheService";
import type { LocaleKeyedBundle } from "~/services/cacheService";
import {
  validateAnimalData,
  validateCladeData,
} from "~/utils/dataValidation";
import {
  getUserFriendlyError,
  mapHttpStatusToErrorCode,
} from "~/utils/errorMessages";
import type { TaxonDescriptionContext } from "~/utils/taxonDescription";
import { cleanTaxonWikiSummary } from "~/utils/taxonDescription";
import {
  resolveWikipediaArticleUrlForLocale,
  resolveWikipediaDescriptionForLocale,
} from "~/utils/wikipediaResolve";
import { buildLineageFromAncestors } from "~/utils/taxonLineage";

const INATURALIST_BASE_URL = "https://api.inaturalist.org/v1";
// ~1 request / second to respect iNaturalist API recommended practices.
// See: https://www.inaturalist.org/pages/api+recommended+practices
const RATE_LIMIT_DELAY = 1000;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000; // 5 seconds timeout between retries

class RateLimiter {
  private lastRequestTime = 0;
  private requestQueue: Array<() => void> = [];
  private isProcessing = false;

  async throttle(): Promise<void> {
    return new Promise((resolve) => {
      this.requestQueue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Process queued requests with rate limiting
   * Ensures requests are spaced by RATE_LIMIT_DELAY
   */
  private processQueue(): void {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delay = Math.max(0, RATE_LIMIT_DELAY - timeSinceLastRequest);

    setTimeout(() => {
      this.lastRequestTime = Date.now();
      const resolve = this.requestQueue.shift();
      this.isProcessing = false;

      if (resolve) {
        resolve();
      }

      // Process next item in queue
      if (this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, delay);
  }
}

/**
 * iNaturalist API Response Types
 */
interface INaturalistTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  rank: string;
  rank_level?: number;
  ancestry?: string;
  ancestor_ids?: number[];
  ancestors?: INaturalistTaxon[];
  iconic_taxon_name?: string;
  wikipedia_url?: string;
  wikipedia_summary?: string;
  observations_count?: number;
  default_photo?: INaturalistPhoto;
  taxon_photos?: Array<{ photo?: INaturalistPhoto }>;
}

interface INaturalistPhoto {
  id?: number;
  medium_url?: string;
  large_url?: string;
  square_url?: string;
  attribution?: string;
}

interface INaturalistResponse {
  results: INaturalistTaxon[];
}

interface INaturalistSearchResult<TRecord> {
  type?: string;
  score?: number;
  record?: TRecord;
}

interface INaturalistSearchResponse {
  results: Array<INaturalistSearchResult<INaturalistTaxon>>;
}

interface SearchHealthSample {
  timestamp: number;
  success: boolean;
}

/**
 * API Client Implementation
 */
class INaturalistAPIClient implements BiologicalAPIClient {
  private rateLimiter: RateLimiter;
  private searchHealthWindowMs = 2 * 60 * 1000; // 2 minutes
  private searchHealthSamples: SearchHealthSample[] = [];
  /** When set (e.g. Vitest), overrides Nuxt i18n for `locale=` and cache keys. */
  private readonly forcedLocale: string | undefined;

  constructor(forcedLocale?: string) {
    this.rateLimiter = new RateLimiter();
    this.forcedLocale = forcedLocale;
  }

  private getActiveLocale(): string | null {
    if (this.forcedLocale !== undefined) {
      return this.forcedLocale;
    }
    try {
      const nuxtApp = useNuxtApp() as { $i18n?: { locale?: string | { value?: string } } };
      const locale = nuxtApp.$i18n?.locale;
      if (typeof locale === "string") return locale;
      if (locale && typeof locale.value === "string") return locale.value;
    } catch {
      // No active Nuxt app (tests / isolated calls).
    }
    return null;
  }

  private withLocaleParams(url: string): string {
    const nextUrl = new URL(url);
    const locale = this.getActiveLocale() ?? "en";
    nextUrl.searchParams.set("locale", locale);
    return nextUrl.toString();
  }

  private normalizeLocaleCacheKey(): string {
    return this.getActiveLocale() ?? "en";
  }

  /**
   * Set `locale` query param explicitly (does not depend on current UI locale).
   * @param url - URL to set the locale query param on
   * @param locale - App locale (`fr`, `en`, …)
   * @returns URL with the locale query param set
   */
  private withExplicitLocale(url: string, locale: string): string {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("locale", locale);
    return nextUrl.toString();
  }

  /**
   * Non-English UI: when the localized iNaturalist taxon has no `wikipedia_url`, fetch the English
   * taxon and bridge via Wikipedia langlinks + REST. If the localized summary already cleans to a
   * usable paragraph but the URL is missing, only fills `wikipedia_url`. If the summary is empty
   * or junk after cleaning, replaces both URL and summary from the resolved target-language article.
   * When a URL exists but the summary is unusable, this does nothing - {@link enrichEntityWikipediaRestIfNeeded} runs after mapping.
   * @param id - iNaturalist taxon ID
   * @param primary - iNaturalist taxon fields for the requested locale
   * @param localeKey - App locale (`fr`, `en`, …)
   * @returns Merged wiki fields to apply on the primary taxon
   */
  private async hydrateTaxonWikipediaFromEnglishInatIfNeeded(
    id: string,
    primary: INaturalistTaxon,
    localeKey: string,
  ): Promise<INaturalistTaxon> {
    if (localeKey === "en") {
      return primary;
    }

    const ctx: TaxonDescriptionContext = {
      scientificName: primary.name,
      commonName: primary.preferred_common_name || primary.name,
    };
    const primaryClean = cleanTaxonWikiSummary(primary.wikipedia_summary, ctx);
    const missingUrl = !primary.wikipedia_url?.trim();

    if (!missingUrl) {
      return primary;
    }

    const enUrl = this.withExplicitLocale(`${INATURALIST_BASE_URL}/taxa/${id}`, "en");
    let englishTaxon: INaturalistTaxon | null = null;
    try {
      const enResponse = await this.makeRequest<INaturalistResponse>(enUrl);
      englishTaxon = enResponse.results?.[0] ?? null;
    } catch {
      return primary;
    }

    const enWiki = englishTaxon?.wikipedia_url?.trim();
    if (!englishTaxon || !enWiki) {
      return primary;
    }

    if (primaryClean && missingUrl) {
      const localizedUrl = (await resolveWikipediaArticleUrlForLocale(enWiki, localeKey)) ?? enWiki;
      return {
        ...primary,
        /* eslint-disable camelcase -- iNaturalist taxon JSON field names */
        wikipedia_url: localizedUrl,
        /* eslint-enable camelcase */
      };
    }

    const resolved = await resolveWikipediaDescriptionForLocale(enWiki, localeKey);
    if (resolved) {
      return {
        ...primary,
        /* eslint-disable camelcase -- iNaturalist taxon JSON field names */
        wikipedia_url: resolved.articleUrl,
        wikipedia_summary: resolved.descriptionHtml,
        /* eslint-enable camelcase */
      };
    }

    if (missingUrl) {
      const fallbackUrl = (await resolveWikipediaArticleUrlForLocale(enWiki, localeKey)) ?? enWiki;
      return {
        ...primary,
        /* eslint-disable camelcase -- iNaturalist taxon JSON field names */
        wikipedia_url: fallbackUrl,
        /* eslint-enable camelcase */
      };
    }

    return primary;
  }

  /**
   * After mapping, if `description` is still empty: resolve the target-language Wikipedia article
   * from `wikipediaUrl` (langlinks + REST `extract`). Updates `description` and canonical
   * `wikipediaUrl` when successful. If REST returns no extract (e.g. disambiguation), still tries to
   * set a localized article URL via langlinks, or keeps the canonical REST `articleUrl` when the
   * extract was filtered by {@link cleanTaxonWikiSummary}.
   * @param entity - Entity to enrich with Wikipedia information
   * @param localeKey - App locale (`fr`, `en`, …)
   * @param ctx - Taxon description context
   * @returns Enriched entity with Wikipedia information
   */
  private async enrichEntityWikipediaRestIfNeeded<
    T extends { description?: string; wikipediaUrl?: string },
  >(
    entity: T,
    localeKey: string,
    ctx: TaxonDescriptionContext,
  ): Promise<T> {
    if (cleanTaxonWikiSummary(entity.description, ctx)) {
      return entity;
    }
    if (!entity.wikipediaUrl) {
      return entity;
    }

    const resolved = await resolveWikipediaDescriptionForLocale(entity.wikipediaUrl, localeKey);
    if (!resolved) {
      const urlOnly = await resolveWikipediaArticleUrlForLocale(entity.wikipediaUrl, localeKey);
      if (urlOnly) {
        return { ...entity, wikipediaUrl: urlOnly };
      }
      return entity;
    }

    const cleaned = cleanTaxonWikiSummary(resolved.descriptionHtml, ctx);
    if (!cleaned) {
      return {
        ...entity,
        wikipediaUrl: resolved.articleUrl,
      };
    }

    return {
      ...entity,
      description: cleaned,
      wikipediaUrl: resolved.articleUrl,
    };
  }

  private isLocaleKeyedBundle(raw: unknown): raw is LocaleKeyedBundle<Animal | Clade> {
    if (typeof raw !== "object" || raw === null || !("locales" in raw)) {
      return false;
    }
    const loc = (raw as { locales: unknown }).locales;
    return typeof loc === "object" && loc !== null && !Array.isArray(loc);
  }

  private toAnimalBundle(raw: unknown): LocaleKeyedBundle<Animal> {
    if (this.isLocaleKeyedBundle(raw)) {
      return { locales: { ...(raw.locales as Partial<Record<string, Animal>>) } };
    }
    if (raw && typeof raw === "object" && "id" in raw) {
      return { locales: { en: raw as Animal } };
    }
    return { locales: {} };
  }

  private toCladeBundle(raw: unknown): LocaleKeyedBundle<Clade> {
    if (this.isLocaleKeyedBundle(raw)) {
      return { locales: { ...(raw.locales as Partial<Record<string, Clade>>) } };
    }
    if (raw && typeof raw === "object" && "name" in raw) {
      return { locales: { en: raw as Clade } };
    }
    return { locales: {} };
  }

  private pickLocalized<T>(bundle: LocaleKeyedBundle<T>, localeKey: string): T | null {
    const hit = bundle.locales[localeKey];
    return hit !== undefined ? hit : null;
  }

  /**
   * Extract up to `limit` distinct taxon photos from an iNaturalist taxon payload.
   * @param taxon - Taxon record including `default_photo` and `taxon_photos`
   * @param limit - Maximum number of photos to return
   * @returns Array of taxon gallery photos
   */
  private extractTaxonGalleryPhotos(
    taxon: INaturalistTaxon,
    limit: number,
  ): TaxonGalleryPhoto[] {
    const seen = new Set<string>();
    const photos: TaxonGalleryPhoto[] = [];

    const pushPhoto = (raw: INaturalistPhoto | undefined): void => {
      if (!raw?.medium_url) return;
      const key = raw.id != null ? `id:${raw.id}` : `url:${raw.medium_url}`;
      if (seen.has(key)) return;
      seen.add(key);
      photos.push({
        id: raw.id != null ? String(raw.id) : key,
        mediumUrl: raw.medium_url,
        largeUrl: raw.large_url,
        attribution: raw.attribution,
      });
    };

    pushPhoto(taxon.default_photo);
    for (const entry of taxon.taxon_photos ?? []) {
      pushPhoto(entry.photo);
      if (photos.length >= limit) break;
    }

    return photos.slice(0, limit);
  }

  /**
   * Fetch a small preview set of community photos for a taxon (win-state gallery).
   * Uses one `/taxa/:id` request; results are cached separately from full animal records.
   * @param id - iNaturalist taxon ID
   * @param limit - Max photos to return (default {@link TAXON_GALLERY_MAX_PHOTOS})
   * @returns ApiResponse with array of taxon gallery photos or error
   */
  async fetchTaxonGalleryPhotos(
    id: string,
    limit: number = TAXON_GALLERY_MAX_PHOTOS,
  ): Promise<ApiResponse<TaxonGalleryPhoto[]>> {
    const cappedLimit = Math.max(1, Math.min(limit, TAXON_GALLERY_MAX_PHOTOS));
    const cacheKey = CacheKeys.taxonGallery(id);

    const cached = await cacheService.get<TaxonGalleryPhoto[]>("animals", cacheKey);
    if (cached !== null) {
      return { data: cached.slice(0, cappedLimit), error: null };
    }

    const url = this.withLocaleParams(`${INATURALIST_BASE_URL}/taxa/${id}`);

    try {
      const response = await this.makeRequest<INaturalistResponse>(url);
      const taxon = response.results?.[0];
      if (!taxon) {
        return this.createErrorResponse(
          getUserFriendlyError("ANIMAL_NOT_FOUND"),
          "ANIMAL_NOT_FOUND",
        );
      }

      const photos = this.extractTaxonGalleryPhotos(taxon, cappedLimit);
      await cacheService.set("animals", cacheKey, photos, TTL_VALUES.TAXON_GALLERY);
      return { data: photos, error: null };
    } catch (error) {
      return this.handleError(error, url);
    }
  }

  /**
   * Fetch animal data by ID
   * Implements hybrid caching: checks IndexedDB cache first, then fetches from API
   * @param id - Unique identifier for the animal
   * @returns Promise resolving to ApiResponse with Animal data or error
   */
  async fetchAnimalData(id: string): Promise<ApiResponse<Animal>> {
    const cacheKey = CacheKeys.animal(id);
    const localeKey = this.normalizeLocaleCacheKey();

    const cachedRaw = await cacheService.get<Animal | LocaleKeyedBundle<Animal>>(
      "animals",
      cacheKey,
    );
    if (cachedRaw !== null) {
      const bundle = this.toAnimalBundle(cachedRaw);
      const hit = this.pickLocalized(bundle, localeKey);
      if (hit) {
        const ctx: TaxonDescriptionContext = {
          scientificName: hit.scientificName,
          commonName: hit.name,
        };
        const description = cleanTaxonWikiSummary(hit.description, ctx);
        let data: Animal = { ...hit, description };
        if (!description && hit.wikipediaUrl) {
          data = await this.enrichEntityWikipediaRestIfNeeded(data, localeKey, ctx);
        }
        return { data, error: null };
      }
    }

    // 2. Cache miss - fetch from API
    // Include ancestor information to build lineage
    const url = this.withLocaleParams(`${INATURALIST_BASE_URL}/taxa/${id}?include_ancestors=true`);

    try {
      const response = await this.makeRequest<INaturalistResponse>(url);

      if (!response.results || response.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("ANIMAL_NOT_FOUND"),
          "ANIMAL_NOT_FOUND",
        );
      }

      const taxon = response.results[0]!;
      const mergedTaxon = await this.hydrateTaxonWikipediaFromEnglishInatIfNeeded(
        id,
        taxon,
        localeKey,
      );
      const mappedAnimal = await this.mapToAnimal(mergedTaxon);

      const validation = validateAnimalData(mappedAnimal);

      if (!validation.valid) {
        this.logError("Animal Data Validation Failed", {
          animalId: id,
          errors: validation.errors,
          rawData: taxon,
        });

        return this.createErrorResponse(
          getUserFriendlyError("VALIDATION_ERROR"),
          "VALIDATION_ERROR",
          { validationErrors: validation.errors },
        );
      }

      let data = validation.data!;
      data = await this.enrichEntityWikipediaRestIfNeeded(data, localeKey, {
        scientificName: data.scientificName,
        commonName: data.name,
      });

      // 3. Cache the validated result per locale under one taxon key
      const cachedAgain = await cacheService.get<Animal | LocaleKeyedBundle<Animal>>(
        "animals",
        cacheKey,
      );
      const bundle = this.toAnimalBundle(cachedAgain);
      bundle.locales[localeKey] = data;
      await cacheService.set("animals", cacheKey, bundle, TTL_VALUES.ANIMAL);

      return { data, error: null };
    } catch (error) {
      return this.handleError(error, url);
    }
  }

  /**
   * Search for animals by name
   * Searches iNaturalist API for animals matching the query
   * Filters for Metazoa (animals) only, excluding plants and other kingdoms
   * Prioritizes common name matches but includes scientific name matches
   * @param query - Search query (animal name or scientific name)
   * @param limit - Maximum number of results to return (default: 20)
   * @returns Promise resolving to ApiResponse with array of Animal data or error
   */
  async searchAnimals(query: string, limit: number = 20): Promise<ApiResponse<Animal[]>> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return { data: [], error: null };
    }

    // Use iNaturalist's relevance-ranked search endpoint.
    // Unlike /taxa, /search ranks by textual match score (better for "Tiger" → Panthera tigris).
    // Caveat: /search doesn't support the same filters (rank/taxon_id) we used before, so we
    // post-filter results client-side to keep only Animalia + species/subspecies taxa.
    // Try to use iconic_taxa filter if supported by the search endpoint
    const url = this.withLocaleParams(`${INATURALIST_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}&sources=taxa&per_page=${limit * 3}`);
    const searchDiagnostics: {
      queryIntent?: "broad" | "specific";
      thresholdsByGroup?: Record<string, number>;
      filteredByMinObservations?: number;
    } = {};

    try {
      const response = await this.makeRequest<INaturalistSearchResponse>(url);

      if (!response.results || response.results.length === 0) {
        // HTTP succeeded but no hits - counts as a healthy provider response for outage heuristics.
        this.recordSearchOutcome(true);
        return { data: [], error: null };
      }

      const ANIMALIA_TAXON_ID = 48460;
      const PLANTAE_TAXON_ID = 47126;
      const FUNGI_TAXON_ID = 47125;

      const isAnimaliaDescendant = (taxon: INaturalistTaxon): boolean => {
        // Check if this is Animalia itself
        if (taxon.id === ANIMALIA_TAXON_ID) return true;

        // Explicitly exclude Plantae and Fungi by ID
        if (taxon.id === PLANTAE_TAXON_ID || taxon.id === FUNGI_TAXON_ID) {
          return false;
        }

        if (taxon.iconic_taxon_name) {
          if (taxon.iconic_taxon_name === "Plantae" || taxon.iconic_taxon_name === "Fungi") {
            return false;
          }
          if (taxon.iconic_taxon_name === "Animalia") {
            return true;
          }
          // For other iconic taxa (Mammalia, Aves, etc.), check ancestry to verify
          // they're descendants of Animalia
        }

        const ancestorIds = taxon.ancestor_ids || [];

        if (ancestorIds.includes(PLANTAE_TAXON_ID) || ancestorIds.includes(FUNGI_TAXON_ID)) {
          return false;
        }

        if (ancestorIds.includes(ANIMALIA_TAXON_ID)) {
          return true;
        }

        // Check ancestry string as fallback
        if (typeof taxon.ancestry === "string") {
          const ancestryIds = taxon.ancestry
            .split("/")
            .map(p => Number.parseInt(p.trim(), 10))
            .filter(n => !Number.isNaN(n));

          if (ancestryIds.includes(PLANTAE_TAXON_ID) || ancestryIds.includes(FUNGI_TAXON_ID)) {
            return false;
          }

          if (ancestryIds.includes(ANIMALIA_TAXON_ID)) {
            return true;
          }
        }

        return false;
      };

      const allowedRanks = new Set(["species", "subspecies"]);
      type QueryIntent = "broad" | "specific";
      type TaxonomyGroup = "mammalBird" | "reptileAmphibianFish" | "arthropod" | "otherAnimal";
      const BASE_MIN_OBSERVATIONS: Record<TaxonomyGroup, number> = {
        mammalBird: 700,
        reptileAmphibianFish: 1500,
        arthropod: 5000,
        otherAnimal: 1200,
      };
      // For specific queries (or exact species-name matches), we lower the base threshold
      // to this fraction so rare-but-known species can still appear in results.
      // Example: base 5000 for arthropods becomes 1250 when relaxation is applied.
      const SPECIFIC_QUERY_RELAXATION = 0.25;

      const normalize = (value?: string): string => (value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const normalizedQuery = normalize(trimmedQuery);
      const queryTokens = normalizedQuery.split(" ").filter(Boolean);

      const queryIntent: QueryIntent = (normalizedQuery.length > 3
        && (queryTokens.length >= 2 || normalizedQuery.length >= 8))
        ? "specific"
        : "broad";

      const isStrongNameMatch = (taxon: INaturalistTaxon): boolean => {
        if (!normalizedQuery) return false;
        const scientific = normalize(taxon.name);
        const common = normalize(taxon.preferred_common_name);
        const aliases = [scientific, common].filter(Boolean);
        return aliases.some(alias =>
          alias === normalizedQuery
          || alias.startsWith(`${normalizedQuery} `)
          || normalizedQuery.startsWith(`${alias} `));
      };

      const getTaxonomyGroup = (taxon: INaturalistTaxon): TaxonomyGroup => {
        // If the result has an iconic taxon name, we can use it to determine the taxonomy group.
        const iconic = (taxon.iconic_taxon_name || "").toLowerCase();
        if (["mammalia", "aves"].includes(iconic)) return "mammalBird";
        if (["reptilia", "amphibia", "actinopterygii"].includes(iconic)) return "reptileAmphibianFish";
        if (["insecta", "arachnida"].includes(iconic)) return "arthropod";
        if (iconic) return "otherAnimal";

        // If the result does not have an iconic taxon name, we can use the ancestry to determine the taxonomy group.
        const ancestryIds = new Set<number>();
        for (const id of taxon.ancestor_ids || []) ancestryIds.add(id);
        if (typeof taxon.ancestry === "string") {
          for (const raw of taxon.ancestry.split("/")) {
            const parsed = Number.parseInt(raw.trim(), 10);
            if (!Number.isNaN(parsed)) ancestryIds.add(parsed);
          }
        }

        // Class-level fallback IDs in iNaturalist
        if (ancestryIds.has(40151) || ancestryIds.has(3)) return "mammalBird";
        if (ancestryIds.has(26036) || ancestryIds.has(20978) || ancestryIds.has(47178)) return "reptileAmphibianFish";
        if (ancestryIds.has(47158) || ancestryIds.has(47119)) return "arthropod";
        return "otherAnimal";
      };

      const computeMinObservations = (group: TaxonomyGroup, strongNameMatch: boolean): number => {
        const base = BASE_MIN_OBSERVATIONS[group];
        if (strongNameMatch || queryIntent === "specific") {
          return Math.max(1, Math.floor(base * SPECIFIC_QUERY_RELAXATION));
        }
        return base;
      };

      const diagnostics = {
        queryIntent,
        filteredByMinObservations: 0,
        thresholdsByGroup: {} as Record<TaxonomyGroup, number>,
      };
      searchDiagnostics.queryIntent = diagnostics.queryIntent;
      searchDiagnostics.thresholdsByGroup = diagnostics.thresholdsByGroup;
      searchDiagnostics.filteredByMinObservations = diagnostics.filteredByMinObservations;

      const processResults = (results: Array<INaturalistSearchResult<INaturalistTaxon>>) => {
        const candidates: Array<{
          animal: Animal;
          score: number;
          popularityScore: number;
          exactMatch: boolean;
          idx: number;
        }> = [];

        for (let idx = 0; idx < results.length; idx++) {
          const item = results[idx];
          const taxon = item?.record;
          if (!taxon) continue;

          const itemType = (item.type || "").toLowerCase();
          if (itemType && itemType !== "taxon" && itemType !== "taxa") continue;

          if (!taxon.rank || !allowedRanks.has(taxon.rank)) continue;

          if (!isAnimaliaDescendant(taxon)) continue;

          const observationsCount = taxon.observations_count ?? 0;
          const exactMatch = isStrongNameMatch(taxon);
          const taxonomyGroup = getTaxonomyGroup(taxon);
          const minObservations = computeMinObservations(taxonomyGroup, exactMatch);
          diagnostics.thresholdsByGroup[taxonomyGroup] = minObservations;
          if (observationsCount === 0 || observationsCount < minObservations) {
            diagnostics.filteredByMinObservations++;
            continue;
          }

          const mappedAnimal = this.mapToAnimalLightweight(taxon);
          const validation = validateAnimalData(mappedAnimal);
          if (!validation.valid || !validation.data) continue;

          candidates.push({
            animal: validation.data,
            score: typeof item.score === "number" ? item.score : 0,
            popularityScore: Math.log10(observationsCount + 1),
            exactMatch,
            idx,
          });
        }

        return candidates;
      };

      let allCandidates = processResults(response.results);

      if (allCandidates.length < 5 && response.results.length === limit * 3) {
        try {
          const nextPageUrl = this.withLocaleParams(`${INATURALIST_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}&sources=taxa&per_page=${limit * 3}&page=2`);
          const nextPageResponse = await this.makeRequest<INaturalistSearchResponse>(nextPageUrl);

          if (nextPageResponse.results && nextPageResponse.results.length > 0) {
            const nextPageCandidates = processResults(nextPageResponse.results);
            allCandidates = [...allCandidates, ...nextPageCandidates];
          }
        } catch (error) {
          // If fetching next page fails, continue with what we have
          this.logError("Animal Search Pagination Error", {
            query: trimmedQuery,
            queryIntent: diagnostics.queryIntent,
            thresholdsByGroup: diagnostics.thresholdsByGroup,
            filteredByMinObservations: diagnostics.filteredByMinObservations,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Keep iNaturalist relevance score as primary ordering.
      allCandidates.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
        if (a.popularityScore !== b.popularityScore) return b.popularityScore - a.popularityScore;
        return a.idx - b.idx; // stable fallback
      });

      this.recordSearchOutcome(true);
      return { data: allCandidates.slice(0, limit).map(c => c.animal), error: null };
    } catch (error) {
      this.recordSearchOutcome(false);
      const outageLikely = this.isLikelySearchOutage();

      this.logError("Animal Search Error", {
        query: trimmedQuery,
        queryIntent: searchDiagnostics.queryIntent,
        thresholdsByGroup: searchDiagnostics.thresholdsByGroup,
        filteredByMinObservations: searchDiagnostics.filteredByMinObservations,
        error: error instanceof Error ? error.message : String(error),
        outageLikely,
      });

      // Keep search UX resilient, but expose structured provider outage signals
      // so UI can show explicit iNaturalist degradation messaging.
      return {
        data: [],
        error: {
          code: "API_UNAVAILABLE",
          message: outageLikely
            ? "iNaturalist appears to be unavailable right now. Search is temporarily degraded."
            : "Search is temporarily unavailable. Please try again.",
          details: {
            provider: "iNaturalist",
            operation: "search",
            outageLikely,
          },
        },
      };
    }
  }

  private recordSearchOutcome(success: boolean): void {
    const now = Date.now();
    this.searchHealthSamples.push({ timestamp: now, success });
    this.searchHealthSamples = this.searchHealthSamples
      .filter(sample => now - sample.timestamp <= this.searchHealthWindowMs)
      .slice(-12);
  }

  private isLikelySearchOutage(): boolean {
    const samples = this.searchHealthSamples;
    if (samples.length < 3) return false;

    let consecutiveFailures = 0;
    for (let i = samples.length - 1; i >= 0; i--) {
      if (!samples[i]?.success) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures >= 3) {
      return true;
    }

    const recentWindow = samples.slice(-5);
    const failures = recentWindow.filter(sample => !sample.success).length;
    return recentWindow.length >= 4 && failures >= 4;
  }

  /**
   * Fetch clade data by name
   * Implements hybrid caching: checks IndexedDB cache first, then fetches from API
   * @param name - Name of the clade to fetch
   * @returns Promise resolving to ApiResponse with Clade data or error
   */
  async fetchCladeData(name: string): Promise<ApiResponse<Clade>> {
    const localeKey = this.normalizeLocaleCacheKey();

    const searchUrl = this.withLocaleParams(`${INATURALIST_BASE_URL}/taxa?q=${encodeURIComponent(name)}`);

    try {
      const searchResponse = await this.makeRequest<INaturalistResponse>(searchUrl);

      if (!searchResponse.results || searchResponse.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("CLADE_NOT_FOUND"),
          "CLADE_NOT_FOUND",
        );
      }

      const taxonId = searchResponse.results[0]!.id;
      const cacheKey = CacheKeys.cladeByTaxonId(taxonId);

      const cachedRaw = await cacheService.get<Clade | LocaleKeyedBundle<Clade>>(
        "clades",
        cacheKey,
      );
      if (cachedRaw !== null) {
        const bundle = this.toCladeBundle(cachedRaw);
        const hit = this.pickLocalized(bundle, localeKey);
        if (hit) {
          const ctx: TaxonDescriptionContext = {
            scientificName: hit.name,
            commonName: hit.preferredCommonName,
          };
          const description = cleanTaxonWikiSummary(hit.description, ctx);
          let data: Clade = { ...hit, description };
          if (!description && hit.wikipediaUrl) {
            data = await this.enrichEntityWikipediaRestIfNeeded(data, localeKey, ctx);
          }
          return { data, error: null };
        }
      }

      const detailUrl = this.withLocaleParams(`${INATURALIST_BASE_URL}/taxa/${taxonId}`);
      const detailResponse = await this.makeRequest<INaturalistResponse>(detailUrl);

      if (!detailResponse.results || detailResponse.results.length === 0) {
        return this.createErrorResponse(
          getUserFriendlyError("CLADE_NOT_FOUND"),
          "CLADE_NOT_FOUND",
        );
      }

      const taxon = detailResponse.results[0]!;
      const mergedTaxon = await this.hydrateTaxonWikipediaFromEnglishInatIfNeeded(
        String(taxonId),
        taxon,
        localeKey,
      );
      const mappedClade = this.mapToClade(mergedTaxon);

      const validation = validateCladeData(mappedClade);

      if (!validation.valid) {
        this.logError("Clade Data Validation Failed", {
          cladeName: name,
          errors: validation.errors,
          rawData: taxon,
        });

        return this.createErrorResponse(
          getUserFriendlyError("VALIDATION_ERROR"),
          "VALIDATION_ERROR",
          { validationErrors: validation.errors },
        );
      }

      let data = validation.data!;
      data = await this.enrichEntityWikipediaRestIfNeeded(data, localeKey, {
        scientificName: data.name,
        commonName: data.preferredCommonName,
      });

      const cachedAgain = await cacheService.get<Clade | LocaleKeyedBundle<Clade>>(
        "clades",
        cacheKey,
      );
      const bundle = this.toCladeBundle(cachedAgain);
      bundle.locales[localeKey] = data;
      await cacheService.set("clades", cacheKey, bundle, TTL_VALUES.CLADE);

      return { data, error: null };
    } catch (error) {
      return this.handleError(error, searchUrl);
    }
  }

  /**
   * Make HTTP request with rate limiting, retries, and timeout
   * @param url - URL to request
   * @returns Promise resolving to parsed JSON response
   */
  private async makeRequest<T>(url: string): Promise<T> {
    await this.rateLimiter.throttle();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          signal: controller.signal,
          cache: "default", // Use browser's HTTP cache
          headers: {
            Accept: "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const shouldRetry = this.shouldRetry(response.status);

          if (!shouldRetry) {
            // Don't retry on client errors (4xx)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Log and retry server errors (5xx) and rate limits (429)
          this.logError("API Error", {
            endpoint: url,
            status: response.status,
            attempt: attempt + 1,
          });

          if (attempt < MAX_RETRIES - 1) {
            // If we were rate-limited, prefer server-provided backoff (Retry-After) when present.
            if (response.status === 429) {
              const retryAfterMs = this.getRetryAfterMs(response);
              if (retryAfterMs !== null) {
                await this.wait(retryAfterMs);
              } else {
                await this.waitForBackoff(attempt);
              }
            } else {
              await this.waitForBackoff(attempt);
            }
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error: any) {
        lastError = error;

        if (error.name === "AbortError") {
          this.logError("API Error", {
            endpoint: url,
            error: "Request timeout",
            attempt: attempt + 1,
          });

          if (attempt < MAX_RETRIES - 1) {
            await this.waitForBackoff(attempt);
            continue;
          }

          // Create custom error to distinguish timeout from network errors
          const timeoutError = new Error("Request timed out");
          timeoutError.name = "TimeoutError";
          throw timeoutError;
        }

        if (error instanceof TypeError) {
          this.logError("API Error", {
            endpoint: url,
            error: error.message,
            attempt: attempt + 1,
          });

          if (attempt < MAX_RETRIES - 1) {
            await this.waitForBackoff(attempt);
            continue;
          }

          throw error;
        }

        // For HTTP errors that shouldn't retry, throw immediately
        if (error.message && error.message.startsWith("HTTP 4")) {
          throw error;
        }

        // Other errors - retry if not last attempt
        this.logError("API Error", {
          endpoint: url,
          error: error.message || String(error),
          attempt: attempt + 1,
        });

        if (attempt < MAX_RETRIES - 1) {
          await this.waitForBackoff(attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Determine if error should be retried
   * @param status - HTTP status code
   * @returns True if request should be retried, false otherwise
   */
  private shouldRetry(status: number): boolean {
    return status >= 500 || status === 429;
  }

  /**
   * Wait with exponential backoff
   * Delays: 1s, 2s, 4s
   * @param attempt - Current attempt number (0-indexed)
   * @returns Promise that resolves after delay
   */
  private async waitForBackoff(attempt: number): Promise<void> {
    const delay = 2 ** attempt * 1000; // 1s, 2s, 4s
    return this.wait(delay);
  }

  /**
   * Parse Retry-After header (seconds or HTTP date) into a millisecond delay.
   * @param response - HTTP response object
   * @returns Delay in milliseconds, or null if header missing/invalid.
   */
  private getRetryAfterMs(response: Response): number | null {
    const raw = response.headers?.get?.("Retry-After");
    if (!raw) return null;

    // Retry-After can be either seconds or an HTTP date.
    const seconds = Number.parseInt(raw, 10);
    if (!Number.isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const dateMs = Date.parse(raw);
    if (!Number.isNaN(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }

    return null;
  }

  private async wait(delayMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Map iNaturalist taxon to Animal (lightweight version for search).
   * Does not fetch lineage - use when the animal is only shown in search results.
   * @param taxon - iNaturalist taxon object
   * @returns Animal object with minimal data (empty `lineage`)
   */
  private mapToAnimalLightweight(taxon: INaturalistTaxon): Animal {
    const scientificName = taxon.name;
    const name = taxon.preferred_common_name || taxon.name;

    return {
      id: String(taxon.id),
      name,
      scientificName,
      lineage: [],
      url: `https://www.inaturalist.org/taxa/${taxon.id}`,
      wikipediaUrl: taxon.wikipedia_url,
      imageUrl: taxon.default_photo?.medium_url,
      description: cleanTaxonWikiSummary(taxon.wikipedia_summary, {
        scientificName,
        commonName: name,
      }),
    };
  }

  /**
   * Map iNaturalist taxon to Animal (full version with lineage).
   * Fetches complete lineage - use when an animal is selected or loaded as a target.
   * @param taxon - iNaturalist taxon object
   * @returns Animal with mapped fields including `lineage`
   */
  private async mapToAnimal(taxon: INaturalistTaxon): Promise<Animal> {
    const scientificName = taxon.name;
    const name = taxon.preferred_common_name || taxon.name;
    const lineage = await this.parseLineage(taxon);

    return {
      id: String(taxon.id),
      name,
      scientificName,
      lineage,
      url: `https://www.inaturalist.org/taxa/${taxon.id}`,
      wikipediaUrl: taxon.wikipedia_url,
      imageUrl: taxon.default_photo?.medium_url,
      description: cleanTaxonWikiSummary(taxon.wikipedia_summary, {
        scientificName,
        commonName: name,
      }),
    };
  }

  /**
   * Map iNaturalist taxon to Clade
   * @param taxon - iNaturalist taxon object
   * @returns Clade object with mapped fields
   */
  private mapToClade(taxon: INaturalistTaxon): Clade {
    const displayName = taxon.preferred_common_name || taxon.name;
    const preferredCommonName = displayName !== taxon.name ? displayName : undefined;
    return {
      name: taxon.name,
      rank: taxon.rank,
      preferredCommonName,
      url: `https://www.inaturalist.org/taxa/${taxon.id}`,
      wikipediaUrl: taxon.wikipedia_url,
      imageUrl: taxon.default_photo?.medium_url,
      description: cleanTaxonWikiSummary(taxon.wikipedia_summary, {
        scientificName: taxon.name,
        commonName: preferredCommonName,
      }),
    };
  }

  /**
   * Parse iNaturalist ancestry into `Animal.lineage`.
   * Fetches ancestor taxa when `include_ancestors` is not present on the taxon payload.
   * @param taxon - iNaturalist taxon object with ancestry or ancestor_ids
   * @returns Lineage array from kingdom (or Animalia) through species
   */
  private async parseLineage(taxon: INaturalistTaxon): Promise<Animal["lineage"]> {
    if (taxon.ancestors && Array.isArray(taxon.ancestors) && taxon.ancestors.length > 0) {
      return buildLineageFromAncestors(taxon.ancestors, taxon);
    }

    // Otherwise, fetch ancestors using ancestor_ids or ancestry string
    const ancestorIds = this.extractAncestorIds(taxon);
    if (ancestorIds.length === 0) {
      return buildLineageFromAncestors([], taxon);
    }

    const ancestors = await this.fetchAncestorTaxa(ancestorIds);
    return buildLineageFromAncestors(ancestors, taxon);
  }

  /**
   * Extract ancestor IDs from taxon
   * @param taxon - iNaturalist taxon object
   * @returns Array of ancestor IDs
   */
  private extractAncestorIds(taxon: INaturalistTaxon): number[] {
    // Prefer ancestor_ids array if available
    if (taxon.ancestor_ids && Array.isArray(taxon.ancestor_ids)) {
      return taxon.ancestor_ids;
    }

    // Fallback to parsing ancestry string
    if (taxon.ancestry && typeof taxon.ancestry === "string") {
      return taxon.ancestry
        .split("/")
        .map(id => Number.parseInt(id.trim(), 10))
        .filter(id => !Number.isNaN(id));
    }

    return [];
  }

  /**
   * Fetch ancestor taxa by their IDs
   * Uses batch API call to fetch multiple taxa at once
   * @param ancestorIds - Array of ancestor taxon IDs
   * @returns Promise resolving to array of ancestor taxon objects
   */
  private async fetchAncestorTaxa(ancestorIds: number[]): Promise<INaturalistTaxon[]> {
    if (ancestorIds.length === 0) {
      return [];
    }

    try {
      // iNaturalist API supports fetching multiple taxa by ID using comma-separated IDs
      const idsParam = ancestorIds.join(",");
      const url = this.withLocaleParams(`${INATURALIST_BASE_URL}/taxa/${idsParam}`);

      const response = await this.makeRequest<INaturalistResponse>(url);

      if (!response.results || response.results.length === 0) {
        return [];
      }

      // Return results in the order they were requested (important for lineage order)
      const taxaMap = new Map(response.results.map(t => [t.id, t]));
      return ancestorIds
        .map(id => taxaMap.get(id))
        .filter((t): t is INaturalistTaxon => t !== undefined);
    } catch (error) {
      this.logError("Failed to fetch ancestor taxa", {
        ancestorIds,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Handle errors and create error response
   * @param error - Error object
   * @param endpoint - API endpoint that failed
   * @returns ApiResponse with error information
   */
  private handleError(error: any, endpoint: string): ApiResponse<never> {
    this.logError("API Error", {
      endpoint,
      error: error.message || String(error),
    });

    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return this.createErrorResponse(
        getUserFriendlyError("TIMEOUT"),
        "TIMEOUT",
        { originalError: error.message },
      );
    }

    if (error.message && error.message.includes("404")) {
      const isAnimalEndpoint = endpoint.includes("/taxa/") && !endpoint.includes("?q=");
      const errorCode = isAnimalEndpoint ? "ANIMAL_NOT_FOUND" : "NOT_FOUND";
      return this.createErrorResponse(
        getUserFriendlyError(errorCode),
        errorCode,
        { originalError: error.message },
      );
    }

    if (error.message && error.message.includes("Network error")) {
      return this.createErrorResponse(
        getUserFriendlyError("NETWORK_ERROR"),
        "NETWORK_ERROR",
        { originalError: error.message },
      );
    }

    if (error instanceof TypeError) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return this.createErrorResponse(
          getUserFriendlyError("OFFLINE"),
          "OFFLINE",
          { originalError: error.message },
        );
      }
      return this.createErrorResponse(
        getUserFriendlyError("NETWORK_ERROR"),
        "NETWORK_ERROR",
        { originalError: error.message },
      );
    }

    if (error.message && error.message.includes("Invalid JSON")) {
      return this.createErrorResponse(
        getUserFriendlyError("PARSE_ERROR"),
        "PARSE_ERROR",
        { originalError: error.message },
      );
    }

    const httpStatusMatch = error.message?.match(/HTTP (\d+)/);
    if (httpStatusMatch) {
      const status = Number.parseInt(httpStatusMatch[1], 10);
      const errorCode = mapHttpStatusToErrorCode(status);
      return this.createErrorResponse(
        getUserFriendlyError(errorCode),
        errorCode,
        { originalError: error.message, httpStatus: status },
      );
    }

    return this.createErrorResponse(
      getUserFriendlyError("UNKNOWN_ERROR"),
      "UNKNOWN_ERROR",
      { originalError: error.message || String(error) },
    );
  }

  /**
   * Create standardized error response
   * @param message - User-friendly error message
   * @param code - Error code for programmatic handling
   * @param details - Optional additional error details
   * @returns ApiResponse with error information
   */
  private createErrorResponse(
    message: string,
    code: string,
    details?: any,
  ): ApiResponse<never> {
    const error: ApiError = { message, code, details };

    this.logError("API Client Error", { code, message, details });

    return { data: null, error };
  }

  /**
   * Log errors for monitoring
   * Using console.error for MVP (structured logging post-MVP)
   * @param title - Log title/category
   * @param context - Additional context information
   */
  private logError(title: string, context: Record<string, any>): void {
    console.error(title, {
      timestamp: new Date().toISOString(),
      ...context,
    });
  }
}

/**
 * Create API Client Factory Function
 * Allows for dependency injection and testing
 * @param forcedLocale - When set (e.g. `"fr"`), bypasses Nuxt and uses this locale for iNaturalist
 *   `locale=` and IndexedDB locale keys - intended for Vitest only.
 * @returns New BiologicalAPIClient instance
 */
export function createApiClient(forcedLocale?: string): BiologicalAPIClient {
  return new INaturalistAPIClient(forcedLocale);
}

/**
 * Default export - singleton instance
 */
export const apiClient = createApiClient();
