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
 * Game Error Type
 * Represents errors that occur during game operations
 * Follows architecture pattern: store-level for API/data, component-level for UI
 */
export interface GameError {
  /** User-friendly error message */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
  /** Optional additional error details (not exposed to user) */
  details?: any;
  /** Error type for categorization */
  type: "validation" | "network" | "data" | "ui";
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

/**
 * Convert API error to GameError
 * Maps API errors to game error format with appropriate type
 *
 * @param apiError - API error from ApiError interface
 * @param apiError.message - Error message as human-readable string
 * @param apiError.code - Error code (e.g., 'NETWORK_ERROR', 'VALIDATION_ERROR')
 * @param apiError.details - Error details if any
 * @returns GameError with appropriate type
 */
export function apiErrorToGameError(apiError: { message: string; code?: string; details?: any }): GameError {
  // Determine error type based on code
  let errorType: GameError["type"] = "data";

  if (apiError.code === "NETWORK_ERROR" || apiError.code === "OFFLINE" || apiError.code === "TIMEOUT") {
    errorType = "network";
  } else if (apiError.code === "VALIDATION_ERROR" || apiError.code === "ANIMAL_NOT_FOUND") {
    errorType = "validation";
  }

  return {
    message: apiError.message,
    code: apiError.code,
    details: apiError.details,
    type: errorType,
  };
}

/**
 * Convert validation error to GameError
 * Maps validation errors to game error format
 *
 * @param validationError - Validation error from ValidationError interface
 * @param validationError.message - Error message as human-readable string
 * @param validationError.type - Error type (e.g., 'invalid', 'duplicate', 'empty')
 * @param validationError.details - Error details if any
 * @returns GameError with validation type
 */
export function validationErrorToGameError(validationError: { message: string; type?: string; details?: any }): GameError {
  return {
    message: validationError.message,
    code: validationError.type?.toUpperCase(),
    details: validationError.details,
    type: "validation",
  };
}
