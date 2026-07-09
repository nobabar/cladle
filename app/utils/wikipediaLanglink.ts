/**
 * MediaWiki `langlinks`: map an article title from one Wikipedia to another language edition.
 * @see https://www.mediawiki.org/wiki/API:Langlinks
 */

import { wikipediaTitleFromUrl } from "~/utils/wikipediaRestSummary";

/**
 * Language code from `xx.wikipedia.org` / `xx.m.wikipedia.org` hostname.
 * @param hostname - URL hostname only
 * @returns Lowercase wiki language code (e.g. `en`, `fr`) or `null`
 */
export function wikipediaWikiLangFromHostname(hostname: string): string | null {
  const h = hostname.toLowerCase();
  const m = /^([a-z]{2,3})\.(?:m\.)?wikipedia\.org$/.exec(h);
  return m?.[1] ?? null;
}

/**
 * Target article title on `targetWikiLang` linked from `sourceArticleUrl`, if any.
 * @param sourceArticleUrl - Full URL on any `*.wikipedia.org` wiki
 * @param targetWikiLang - MediaWiki language code (e.g. `fr`, `de`)
 * @returns Linked page title on the target wiki, or `null`
 */
export async function fetchWikipediaLanglinkTitle(
  sourceArticleUrl: string,
  targetWikiLang: string,
): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(sourceArticleUrl);
  } catch {
    return null;
  }

  const sourceLang = wikipediaWikiLangFromHostname(u.hostname);
  const title = wikipediaTitleFromUrl(sourceArticleUrl);
  if (!sourceLang || !title) {
    return null;
  }

  if (sourceLang === targetWikiLang) {
    return title;
  }

  const apiUrl = new URL(`https://${sourceLang}.wikipedia.org/w/api.php`);
  apiUrl.searchParams.set("action", "query");
  apiUrl.searchParams.set("format", "json");
  apiUrl.searchParams.set("origin", "*");
  apiUrl.searchParams.set("titles", title);
  apiUrl.searchParams.set("redirects", "1");
  apiUrl.searchParams.set("prop", "langlinks");
  apiUrl.searchParams.set("lllang", targetWikiLang);

  try {
    const res = await fetch(apiUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { langlinks?: Array<{ "lang": string; "*"?: string; "title"?: string }> }
        >;
      };
    };
    const pages = data.query?.pages;
    if (!pages) {
      return null;
    }
    const page = Object.values(pages)[0];
    const link = page?.langlinks?.[0];
    if (!link) {
      return null;
    }
    // MediaWiki returns the foreign article title as `*`, not `title`.
    const foreignTitle = link["*"] ?? link.title;
    return foreignTitle?.trim() ?? null;
  } catch {
    return null;
  }
}
