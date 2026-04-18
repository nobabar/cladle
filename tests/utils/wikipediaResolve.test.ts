import { describe, expect, it, vi } from "vitest";
import { resolveWikipediaArticleUrlForLocale } from "~/utils/wikipediaResolve";

describe("resolveWikipediaArticleUrlForLocale", () => {
  it("returns fr wiki URL from English article via langlinks", async () => {
    const langlinkJson = {
      batchcomplete: "",
      query: {
        pages: {
          x: {
            langlinks: [{ "lang": "fr", "*": "Lion" }],
          },
        },
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => langlinkJson,
    } as Response);

    const url = await resolveWikipediaArticleUrlForLocale(
      "https://en.wikipedia.org/wiki/Lion",
      "fr",
    );
    expect(url).toBe("https://fr.wikipedia.org/wiki/Lion");
  });
});
