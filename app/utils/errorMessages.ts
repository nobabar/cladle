/**
 * Error Message Utilities
 *
 * Provides user-friendly error messages for API and validation errors.
 * Converts technical error codes into actionable, user-friendly messages.
 *
 * Architecture Pattern:
 * - Centralized error message mapping
 * - Separates technical errors from user-facing messages
 * - Supports graceful error handling
 *
 * @see services/apiClient.ts - Error handling integration
 * @see utils/dataValidation.ts - Validation error integration
 */

/**
 * Error message mapping
 * Maps error codes to user-friendly messages
 */
export interface ErrorMessageMap {
  [code: string]: string;
}

/**
 * Standard error messages for common error scenarios
 * These messages are user-friendly and don't expose technical details
 */
export const ERROR_MESSAGES: ErrorMessageMap = {
  ANIMAL_NOT_FOUND: "Animal not found. Please try a different name.",
  CLADE_NOT_FOUND: "Taxonomic group not found.",
  INVALID_TAXONOMY: "Unable to determine evolutionary relationships.",
  NETWORK_ERROR: "Connection issue. Please check your internet and try again.",
  VALIDATION_ERROR: "Data format issue. This has been logged for investigation.",
  API_UNAVAILABLE: "Service temporarily unavailable. Cached data will be used when available.",
  CACHE_ERROR: "Local storage issue. Game may have limited functionality.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  TIMEOUT: "Request timed out. Please try again.",
  NOT_FOUND: "Resource not found. Please check your input.",
  PARSE_ERROR: "Failed to parse response from server.",
  OFFLINE: "You appear to be offline. Please check your connection.",
};

/**
 * Get user-friendly error message for an error code
 *
 * @param code - Error code (e.g., 'NETWORK_ERROR', 'VALIDATION_ERROR')
 * @param defaultMessage - Optional custom default message if code not found
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * getUserFriendlyError('NETWORK_ERROR') // "Connection issue. Please check your internet and try again."
 * getUserFriendlyError('UNKNOWN_CODE') // "An unexpected error occurred. Please try again."
 * getUserFriendlyError('UNKNOWN_CODE', 'Custom message') // "Custom message"
 * ```
 */
export function getUserFriendlyError(
  code?: string,
  defaultMessage?: string,
): string {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  return defaultMessage || ERROR_MESSAGES.UNKNOWN_ERROR || "An unexpected error occurred. Please try again.";
}

/**
 * Map HTTP status codes to error codes
 * Helps convert HTTP errors to user-friendly messages
 *
 * @param status - HTTP status code
 * @returns Error code string
 */
export function mapHttpStatusToErrorCode(status: number): string {
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status === 429) {
    return "API_UNAVAILABLE";
  }
  if (status >= 500) {
    return "API_UNAVAILABLE";
  }
  if (status >= 400) {
    return "VALIDATION_ERROR";
  }
  return "UNKNOWN_ERROR";
}
