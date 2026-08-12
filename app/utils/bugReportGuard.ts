import {
  BUG_REPORT_FORM_HEADER,
  BUG_REPORT_FORM_HEADER_VALUE,
} from "~/types/bugReport";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const rateLimitBuckets = new Map<string, number[]>();

/**
 * Checks that the request came from our bug-report modal, not a plain HTML form
 * on another site. Those forms cannot add our custom header or send JSON.
 * @param formHeader - Value of {@link BUG_REPORT_FORM_HEADER}
 * @param contentType - `Content-Type` header
 * @returns `true` if both match what the modal sends
 */
export function isBugReportFormRequest(
  formHeader: string | undefined,
  contentType: string | undefined,
): boolean {
  if (formHeader !== BUG_REPORT_FORM_HEADER_VALUE) {
    return false;
  }
  return (contentType || "").toLowerCase().includes("application/json");
}

/**
 * Soft per-process rate limit (not shared across serverless instances).
 * @param ip - Client IP used as the rate-limit key
 * @returns `true` if this submit is still allowed
 */
export function checkBugReportRateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(ip) ?? []).filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateLimitBuckets.set(ip, recent);
  return true;
}

/** Clears stored submit counts. Used only by unit tests. */
export function resetBugReportRateLimitMemory(): void {
  rateLimitBuckets.clear();
}

export {
  BUG_REPORT_FORM_HEADER,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
};
