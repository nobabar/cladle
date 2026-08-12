/**
 * Build a short human-readable browser / OS string from the user agent.
 *
 * @param userAgent - Raw `navigator.userAgent` (or equivalent)
 * @returns Compact label such as "Chrome 128 on macOS"
 */
export function formatBrowserOs(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): string {
  if (!userAgent) {
    return "";
  }

  const browser
    = matchVersion(userAgent, /Edg\/(\d+)/, "Edge")
      || matchVersion(userAgent, /Firefox\/(\d+)/, "Firefox")
      || matchVersion(userAgent, /Chrome\/(\d+)/, "Chrome")
      || matchSafari(userAgent)
      || "Unknown browser";

  let os = "Unknown OS";
  if (/Windows NT/i.test(userAgent)) {
    os = "Windows";
  } else if (/Mac OS X/i.test(userAgent)) {
    os = "macOS";
  } else if (/Android/i.test(userAgent)) {
    os = "Android";
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = "iOS";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
  }

  return `${browser} on ${os}`;
}

function matchVersion(ua: string, pattern: RegExp, name: string): string | null {
  const match = ua.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  return `${name} ${match[1]}`;
}

function matchSafari(ua: string): string | null {
  if (!/Safari/i.test(ua) || /Chrome|Chromium|Edg/i.test(ua)) {
    return null;
  }
  const match = ua.match(/Version\/(\d+)/);
  if (!match?.[1]) {
    return "Safari";
  }
  return `Safari ${match[1]}`;
}
