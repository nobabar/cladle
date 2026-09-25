import { describe, expect, it } from "vitest";
import { resolveDocumentOverlayReturnPath } from "~/utils/documentOverlayReturn";

const ORIGIN = "https://cladle.example";

describe("resolveDocumentOverlayReturnPath", () => {
  it("falls back to home when there is no previous history entry", () => {
    expect(resolveDocumentOverlayReturnPath(null, ORIGIN)).toBe("/");
    expect(resolveDocumentOverlayReturnPath(undefined, ORIGIN)).toBe("/");
    expect(resolveDocumentOverlayReturnPath("", ORIGIN)).toBe("/");
  });

  it("returns the previous in-app path", () => {
    expect(resolveDocumentOverlayReturnPath("/free-play", ORIGIN)).toBe("/free-play");
    expect(resolveDocumentOverlayReturnPath("/baby", ORIGIN)).toBe("/baby");
    expect(resolveDocumentOverlayReturnPath("/", ORIGIN)).toBe("/");
  });

  it("preserves search and hash on the previous path", () => {
    expect(resolveDocumentOverlayReturnPath("/free-play?x=1#tree", ORIGIN)).toBe("/free-play?x=1#tree");
  });

  it("accepts absolute same-origin URLs", () => {
    expect(resolveDocumentOverlayReturnPath(`${ORIGIN}/baby`, ORIGIN)).toBe("/baby");
  });

  it("falls back to home for external referrers", () => {
    expect(resolveDocumentOverlayReturnPath("https://other.example/page", ORIGIN)).toBe("/");
  });

  it("falls back to home when previous entry is another document overlay", () => {
    expect(resolveDocumentOverlayReturnPath("/help", ORIGIN)).toBe("/");
    expect(resolveDocumentOverlayReturnPath("/privacy", ORIGIN)).toBe("/");
  });
});
