/**
 * Wikipedia REST API (summary), used when iNaturalist omits `wikipedia_summary`
 * for a locale but still exposes a `wikipedia_url` (often EN-only).
 * @see https://www.mediawiki.org/wiki/API:REST_API/Reference
 */

/**
 * Extract article title from a `*.wikipedia.org/wiki/...` URL.
 * @param url - Full Wikipedia article URL
 * @returns Decoded page title, or `null` if not a Wikipedia wiki URL
 */
export function wikipediaTitleFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/\.wikipedia\.org$/i.test(u.hostname)) {
      return null;
    }
    const m = u.pathname.match(/\/wiki\/(.+)/);
    if (!m?.[1]) {
      return null;
    }
    return decodeURIComponent(m[1].replace(/_/g, " "));
  } catch {
    return null;
  }
}

/**
 * Wikipedia language subdomain from app locale (ISO-style code: `fr`, `en`, `de`, …).
 * @param locale - BCP 47 or short code (e.g. `fr`, `en-US`)
 * @returns Lowercase wiki subdomain
 */
export function wikipediaLangFromAppLocale(locale: string): string {
  return locale.split("-")[0]?.toLowerCase() ?? "en";
}

export interface WikipediaSummaryResult {
  extract?: string;
  /** REST `type` e.g. standard, disambiguation */
  pageType?: string;
}

/**
 * Safe HTML wrapper for plain-text REST `extract` (for `sanitizeBasicHTML` downstream).
 * @param extract - Plain text from the REST API
 * @returns Single escaped paragraph element
 */
export function plainExtractToDescriptionHtml(extract: string): string {
  const t = extract.trim();
  const escaped = t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped}</p>`;
}

/**
 * REST `page/summary` by wiki language code and page title (spaces or underscores).
 * @param wikiLang - Wikipedia subdomain language code
 * @param pageTitle - Article title (as in wiki, not necessarily URL-encoded)
 * @returns Extract text and page type, or `null` on 404 / error
 */
export async function fetchWikipediaRestSummaryByTitle(
  wikiLang: string,
  pageTitle: string,
): Promise<WikipediaSummaryResult | null> {
  const segment = pageTitle.trim().replace(/ /g, "_");
  const url = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(segment)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as {
      extract?: string;
      type?: string;
    };
    if (data.type === "disambiguation") {
      return { pageType: data.type };
    }
    const extract = data.extract?.trim();
    if (!extract) {
      return null;
    }
    return { extract, pageType: data.type };
  } catch {
    return null;
  }
}
