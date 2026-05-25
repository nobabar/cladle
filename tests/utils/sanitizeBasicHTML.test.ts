import { describe, expect, it } from "vitest";
import { sanitizeBasicHTML } from "~/utils/sanitizeBasicHTML";

describe("sanitizeBasicHTML", () => {
  it("keeps only b and i tags", () => {
    const input = "<p>Hello <b>bold</b> and <i>italic</i></p><script>alert(1)</script>";
    expect(sanitizeBasicHTML(input)).toBe("Hello <b>bold</b> and <i>italic</i>");
  });
});
