/**
 * Date utility module for daily puzzle system.
 *
 * All puzzle dates are stored and compared in UTC (YYYY-MM-DD) for consistency
 * across time zones (NFR37). Use these functions for midnight reset detection
 * and date comparison; convert to local time only for display.
 *
 * Timezone handling strategy:
 * - Puzzle date: always YYYY-MM-DD in UTC (same puzzle for everyone globally per calendar day UTC)
 * - Display: convert to user's local date when showing "today's puzzle" or date labels
 * - DST: UTC avoids daylight saving transitions; no special handling needed for comparison
 */

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate date string is YYYY-MM-DD format (does not validate calendar validity)
 * @param date - Date string to validate
 * @returns true if the date string is in YYYY-MM-DD format
 */
function isValidDateFormat(date: string): boolean {
  return typeof date === "string" && DATE_FORMAT_REGEX.test(date);
}

/**
 * Get current date in YYYY-MM-DD format (UTC).
 * Use for puzzle date storage and comparison so all time zones see the same daily puzzle.
 *
 * @returns Current date string in UTC (e.g. "2026-02-11")
 */
export function getCurrentDateUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Compare two date strings (YYYY-MM-DD).
 *
 * @param oldDate - First date string
 * @param newDate - Second date string
 * @returns true if the dates are different (including invalid/empty handling)
 */
export function hasDateChanged(oldDate: string, newDate: string): boolean {
  if (!oldDate || !newDate) {
    return oldDate !== newDate;
  }
  if (!isValidDateFormat(oldDate) || !isValidDateFormat(newDate)) {
    return oldDate !== newDate;
  }
  return oldDate !== newDate;
}

/**
 * Check if midnight UTC has passed since the given puzzle date.
 * Used to detect when a new day has started and the puzzle should reset.
 *
 * @param puzzleDate - Stored puzzle date in YYYY-MM-DD (UTC)
 * @returns true if current UTC date is after puzzleDate (new day), or if puzzleDate is invalid/empty
 */
export function isMidnightPassed(puzzleDate: string): boolean {
  if (!puzzleDate || !isValidDateFormat(puzzleDate)) {
    return true; // No valid stored date → consider "midnight passed" to trigger load
  }
  const currentUTC = getCurrentDateUTC();
  return hasDateChanged(puzzleDate, currentUTC);
}

/**
 * Get midnight UTC as a Date object for a given date string (YYYY-MM-DD).
 * Useful for display or calculations that need a timestamp.
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Date object at 00:00:00.000 UTC for that day
 * @throws Error if date format is invalid
 */
export function getMidnightUTC(date: string): Date {
  if (!isValidDateFormat(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
  }
  const parts = date.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y == null || m == null || d == null || m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error(`Invalid date: ${date}.`);
  }
  return new Date(Date.UTC(y, m - 1, d));
}

/** Display format for puzzle date */
export type PuzzleDateFormat = "full" | "short" | "relative";

/**
 * Format a puzzle date (YYYY-MM-DD UTC) for user display.
 * Converts to user's local date for readability. Use for labels and "today's puzzle".
 *
 * @param date - Puzzle date in YYYY-MM-DD format (UTC calendar day)
 * @param format - 'full' (January 11, 2026), 'short' (Jan 11, 2026), or 'relative' (Today's Puzzle when current UTC day)
 * @returns Formatted string, or fallback if date is missing/invalid
 */
export function formatPuzzleDate(
  date: string,
  format: PuzzleDateFormat = "full",
): string {
  if (!date || typeof date !== "string") {
    return "—";
  }
  if (!isValidDateFormat(date)) {
    return "—";
  }
  let dateObj: Date;
  try {
    dateObj = getMidnightUTC(date);
  } catch {
    return "—";
  }
  if (format === "relative" && date === getCurrentDateUTC()) {
    return "Today's Puzzle";
  }
  const opts: Intl.DateTimeFormatOptions
    = format === "short"
      ? { year: "numeric", month: "short", day: "numeric" }
      : { year: "numeric", month: "long", day: "numeric" };
  return new Intl.DateTimeFormat(undefined, opts).format(dateObj);
}

/**
 * Get the next midnight UTC (start of next calendar day UTC).
 * Used for "next puzzle in" countdown.
 *
 * @returns Date object for 00:00:00.000 UTC of the next day
 */
export function getNextMidnightUTC(): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  return new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
}

/**
 * Seconds until next midnight UTC (next puzzle). Zero or negative if already past.
 *
 * @param now - Current time (defaults to new Date(), overridable for tests)
 * @returns Seconds until 00:00:00 UTC next day
 */
export function getSecondsUntilNextPuzzle(now: Date = new Date()): number {
  const next = getNextMidnightUTC();
  const ms = next.getTime() - now.getTime();
  return Math.max(0, Math.floor(ms / 1000));
}

/**
 * Format remaining time until next puzzle (next midnight UTC) as human-readable string.
 *
 * @param now - Current time (defaults to new Date(), overridable for tests)
 * @returns e.g. "5h 23m", "45m", "2m 10s", or "Next puzzle soon" when < 1 minute
 */
export function formatTimeUntilNextPuzzle(now: Date = new Date()): string {
  const totalSeconds = getSecondsUntilNextPuzzle(now);
  if (totalSeconds <= 0) return "Next puzzle soon";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
