/**
 * iNaturalist `wikipedia_summary` often contains stubs, maintenance banners,
 * or taxon-title-only blurbs. Filter those out so the UI does not show junk.
 */

export interface TaxonDescriptionContext {
  /** Scientific / Latin name (iNaturalist taxon `name`) */
  scientificName?: string;
  /** Preferred common name if any */
  commonName?: string;
}

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCharCode(Number.parseInt(h, 16)));
}

function normalizePlain(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Wikipedia / Wikipédia maintenance and disambiguation boilerplate
 * (FR/EN). If matched, the summary is not useful as an introduction.
 * @param plain - The plain text of the Wikipedia summary
 * @returns True if the summary is a Wikipedia stub or maintenance banner
 */
function isWikipediaStubOrMaintenance(plain: string): boolean {
  const p = plain.toLowerCase();
  const patterns = [
    /vous pouvez partager vos connaissances en l[’']améliorant/,
    /selon les recommandations du projet/,
    /projet zoologie/,
    /\(comment\s*\?\)/,
    /vous pouvez aider wikip[ée]dia/i,
    /cet article est une ébauche concernant/i,
    /page d['’]homonymie/i,
    /you can help wikipedia/i,
    /wikipedia does not have an article/i,
    /may refer to:/i,
    /disambiguation page/i,
    /stub template/i,
  ];
  return patterns.some(re => re.test(p));
}

function isReferenceOnlyDescription(plain: string, ctx: TaxonDescriptionContext): boolean {
  const p = normalizePlain(plain).replace(/[.…]+$/g, "").replace(/^['"«»]+|['"«»]+$/g, "");
  if (p.length === 0) return true;

  const sn = ctx.scientificName ? normalizePlain(ctx.scientificName).toLowerCase() : "";
  const cn = ctx.commonName ? normalizePlain(ctx.commonName).toLowerCase() : "";

  if (sn && p.toLowerCase() === sn) return true;
  if (sn && p.toLowerCase() === `(${sn})`) return true;

  // Very short blurb that is only the taxon title (often HTML was just <i>Binomial</i>)
  if (sn && p.length <= sn.length + 8) {
    const low = p.toLowerCase();
    if (low === sn || low.endsWith(sn) || low.startsWith(sn)) {
      const withoutName = low.replace(sn, "").replace(/[().,;:–—\-]/g, "").trim();
      if (withoutName.length <= 2) return true;
    }
  }

  if (cn && p.toLowerCase() === cn && p.split(/\s+/).length <= 4) return true;

  // Single italicized name repeated with almost no explanatory words
  if (p.length < 48 && sn) {
    const low = p.toLowerCase();
    const hasSentence
      = /\b(?:est|sont|été|genre|esp[eè]ce|famille|ordre|class|species|genus|family)\b/i.test(
        p,
      );
    if (!hasSentence && low.includes(sn) && low.replace(sn, "").trim().length < 8) return true;
  }

  return false;
}

/**
 * Returns trimmed original `raw` when it looks like a real summary; otherwise `undefined`.
 * Keeps light HTML for downstream `sanitizeBasicHTML`.
 * @param raw - The raw Wikipedia summary to clean
 * @param context - The context of the taxon
 * @returns The cleaned Wikipedia summary
 */
export function cleanTaxonWikiSummary(
  raw: string | undefined,
  context: TaxonDescriptionContext = {},
): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const plain = normalizePlain(stripHtmlToPlain(trimmed));
  if (!plain) return undefined;

  if (isWikipediaStubOrMaintenance(plain)) return undefined;
  if (isReferenceOnlyDescription(plain, context)) return undefined;

  return trimmed;
}
