/**
 * Error Messages Tests
 *
 * Comprehensive test suite for error message utilities.
 * Tests cover:
 * - Error message mapping
 * - User-friendly error message retrieval
 * - HTTP status code mapping
 * - Default error handling
 */

import { describe, expect, it } from "vitest";
import {
  apiErrorToGameError,
  ERROR_MESSAGES,
  getUserFriendlyError,
  mapHttpStatusToErrorCode,
  validationErrorToGameError,
} from "~/utils/errorMessages";

describe("getUserFriendlyError", () => {
  it("should return mapped message for known code", () => {
    const message = getUserFriendlyError("ANIMAL_NOT_FOUND");
    expect(message).toBe(ERROR_MESSAGES.ANIMAL_NOT_FOUND);
  });

  it("should return mapped message for NETWORK_ERROR", () => {
    const message = getUserFriendlyError("NETWORK_ERROR");
    expect(message).toBe(ERROR_MESSAGES.NETWORK_ERROR);
  });

  it("should return mapped message for VALIDATION_ERROR", () => {
    const message = getUserFriendlyError("VALIDATION_ERROR");
    expect(message).toBe(ERROR_MESSAGES.VALIDATION_ERROR);
  });

  it("should return mapped message for TIMEOUT", () => {
    const message = getUserFriendlyError("TIMEOUT");
    expect(message).toBe(ERROR_MESSAGES.TIMEOUT);
  });

  it("should return default message for unknown code", () => {
    const message = getUserFriendlyError("UNKNOWN_CODE");
    expect(message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });

  it("should return custom default if provided", () => {
    const customDefault = "Custom error message";
    const message = getUserFriendlyError("UNKNOWN_CODE", customDefault);
    expect(message).toBe(customDefault);
  });

  it("should handle undefined code", () => {
    const message = getUserFriendlyError();
    expect(message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });

  it("should handle null code", () => {
    const message = getUserFriendlyError(null as any);
    expect(message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });

  it("should handle empty string code", () => {
    const message = getUserFriendlyError("");
    expect(message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });

  it("should return all known error messages", () => {
    const knownCodes = [
      "ANIMAL_NOT_FOUND",
      "CLADE_NOT_FOUND",
      "INVALID_TAXONOMY",
      "NETWORK_ERROR",
      "VALIDATION_ERROR",
      "API_UNAVAILABLE",
      "CACHE_ERROR",
      "UNKNOWN_ERROR",
      "TIMEOUT",
      "NOT_FOUND",
      "PARSE_ERROR",
      "OFFLINE",
    ];

    for (const code of knownCodes) {
      const message = getUserFriendlyError(code);
      expect(message).toBeTruthy();
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    }
  });
});

describe("mapHttpStatusToErrorCode", () => {
  it("should map 404 to NOT_FOUND", () => {
    expect(mapHttpStatusToErrorCode(404)).toBe("NOT_FOUND");
  });

  it("should map 429 to API_UNAVAILABLE", () => {
    expect(mapHttpStatusToErrorCode(429)).toBe("API_UNAVAILABLE");
  });

  it("should map 500 to API_UNAVAILABLE", () => {
    expect(mapHttpStatusToErrorCode(500)).toBe("API_UNAVAILABLE");
  });

  it("should map 503 to API_UNAVAILABLE", () => {
    expect(mapHttpStatusToErrorCode(503)).toBe("API_UNAVAILABLE");
  });

  it("should map 5xx status codes to API_UNAVAILABLE", () => {
    expect(mapHttpStatusToErrorCode(500)).toBe("API_UNAVAILABLE");
    expect(mapHttpStatusToErrorCode(501)).toBe("API_UNAVAILABLE");
    expect(mapHttpStatusToErrorCode(502)).toBe("API_UNAVAILABLE");
    expect(mapHttpStatusToErrorCode(504)).toBe("API_UNAVAILABLE");
    expect(mapHttpStatusToErrorCode(599)).toBe("API_UNAVAILABLE");
  });

  it("should map 400 to VALIDATION_ERROR", () => {
    expect(mapHttpStatusToErrorCode(400)).toBe("VALIDATION_ERROR");
  });

  it("should map 401 to VALIDATION_ERROR", () => {
    expect(mapHttpStatusToErrorCode(401)).toBe("VALIDATION_ERROR");
  });

  it("should map 403 to VALIDATION_ERROR", () => {
    expect(mapHttpStatusToErrorCode(403)).toBe("VALIDATION_ERROR");
  });

  it("should map 4xx status codes (except 404, 429) to VALIDATION_ERROR", () => {
    expect(mapHttpStatusToErrorCode(400)).toBe("VALIDATION_ERROR");
    expect(mapHttpStatusToErrorCode(401)).toBe("VALIDATION_ERROR");
    expect(mapHttpStatusToErrorCode(403)).toBe("VALIDATION_ERROR");
    expect(mapHttpStatusToErrorCode(405)).toBe("VALIDATION_ERROR");
    expect(mapHttpStatusToErrorCode(422)).toBe("VALIDATION_ERROR");
    expect(mapHttpStatusToErrorCode(499)).toBe("VALIDATION_ERROR");
  });

  it("should map 200 to UNKNOWN_ERROR", () => {
    expect(mapHttpStatusToErrorCode(200)).toBe("UNKNOWN_ERROR");
  });

  it("should map 300 to UNKNOWN_ERROR", () => {
    expect(mapHttpStatusToErrorCode(300)).toBe("UNKNOWN_ERROR");
  });

  it("should map 1xx status codes to UNKNOWN_ERROR", () => {
    expect(mapHttpStatusToErrorCode(100)).toBe("UNKNOWN_ERROR");
    expect(mapHttpStatusToErrorCode(199)).toBe("UNKNOWN_ERROR");
  });

  it("should map 3xx status codes to UNKNOWN_ERROR", () => {
    expect(mapHttpStatusToErrorCode(300)).toBe("UNKNOWN_ERROR");
    expect(mapHttpStatusToErrorCode(301)).toBe("UNKNOWN_ERROR");
    expect(mapHttpStatusToErrorCode(302)).toBe("UNKNOWN_ERROR");
    expect(mapHttpStatusToErrorCode(399)).toBe("UNKNOWN_ERROR");
  });
});

describe("eRROR_MESSAGES constant", () => {
  it("should contain all required error messages", () => {
    const requiredMessages = [
      "ANIMAL_NOT_FOUND",
      "CLADE_NOT_FOUND",
      "INVALID_TAXONOMY",
      "NETWORK_ERROR",
      "VALIDATION_ERROR",
      "API_UNAVAILABLE",
      "CACHE_ERROR",
      "STORAGE_QUOTA_EXCEEDED",
      "STORAGE_WRITE_FAILED",
      "STORAGE_READ_FAILED",
      "UNKNOWN_ERROR",
      "TIMEOUT",
      "NOT_FOUND",
      "PARSE_ERROR",
      "OFFLINE",
    ];

    for (const code of requiredMessages) {
      const message = ERROR_MESSAGES[code];
      expect(message).toBeDefined();
      expect(typeof message).toBe("string");
      expect(message!.length).toBeGreaterThan(0);
    }
  });

  it("should have user-friendly messages (not technical)", () => {
    // Messages should not contain technical terms like "HTTP", "status code", etc.
    const technicalTerms = ["HTTP", "status code", "statusCode", "500", "404"];

    for (const [_, message] of Object.entries(ERROR_MESSAGES)) {
      for (const term of technicalTerms) {
        expect(message.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });

  it("should have actionable messages", () => {
    // Messages should provide guidance to users
    const actionableWords = ["please", "try", "check", "available"];

    // At least some messages should be actionable
    let actionableCount = 0;
    for (const message of Object.values(ERROR_MESSAGES)) {
      const lowerMessage = message.toLowerCase();
      if (actionableWords.some(word => lowerMessage.includes(word))) {
        actionableCount++;
      }
    }

    // At least half of messages should be actionable
    expect(actionableCount).toBeGreaterThan(Object.keys(ERROR_MESSAGES).length / 2);
  });
});

describe("apiErrorToGameError", () => {
  it("should convert API error to GameError with network type", () => {
    const apiError = {
      message: "Connection issue. Please check your internet and try again.",
      code: "NETWORK_ERROR",
      details: { originalError: "Network request failed" },
    };

    const gameError = apiErrorToGameError(apiError);
    expect(gameError).toEqual({
      message: apiError.message,
      code: apiError.code,
      details: apiError.details,
      type: "network",
    });
  });

  it("should convert API error to GameError with validation type", () => {
    const apiError = {
      message: "Animal not found. Please try a different name.",
      code: "ANIMAL_NOT_FOUND",
    };

    const gameError = apiErrorToGameError(apiError);
    expect(gameError).toEqual({
      message: apiError.message,
      code: apiError.code,
      details: undefined,
      type: "validation",
    });
  });

  it("should convert API error to GameError with data type for unknown codes", () => {
    const apiError = {
      message: "An unexpected error occurred.",
      code: "UNKNOWN_ERROR",
    };

    const gameError = apiErrorToGameError(apiError);
    expect(gameError).toEqual({
      message: apiError.message,
      code: apiError.code,
      details: undefined,
      type: "data",
    });
  });

  it("should handle timeout errors as network type", () => {
    const apiError = {
      message: "Request timed out. Please try again.",
      code: "TIMEOUT",
    };

    const gameError = apiErrorToGameError(apiError);
    expect(gameError.type).toBe("network");
  });

  it("should handle offline errors as network type", () => {
    const apiError = {
      message: "You appear to be offline. Please check your connection.",
      code: "OFFLINE",
    };

    const gameError = apiErrorToGameError(apiError);
    expect(gameError.type).toBe("network");
  });
});

describe("validationErrorToGameError", () => {
  it("should convert validation error to GameError", () => {
    const validationError = {
      message: "We couldn't find that animal. Try checking the spelling or searching for a different animal.",
      type: "invalid",
      details: { animalName: "test" },
    };

    const gameError = validationErrorToGameError(validationError);
    expect(gameError).toEqual({
      message: validationError.message,
      code: "INVALID",
      details: validationError.details,
      type: "validation",
    });
  });

  it("should handle validation error without type", () => {
    const validationError = {
      message: "Please enter a valid animal name.",
    };

    const gameError = validationErrorToGameError(validationError);
    expect(gameError).toEqual({
      message: validationError.message,
      code: undefined,
      details: undefined,
      type: "validation",
    });
  });

  it("should handle duplicate validation error", () => {
    const validationError = {
      message: "You've already guessed that animal! Try a different one.",
      type: "duplicate",
    };

    const gameError = validationErrorToGameError(validationError);
    expect(gameError.code).toBe("DUPLICATE");
    expect(gameError.type).toBe("validation");
  });

  it("should handle empty validation error", () => {
    const validationError = {
      message: "Please enter an animal name.",
      type: "empty",
    };

    const gameError = validationErrorToGameError(validationError);
    expect(gameError.code).toBe("EMPTY");
    expect(gameError.type).toBe("validation");
  });
});
