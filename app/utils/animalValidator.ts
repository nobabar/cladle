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
 * @see stores/gameStore.ts - Guess history source (Story 3.6)
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
 * Check if an animal name matches an existing animal (case-insensitive)
 *
 * @param name - Animal name to check
 * @param animal - Animal to compare against
 * @returns True if names match (case-insensitive)
 */
function animalNameMatches(name: string, animal: Animal): boolean {
  const normalizedName = normalizeAnimalName(name);
  const normalizedAnimalName = normalizeAnimalName(animal.name);
  const normalizedScientificName = normalizeAnimalName(animal.scientificName);

  return (
    normalizedName === normalizedAnimalName
    || normalizedName === normalizedScientificName
  );
}

/**
 * Check if animal has already been guessed
 *
 * @param animal - Animal to check
 * @param guessHistory - Array of previously guessed animals
 * @returns True if animal is a duplicate
 */
function isDuplicate(animal: Animal, guessHistory: Animal[]): boolean {
  return guessHistory.some(guessedAnimal =>
    animalNameMatches(animal.name, guessedAnimal),
  );
}

/**
 * Validate animal exists in database
 * Uses API client to search for the animal by name
 *
 * @param animalName - Name of the animal to validate
 * @param apiClient - Biological API client instance
 * @returns Promise resolving to Animal if found, null otherwise
 */
async function validateAnimalExists(
  animalName: string,
  apiClient: BiologicalAPIClient,
): Promise<Animal | null> {
  const trimmedName = animalName.trim();
  if (!trimmedName) {
    return null;
  }

  try {
    // Search for the animal by name
    const result = await apiClient.searchAnimals(trimmedName, 1);

    if (!result.data || result.data.length === 0) {
      return null;
    }

    // Check if any result matches the input name (case-insensitive)
    const matchingAnimal = result.data.find(animal =>
      animalNameMatches(trimmedName, animal),
    );

    return matchingAnimal || null;
  } catch {
    // If API call fails, we can't validate - return null
    // The caller should handle this appropriately
    return null;
  }
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
 * 1. Input is not empty or whitespace-only
 * 2. Animal exists in the database
 * 3. Animal has not been guessed before (duplicate check)
 *
 * @param animalName - Name of the animal to validate
 * @param guessHistory - Array of previously guessed animals
 * @param apiClient - Biological API client instance for validation
 * @returns Promise resolving to AnimalGuessValidationResult
 *
 * @example
 * ```typescript
 * const result = await validateAnimalGuess(
 *   "African Elephant",
 *   previousGuesses,
 *   apiClient
 * );
 * if (result.valid) {
 *   // Process guess with result.animal
 * } else {
 *   // Display error: result.error.message
 * }
 * ```
 */
export async function validateAnimalGuess(
  animalName: string,
  guessHistory: Animal[],
  apiClient: BiologicalAPIClient,
): Promise<AnimalGuessValidationResult> {
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

  // Validate animal exists in database
  const animal = await validateAnimalExists(trimmedName, apiClient);
  if (!animal) {
    return {
      valid: false,
      error: {
        type: "invalid",
        message: getErrorMessage("invalid", trimmedName),
      },
    };
  }

  // Check for duplicates
  if (isDuplicate(animal, guessHistory)) {
    return {
      valid: false,
      error: {
        type: "duplicate",
        message: getErrorMessage("duplicate", animal.name),
      },
    };
  }

  // Validation passed
  return {
    valid: true,
    animal,
  };
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
