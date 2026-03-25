import type { StorageLike } from "pinia-plugin-persistedstate";

const LOG_PREFIX = "[cladle-storage]";

/** User-facing error codes for storage failures (see `ERROR_MESSAGES`). */
export type StorageFailureCode = "STORAGE_QUOTA_EXCEEDED" | "STORAGE_WRITE_FAILED" | "STORAGE_READ_FAILED";

export interface StorageFailureInfo {
  code: StorageFailureCode;
  operation: "read" | "write";
  key: string;
}

export interface SafeGetItemResult {
  ok: boolean;
  value: string | null;
  errorCode?: StorageFailureCode;
}

export interface SafeSetItemResult {
  ok: boolean;
  errorCode?: StorageFailureCode;
}

/**
 * Detect quota / storage-full errors across browsers (matches `puzzleHistory` heuristics).
 * @param error - Caught exception from `localStorage` or similar.
 * @returns True when the error indicates quota exceeded.
 */
export function isStorageQuotaError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return true;
  }
  if (error instanceof Error && error.name === "QuotaExceededError") {
    return true;
  }
  if (error instanceof Error && error.message?.includes("QuotaExceeded")) {
    return true;
  }
  return false;
}

/**
 * Read storage key without throwing.
 * @param storage - Web Storage API or null (SSR / unavailable).
 * @param key - Storage key.
 * @returns Parsed result; `value` null when missing or on failure.
 */
export function safeGetItem(storage: Storage | null, key: string): SafeGetItemResult {
  if (!storage) {
    return { ok: true, value: null };
  }
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false, value: null, errorCode: "STORAGE_READ_FAILED" };
  }
}

/**
 * Write storage key without throwing.
 * @param storage - Web Storage API or null.
 * @param key - Storage key.
 * @param value - String payload.
 * @returns Whether the write succeeded.
 */
export function safeSetItem(
  storage: Storage | null,
  key: string,
  value: string,
): SafeSetItemResult {
  if (!storage) {
    return { ok: false, errorCode: "STORAGE_WRITE_FAILED" };
  }
  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    if (isStorageQuotaError(e)) {
      return { ok: false, errorCode: "STORAGE_QUOTA_EXCEEDED" };
    }
    return { ok: false, errorCode: "STORAGE_WRITE_FAILED" };
  }
}

type StorageFailureHandler = (info: StorageFailureInfo) => void;

let storageFailureHandler: StorageFailureHandler | undefined;
let userFacingStorageFailureShownThisSession = false;

/**
 * Register handler for the first user-facing storage failure in this session (game persist path).
 * Called from `pinia-persist.client.ts`.
 * @param handler - Invoked at most once per session when wrapped game storage fails.
 */
export function setStorageFailureHandler(handler: StorageFailureHandler | undefined): void {
  storageFailureHandler = handler;
}

/**
 * Reset session gate (Vitest only).
 */
export function resetStorageFailureSessionGateForTests(): void {
  userFacingStorageFailureShownThisSession = false;
}

function notifyStorageFailureOnce(info: StorageFailureInfo): void {
  if (userFacingStorageFailureShownThisSession) {
    return;
  }
  userFacingStorageFailureShownThisSession = true;
  storageFailureHandler?.(info);
}

/**
 * Pinia `StorageLike` for the game store: never throws; logs + optional user notification.
 * @returns Storage adapter safe for `pinia-plugin-persistedstate`.
 */
export function createSafeLocalStorageForPinia(): StorageLike {
  return {
    getItem(key: string) {
      const backing = typeof window !== "undefined" ? window.localStorage : null;
      const result = safeGetItem(backing, key);
      if (!result.ok && result.errorCode) {
        console.warn(LOG_PREFIX, "READ_FAILED", key);
        notifyStorageFailureOnce({
          code: result.errorCode,
          operation: "read",
          key,
        });
      }
      return result.value;
    },
    setItem(key: string, value: string) {
      const backing = typeof window !== "undefined" ? window.localStorage : null;
      const result = safeSetItem(backing, key, value);
      if (!result.ok && result.errorCode) {
        const label = result.errorCode === "STORAGE_QUOTA_EXCEEDED" ? "QUOTA" : "WRITE_FAILED";
        console.warn(LOG_PREFIX, label, key);
        notifyStorageFailureOnce({
          code: result.errorCode,
          operation: "write",
          key,
        });
      }
    },
  };
}
