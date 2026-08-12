import { describe, expect, it } from "vitest";
import { formatBrowserOs } from "../../app/utils/browserOs";

describe("formatBrowserOs", () => {
  it("formats Chrome on macOS", () => {
    expect(
      formatBrowserOs(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome 128 on macOS");
  });

  it("formats Firefox on Windows", () => {
    expect(
      formatBrowserOs(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
      ),
    ).toBe("Firefox 128 on Windows");
  });

  it("formats Edge before Chrome", () => {
    expect(
      formatBrowserOs(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
      ),
    ).toBe("Edge 128 on Windows");
  });

  it("returns empty string for empty UA", () => {
    expect(formatBrowserOs("")).toBe("");
  });
});
