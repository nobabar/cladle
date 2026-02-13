/**
 * Puzzle access control: determine if a puzzle date can be played or viewed.
 *
 * - Current date (UTC): accessible.
 * - Past dates: accessible (for history/replay).
 * - Future dates: not accessible (FR37).
 * - Invalid dates: not accessible.
 */

import { getCurrentDateUTC } from "~/utils/dateUtils";

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateFormat(date: string): boolean {
  return typeof date === "string" && DATE_FORMAT_REGEX.test(date);
}

/**
 * Compare two YYYY-MM-DD date strings.
 * @param a - First date string
 * @param b - Second date string
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if a puzzle date is accessible (current or past; not future).
 *
 * @param date - Puzzle date in YYYY-MM-DD format (UTC)
 * @returns true if the date is current or past; false for future or invalid
 */
export function canAccessPuzzle(date: string): boolean {
  if (!date || !isValidDateFormat(date)) {
    return false;
  }

  const today = getCurrentDateUTC();
  return compareDates(date, today) <= 0;
}

/**
 * Check if a date is in the future (not yet playable).
 *
 * @param date - Puzzle date in YYYY-MM-DD format
 * @returns true if date is after today (UTC)
 */
export function isFuturePuzzleDate(date: string): boolean {
  if (!date || !isValidDateFormat(date)) {
    return false;
  }
  return compareDates(date, getCurrentDateUTC()) > 0;
}
