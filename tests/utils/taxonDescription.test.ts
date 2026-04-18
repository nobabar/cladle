import { describe, expect, it } from "vitest";
import { cleanTaxonWikiSummary } from "~/utils/taxonDescription";

describe("cleanTaxonWikiSummary", () => {
  it("keeps normal summaries", () => {
    const raw = "<p>Tigers are large felids native to Asia.</p>";
    expect(
      cleanTaxonWikiSummary(raw, { scientificName: "Panthera tigris", commonName: "Tiger" }),
    ).toBe(raw);
  });

  it("drops French Wikipedia maintenance / contribution banner", () => {
    const raw
      = "Vous pouvez partager vos connaissances en l’améliorant (comment ?) selon les recommandations du projet zoologie.";
    expect(cleanTaxonWikiSummary(raw, { scientificName: "Foo bar" })).toBeUndefined();
  });

  it("drops English Wikipedia help stub", () => {
    expect(
      cleanTaxonWikiSummary("You can help Wikipedia by expanding it.", {
        scientificName: "X y",
      }),
    ).toBeUndefined();
  });

  it("drops taxon-title-only summaries", () => {
    expect(
      cleanTaxonWikiSummary("<p><i>Panthera leo</i></p>", {
        scientificName: "Panthera leo",
        commonName: "Lion",
      }),
    ).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(cleanTaxonWikiSummary(undefined, {})).toBeUndefined();
    expect(cleanTaxonWikiSummary("   ", {})).toBeUndefined();
  });
});
