import { afterEach, describe, expect, it } from "vitest";
import { BUG_REPORT_FORM_HEADER_VALUE } from "../../app/types/bugReport";
import {
  checkBugReportRateLimit,
  isBugReportFormRequest,
  RATE_LIMIT_MAX,
  resetBugReportRateLimitMemory,
} from "../../app/utils/bugReportGuard";

describe("isBugReportFormRequest", () => {
  it("accepts JSON with the form header", () => {
    expect(
      isBugReportFormRequest(BUG_REPORT_FORM_HEADER_VALUE, "application/json"),
    ).toBe(true);
  });

  it("rejects missing form header", () => {
    expect(isBugReportFormRequest(undefined, "application/json")).toBe(false);
  });

  it("rejects non-JSON content type", () => {
    expect(
      isBugReportFormRequest(
        BUG_REPORT_FORM_HEADER_VALUE,
        "application/x-www-form-urlencoded",
      ),
    ).toBe(false);
  });
});

describe("checkBugReportRateLimit", () => {
  afterEach(() => {
    resetBugReportRateLimitMemory();
  });

  it("allows up to RATE_LIMIT_MAX then blocks", () => {
    const ip = "203.0.113.10";
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      expect(checkBugReportRateLimit(ip)).toBe(true);
    }
    expect(checkBugReportRateLimit(ip)).toBe(false);
  });

  it("tracks IPs independently", () => {
    expect(checkBugReportRateLimit("203.0.113.1")).toBe(true);
    expect(checkBugReportRateLimit("203.0.113.2")).toBe(true);
  });
});
