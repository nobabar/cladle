/**
 * Animal Validation Utility
 *
 * Validates animal guesses before submission to ensure:
 * - Animal exists in the database
 * - Animal has not been guessed before (duplicate prevention)
 * - Input is valid (not empty, properly formatted)
 *
 * @see components/game/animal-search.vue - Integration point
 * @see stores/gameStore.ts - Guess history source
 */

import type { Animal } from "~/types/animal";
import type { BiologicalAPIClient } from "~/composables/useBiologicalAPI";

export type ValidationErrorType = "invalid" | "duplicate" | "empty";

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  details?: unknown;
}

export interface AnimalGuessValidationResult {
  valid: boolean;
  error?: ValidationError;
  animal?: Animal;
}

function normalizeAnimalName(name: string): string {
  return name.trim().toLowerCase();
}

function isDuplicate(animal: Animal, guessHistory: Animal[]): boolean {
  return guessHistory.some(guessedAnimal => guessedAnimal.id === animal.id);
}

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
 */
export async function validateAnimalGuess(
  animal: Animal,
  guessHistory: Animal[],
  apiClient: BiologicalAPIClient,
): Promise<AnimalGuessValidationResult> {
  if (!animal.id) {
    return {
      valid: false,
      error: {
        type: "invalid",
        message: getErrorMessage("invalid", animal.name),
      },
    };
  }

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
 */
export function validateAnimalGuessSync(
  animalName: string,
  guessHistory: Animal[],
): AnimalGuessValidationResult {
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
