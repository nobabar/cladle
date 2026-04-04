/**
 * API Response Wrapper Types
 *
 * Standardized response format for all API client methods.
 */

export interface ApiError {
  /** User-facing error message */
  message: string;

  /** Optional error code for programmatic error handling */
  code?: string;

  /** Optional additional error details (e.g., validation errors, stack trace) */
  details?: any;
}

/**
 * Standard API response wrapper
 *
 * All API client methods return this format:
 * - Success: { data: {...}, error: null }
 * - Error: { data: null, error: { message, code?, details? } }
 *
 * @template T - The type of data returned on success
 */
export interface ApiResponse<T> {
  /** Response data on success, null on error */
  data: T | null;

  /** Error details on failure, null on success */
  error: ApiError | null;
}
