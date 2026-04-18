import { describe, expect, it, vi } from "vitest";
import { fetchWikipediaLanglinkTitle } from "~/utils/wikipediaLanglink";

describe("fetchWikipediaLanglinkTitle", () => {
  it("reads foreign title from MediaWiki langlinks `*` field (not `title`)", async () => {
    const json = {
      batchcomplete: "",
      query: {
        pages: {
          18838: {
            pageid: 18838,
            ns: 0,
            title: "Mammal",
            langlinks: [{ "lang": "fr", "*": "Mammifère" }],
          },
        },
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => json,
    } as Response);

    const title = await fetchWikipediaLanglinkTitle(
      "https://en.wikipedia.org/wiki/Mammal",
      "fr",
    );
    expect(title).toBe("Mammifère");
  });
});
