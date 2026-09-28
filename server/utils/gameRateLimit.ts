/**
 * Soft per-process rate limit for game API routes (not shared across serverless instances).
 */

export const GAME_GUESS_RATE_LIMIT_MAX = 20;
export const GAME_HINT_RATE_LIMIT_MAX = 20;
export const GAME_START_RATE_LIMIT_MAX = 30;

const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const rateLimitBuckets = new Map<string, number[]>();

/**
 * Returns false when the key has hit `max` requests in the rolling window.
 * @param key - Client IP or composite key (e.g. `guess:<ip>`)
 * @param max - Allowed requests per window
 * @returns True if the request is still allowed
 */
export function checkGameApiRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (rateLimitBuckets.get(key) ?? []).filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= max) {
    rateLimitBuckets.set(key, recent);
    return false;
  }
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  return true;
}

/** Clears stored counts. Used only by unit tests. */
export function resetGameApiRateLimitMemory(): void {
  rateLimitBuckets.clear();
}

export { RATE_LIMIT_WINDOW_MS };
