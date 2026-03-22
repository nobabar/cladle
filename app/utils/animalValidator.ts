/**
 * Animal Validation Utility
 *
 * Validates animal guesses before submission to ensure:
 * - Animal exists in the database
 * - Animal has not been guessed before (duplicate prevention)
 * - Input is valid (not empty, properly formatted)
 *
 * Architecture Pattern:
 * - Pure functions with no side effects
 * - Returns ValidationResult with detailed error information
 * - User-friendly error messages (no technical details exposed)
 * - Case-insensitive duplicate detection
 *
 * @see components/game/animal-search.vue - Integration point
 * @see stores/gameStore.ts - Guess history source
 */

import type { Animal } from "~/types/animal";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";

/**
 * Validation error types
 */
export type ValidationErrorType = "invalid" | "duplicate" | "empty";

/**
 * Validation error structure
 * Provides detailed error information for user feedback
 */
export interface ValidationError {
  /** Type of validation error */
  type: ValidationErrorType;

  /** User-friendly error message */
  message: string;

  /** Optional additional error details (not exposed to user) */
  details?: unknown;
}

/**
 * Validation result structure for animal guess validation
 * Provides validation status and either validated animal or error information
 */
export interface AnimalGuessValidationResult {
  /** Whether the validation passed */
  valid: boolean;

  /** Validation error (if validation failed) */
  error?: ValidationError;

  /** Validated animal data (if validation passed) */
  animal?: Animal;
}

/**
 * Normalize animal name for comparison
 * Handles case-insensitive comparison and whitespace normalization
 *
 * @param name - Animal name to normalize
 * @returns Normalized name (trimmed, lowercase)
 */
function normalizeAnimalName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Check if animal has already been guessed
 * Uses ID comparison for reliable duplicate detection
 *
 * @param animal - Animal to check
 * @param guessHistory - Array of previously guessed animals
 * @returns True if animal is a duplicate
 */
function isDuplicate(animal: Animal, guessHistory: Animal[]): boolean {
  return guessHistory.some(guessedAnimal => guessedAnimal.id === animal.id);
}

/**
 * Get user-friendly error message for validation error type
 *
 * @param errorType - Type of validation error
 * @param _animalName - Optional animal name for context (currently unused)
 * @returns User-friendly error message
 */
function getErrorMessage(
  errorType: ValidationErrorType,
  _animalName?: string,
): string {
  switch (errorType) {
    case "empty":
      return "Please enter an animal name.";

    case "invalid":
      return "We couldn't find that animal. Try checking the spelling or searching for a different animal.";

    case "duplicate":
      return "You've already guessed that animal! Try a different one.";

    default:
      return "Please enter a valid animal name.";
  }
}

/**
 * Validate animal guess
 *
 * Validates that:
 * 1. Animal has a valid ID
 * 2. Animal exists in the database (fetched by ID)
 * 3. Animal has not been guessed before (duplicate check)
 *
 * Uses ID-based validation for reliability and efficiency.
 * This ensures we get the complete animal data with taxonomy in one call.
 *
 * @param animal - Animal object to validate (must have an ID)
 * @param guessHistory - Array of previously guessed animals
 * @param apiClient - Biological API client instance for validation
 * @returns Promise resolving to AnimalGuessValidationResult
 *
 * @example
 * ```typescript
 * const result = await validateAnimalGuess(
 *   animalObject,
 *   previousGuesses,
 *   apiClient
 * );
 * if (result.valid) {
 *   // Process guess with result.animal (includes full taxonomy)
 * } else {
 *   // Display error: result.error.message
 * }
 * ```
 */
export async function validateAnimalGuess(
  animal: Animal,
  guessHistory: Animal[],
  apiClient: BiologicalAPIClient,
): Promise<AnimalGuessValidationResult> {
  // Check if animal has an ID
  if (!animal.id) {
    return {
      valid: false,
      error: {
        type: "invalid",
        message: getErrorMessage("invalid", animal.name),
      },
    };
  }

  // Check if name is empty (basic validation)
  const trimmedName = animal.name.trim();
  if (!trimmedName) {
    return {
      valid: false,
      error: {
        type: "empty",
        message: getErrorMessage("empty"),
      },
    };
  }

  try {
    // Fetch animal by ID to ensure it exists and get full data
    const result = await apiClient.fetchAnimalData(animal.id);

    if (result.error || !result.data) {
      return {
        valid: false,
        error: {
          type: "invalid",
          message: getErrorMessage("invalid", animal.name),
        },
      };
    }

    const validatedAnimal = result.data;

    // Check for duplicates using the validated animal
    if (isDuplicate(validatedAnimal, guessHistory)) {
      return {
        valid: false,
        error: {
          type: "duplicate",
          message: getErrorMessage("duplicate", validatedAnimal.name),
        },
      };
    }

    // Validation passed
    return {
      valid: true,
      animal: validatedAnimal,
    };
  } catch {
    // If API call fails, we can't validate - return error
    return {
      valid: false,
      error: {
        type: "invalid",
        message: getErrorMessage("invalid", animal.name),
      },
    };
  }
}

/**
 * Synchronous validation for basic input checks
 * Useful for immediate feedback before API call
 *
 * @param animalName - Name of the animal to validate
 * @param guessHistory - Array of previously guessed animals
 * @returns AnimalGuessValidationResult (synchronous, doesn't check database)
 *
 * @example
 * ```typescript
 * const result = validateAnimalGuessSync("", []);
 * if (!result.valid) {
 *   // Show error immediately without API call
 * }
 * ```
 */
export function validateAnimalGuessSync(
  animalName: string,
  guessHistory: Animal[],
): AnimalGuessValidationResult {
  // Check if input is empty or whitespace-only
  const trimmedName = animalName.trim();
  if (!trimmedName) {
    return {
      valid: false,
      error: {
        type: "empty",
        message: getErrorMessage("empty"),
      },
    };
  }

  // For sync validation, we can't check database existence
  // But we can check for duplicates if we have an exact match in history
  // This is a best-effort check - full validation requires API call
  const normalizedName = normalizeAnimalName(trimmedName);
  const duplicate = guessHistory.find((guessedAnimal) => {
    const normalizedAnimalName = normalizeAnimalName(guessedAnimal.name);
    const normalizedScientificName = normalizeAnimalName(guessedAnimal.scientificName);
    return (
      normalizedName === normalizedAnimalName
      || normalizedName === normalizedScientificName
    );
  });

  if (duplicate) {
    return {
      valid: false,
      error: {
        type: "duplicate",
        message: getErrorMessage("duplicate", duplicate.name),
      },
    };
  }

  // Sync validation passed (but database validation still needed)
  // Return a partial result - caller should still call validateAnimalGuess
  return {
    valid: true,
  };
}
