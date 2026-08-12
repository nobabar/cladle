import type { H3Event } from "h3";
import { createError, getHeader, getRequestIP, readBody } from "h3";
import type {
  BugReportErrorCode,
  BugReportMode,
  BugReportPayload,
  BugReportSuccess,
} from "~/types/bugReport";
import {
  BUG_REPORT_FORM_HEADER,
  checkBugReportRateLimit,
  isBugReportFormRequest,
} from "~/utils/bugReportGuard";

interface ApiResponse<T> {
  data: T | null;
  error: { message: string; code: BugReportErrorCode } | null;
}

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 4000;
const MAX_STEPS = 4000;
const MAX_BROWSER = 200;
const MAX_EXTRA = 4000;
const MAX_EMAIL = 254;
const MAX_TREE_MERMAID = 50_000;

const MODE_LABELS: Record<BugReportMode, string> = {
  "daily": "Daily",
  "free-play": "Free play",
  "unknown": "Not sure / N/A",
};

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) {
    return false;
  }
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1 && !email.includes(" ");
}

function isValidMode(value: string): value is BugReportMode {
  return value === "daily" || value === "free-play" || value === "unknown";
}

function buildIssueBody(fields: {
  description: string;
  steps: string;
  mode: BugReportMode;
  browser: string;
  extra: string;
  contactEmail: string;
  treeMermaid: string;
}): string {
  const sections = [
    "### Description",
    fields.description,
    "",
    "### Steps to reproduce",
    fields.steps,
    "",
    "### Game mode",
    MODE_LABELS[fields.mode],
    "",
    "### Browser and OS",
    fields.browser,
  ];

  if (fields.extra) {
    sections.push("", "### Additional context", fields.extra);
  }

  if (fields.treeMermaid) {
    sections.push(
      "",
      "### Current tree",
      "",
      "```mermaid",
      fields.treeMermaid,
      "```",
    );
  }

  if (fields.contactEmail) {
    sections.push("", "### Contact", fields.contactEmail);
  }

  sections.push("", "---", "_Submitted via in-app form_");
  return sections.join("\n");
}

/**
 * User-facing copy is resolved on the client from `code` via i18n.
 * @param statusCode - The HTTP status code to return.
 * @param code - The error code to return.
 */
function clientError(statusCode: number, code: BugReportErrorCode): never {
  throw createError({
    statusCode,
    statusMessage: code,
    data: {
      data: null,
      error: { message: code, code },
    } satisfies ApiResponse<never>,
  });
}

export default defineEventHandler(
  async (event: H3Event): Promise<ApiResponse<BugReportSuccess>> => {
    const config = useRuntimeConfig(event);
    const token = String(config.githubToken || "");
    const owner = String(config.githubOwner || "nobabar");
    const repo = String(config.githubRepo || "cladle");

    if (!token) {
      clientError(503, "not_configured");
    }

    if (!isBugReportFormRequest(
      getHeader(event, BUG_REPORT_FORM_HEADER),
      getHeader(event, "content-type"),
    )) {
      clientError(403, "forbidden");
    }

    const body = await readBody<Partial<BugReportPayload>>(event).catch(() => null);
    if (!body || typeof body !== "object") {
      clientError(400, "invalid_body");
    }

    // Honeypot: bots fill hidden fields; respond like a validation error.
    if (asTrimmedString(body.website)) {
      clientError(400, "invalid_body");
    }

    const title = asTrimmedString(body.title);
    const description = asTrimmedString(body.description);
    const steps = asTrimmedString(body.steps);
    const modeRaw = asTrimmedString(body.mode);
    const browser = asTrimmedString(body.browser);
    const extra = asTrimmedString(body.extra);
    const contactEmail = asTrimmedString(body.contactEmail);
    const treeMermaid = asTrimmedString(body.treeMermaid);

    if (!title || title.length > MAX_TITLE) {
      clientError(400, "invalid_title");
    }
    if (!description || description.length > MAX_DESCRIPTION) {
      clientError(400, "invalid_description");
    }
    if (!steps || steps.length > MAX_STEPS) {
      clientError(400, "invalid_steps");
    }
    if (!isValidMode(modeRaw)) {
      clientError(400, "invalid_mode");
    }
    if (!browser || browser.length > MAX_BROWSER) {
      clientError(400, "invalid_browser");
    }
    if (extra.length > MAX_EXTRA) {
      clientError(400, "invalid_extra");
    }
    if (treeMermaid) {
      if (treeMermaid.length > MAX_TREE_MERMAID) {
        clientError(400, "invalid_tree");
      }
      if (!/^graph\s/i.test(treeMermaid)) {
        clientError(400, "invalid_tree");
      }
    }
    if (contactEmail) {
      if (contactEmail.length > MAX_EMAIL || !isValidEmail(contactEmail)) {
        clientError(400, "invalid_email");
      }
    }

    const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
    if (!checkBugReportRateLimit(ip)) {
      clientError(429, "rate_limited");
    }

    const issueTitle = title.startsWith("fix:") ? title : `fix: ${title}`;
    const issueBody = buildIssueBody({
      description,
      steps,
      mode: modeRaw,
      browser,
      extra,
      contactEmail,
      treeMermaid,
    });

    let githubResponse: Response;
    try {
      githubResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          method: "POST",
          headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "cladle-bug-report",
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBody,
            labels: ["bug"],
          }),
        },
      );
    } catch {
      clientError(502, "github_failed");
    }

    if (!githubResponse.ok) {
      clientError(502, "github_failed");
    }

    const issue = await githubResponse.json().catch(() => null) as {
      html_url?: string;
      number?: number;
    } | null;

    if (!issue?.html_url || typeof issue.number !== "number") {
      clientError(502, "github_failed");
    }

    return {
      data: {
        url: issue.html_url,
        number: issue.number,
      },
      error: null,
    };
  },
);
