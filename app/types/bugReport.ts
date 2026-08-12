/**
 * Shared types and constants for the in-app bug report form and API.
 */

/**
 * Extra HTTP header the bug-report form sends with each submit. The API rejects
 * requests that omit it. This blocks the usual “hidden form on another site” spam trick
 * because a normal HTML form cannot add custom headers, while our app’s `$fetch` call can.
 */
export const BUG_REPORT_FORM_HEADER = "X-Cladle-Bug-Report";
export const BUG_REPORT_FORM_HEADER_VALUE = "1";

export type BugReportMode = "daily" | "free-play" | "unknown";

export type BugReportErrorCode
  = | "not_configured"
    | "forbidden"
    | "invalid_body"
    | "invalid_title"
    | "invalid_description"
    | "invalid_steps"
    | "invalid_mode"
    | "invalid_browser"
    | "invalid_extra"
    | "invalid_tree"
    | "invalid_email"
    | "rate_limited"
    | "github_failed";

export interface BugReportPayload {
  title: string;
  description: string;
  steps: string;
  mode: BugReportMode;
  browser: string;
  extra?: string;
  contactEmail?: string;
  /** Mermaid diagram of the current tree (when the user opts in) */
  treeMermaid?: string;
  /** Honeypot — must be empty */
  website?: string;
}

export interface BugReportSuccess {
  url: string;
  number: number;
}
