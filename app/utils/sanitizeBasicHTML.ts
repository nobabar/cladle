/**
 * Sanitize HTML to only allow basic formatting tags (<b>, <i>).
 * Uses the DOM API for secure parsing of Wikipedia and iNaturalist summaries.
 */

/**
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML with only <b> and <i> tags (no attributes)
 */
export function sanitizeBasicHTML(html: string): string {
  if (!html || typeof window === "undefined") return html || "";

  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    function sanitizeNode(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Drop dangerous elements entirely (including their text content).
        if (tagName === "script" || tagName === "style") {
          return "";
        }

        if (tagName === "b" || tagName === "i") {
          let childrenHTML = "";
          for (const child of Array.from(element.childNodes)) {
            childrenHTML += sanitizeNode(child);
          }
          return `<${tagName}>${childrenHTML}</${tagName}>`;
        }

        let childrenHTML = "";
        for (const child of Array.from(element.childNodes)) {
          childrenHTML += sanitizeNode(child);
        }
        return childrenHTML;
      }

      return "";
    }

    let sanitized = "";
    for (const child of Array.from(tempDiv.childNodes)) {
      sanitized += sanitizeNode(child);
    }

    return sanitized;
  } catch (error) {
    console.warn("HTML sanitization failed, escaping content:", error);
    return html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
