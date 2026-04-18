import { describe, expect, it } from "vitest";
import {
  plainExtractToDescriptionHtml,
  wikipediaTitleFromUrl,
} from "~/utils/wikipediaRestSummary";

describe("wikipediaTitleFromUrl", () => {
  it("parses title from en.wikipedia.org", () => {
    expect(wikipediaTitleFromUrl("https://en.wikipedia.org/wiki/Panthera_tigris")).toBe("Panthera tigris");
  });

  it("parses title from fr.wikipedia.org", () => {
    expect(wikipediaTitleFromUrl("https://fr.wikipedia.org/wiki/Tigre")).toBe("Tigre");
  });

  it("returns null for non-wikipedia URLs", () => {
    expect(wikipediaTitleFromUrl("https://www.inaturalist.org/taxa/42")).toBeNull();
  });
});

describe("plainExtractToDescriptionHtml", () => {
  it("escapes HTML and wraps in p", () => {
    expect(plainExtractToDescriptionHtml("a < b")).toBe("<p>a &lt; b</p>");
  });
});
