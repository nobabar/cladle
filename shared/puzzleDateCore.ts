const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a puzzle date string is a real calendar day in YYYY-MM-DD format.
 *
 * @param date - Date string to validate
 * @throws Error if the format is not YYYY-MM-DD
 * @throws TypeError if year/month/day cannot be parsed as numbers
 * @throws Error if the calendar date is invalid (e.g. 2024-02-30)
 */
export function assertPuzzleDate(date: string): void {
  if (!DATE_FORMAT_REGEX.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD format.`);
  }

  const parts = date.split("-");
  if (parts.length !== 3) {
    throw new TypeError(`Invalid date: ${date}. Date is not valid.`);
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new TypeError(`Invalid date: ${date}. Date is not valid.`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid date: ${date}. Month must be between 1 and 12.`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid date: ${date}. Day must be between 1 and 31.`);
  }
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year
    || dateObj.getMonth() !== month - 1
    || dateObj.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${date}. Date is not valid.`);
  }
}

/**
 * Deterministic hash of a date string (or a salted date such as `baby:YYYY-MM-DD`).
 * Same input always yields the same 32-bit seed for puzzle selection.
 *
 * @param date - Date string or salted date key
 * @returns Non-negative numeric seed
 */
export function hashPuzzleDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get current date in YYYY-MM-DD format (UTC).
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
