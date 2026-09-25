const DOCUMENT_OVERLAY_PATHS = new Set(["/help", "/privacy"]);

/**
 * Resolve the previous in-app route when closing a document overlay. Fall back
 * to home for direct loads or external referrers. Callers should navigate with
 * `replace: true` so scroll restoration does not jump back to the footer.
 * @param historyBack - The previous history entry, as returned by `window.history.state.back`.
 * @param origin - The origin of the current page, as returned by `window.location.origin`.
 * @returns The path to return to, or `/` if the previous entry is not an in-app page.
 */
export function resolveDocumentOverlayReturnPath(
  historyBack: unknown = import.meta.client ? window.history.state?.back : null,
  origin: string = import.meta.client ? window.location.origin : "http://localhost",
): string {
  if (typeof historyBack !== "string" || historyBack.length === 0) {
    return "/";
  }

  try {
    const url = new URL(historyBack, origin);
    if (url.origin !== new URL(origin).origin) {
      return "/";
    }
    if (DOCUMENT_OVERLAY_PATHS.has(url.pathname)) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}
