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
