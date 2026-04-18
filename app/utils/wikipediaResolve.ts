import { fetchWikipediaLanglinkTitle } from "~/utils/wikipediaLanglink";
import {
  fetchWikipediaRestSummaryByTitle,
  plainExtractToDescriptionHtml,
  wikipediaLangFromAppLocale,
} from "~/utils/wikipediaRestSummary";

/**
 * Canonical article URL on a given wiki.
 * @param wikiLang - Wikipedia subdomain (e.g. `fr`, `en`)
 * @param pageTitle - Article title as returned by the API (spaces ok)
 * @returns Canonical article URL on the given wiki
 */
export function wikipediaArticleUrlForWikiLang(wikiLang: string, pageTitle: string): string {
  const segment = pageTitle.trim().replace(/ /g, "_");
  return `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(segment)}`;
}

/**
 * Target wiki article URL from any Wikipedia URL (langlinks only). For when iNat has a summary
 * but no `wikipedia_url`, or when REST summary fails but a link is still useful.
 * @param sourceWikipediaUrl - Often the English article URL from iNaturalist
 * @param uiLocale - App locale
 * @returns Canonical `https://{lang}.wikipedia.org/wiki/...` or `null`
 */
export async function resolveWikipediaArticleUrlForLocale(
  sourceWikipediaUrl: string,
  uiLocale: string,
): Promise<string | null> {
  const targetWikiLang = wikipediaLangFromAppLocale(uiLocale);
  const titleOnTarget = await fetchWikipediaLanglinkTitle(sourceWikipediaUrl, targetWikiLang);
  if (!titleOnTarget) {
    return null;
  }
  return wikipediaArticleUrlForWikiLang(targetWikiLang, titleOnTarget);
}

/**
 * Lead section for the UI locale: follows interwiki links from `sourceWikipediaUrl` to the
 * target wiki, then loads REST `extract`. Returns `null` if there is no linked article or no extract.
 * @param sourceWikipediaUrl - Any Wikipedia article URL (often English from iNaturalist)
 * @param uiLocale - App locale (`fr`, `en`, …)
 * @returns Description HTML and canonical article URL, or `null` if no linked article or no extract
 */
export async function resolveWikipediaDescriptionForLocale(
  sourceWikipediaUrl: string,
  uiLocale: string,
): Promise<{ descriptionHtml: string; articleUrl: string } | null> {
  const targetWikiLang = wikipediaLangFromAppLocale(uiLocale);
  const titleOnTarget = await fetchWikipediaLanglinkTitle(sourceWikipediaUrl, targetWikiLang);
  if (!titleOnTarget) {
    return null;
  }

  const rest = await fetchWikipediaRestSummaryByTitle(targetWikiLang, titleOnTarget);
  if (!rest?.extract || rest.pageType === "disambiguation") {
    return null;
  }

  return {
    descriptionHtml: plainExtractToDescriptionHtml(rest.extract),
    articleUrl: wikipediaArticleUrlForWikiLang(targetWikiLang, titleOnTarget),
  };
}
