<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { Animal } from "~/types/animal";
import type { ValidationError } from "~/utils/animalValidator";
import { useGameStore } from "~/stores/gameStore";

// Main game page - foundation for game interface
// This page will be extended with game components in future stories

const gameStore = useGameStore();

/**
 * Get tree data from game store
 */
const treeData = computed(() => gameStore.treeData);

/**
 * Get guess history from game store for duplicate prevention
 */
const guessHistory = computed(() => gameStore.guesses.map(g => g.animal));

/**
 * Handle animal selection - process as a guess
 * @param animal - The validated animal
 */
function handleAnimalSelect(animal: Animal) {
  try {
    // Animal already has full taxonomy data from validation
    gameStore.processGuess(animal);
  } catch (error) {
    // Handle game state errors
    if (error instanceof Error) {
      console.warn("Guess processing error:", error.message);
      // The error will be handled by validation in the component
    }
  }
}

/**
 * Handle validation errors
 * @param error - The validation error that occurred
 */
function handleValidationError(error: ValidationError) {
  // Validation error is already displayed in the component
  // This handler can be used for additional error handling if needed
  console.warn("Validation error:", error.message);
}

/**
 * Handle input events
 * @param _value - The input value (currently unused)
 */
function handleInput(_value: string) {
  // Input event handler - can be used for additional logic if needed
  // The component now handles API calls internally
}

/**
 * Start a new game with a target animal
 * For now, uses a default animal (Panthera tigris) - can be enhanced later with random selection
 */
async function startNewGame() {
  try {
    // Use real iNaturalist ID for Panthera tigris (Tiger)
    const tigerId = "41967";
    const api = useBiologicalAPI();

    // Fetch full animal data from API to ensure we have complete, accurate data
    const animalResponse = await api.fetchAnimalData(tigerId);

    if (animalResponse.error || !animalResponse.data) {
      console.error("Failed to fetch target animal data:", animalResponse.error?.message);
      // Fallback to hardcoded data if API fails
      const fallbackTarget: Animal = {
        id: tigerId,
        name: "Tiger",
        scientificName: "Panthera tigris",
        taxonomy: [
          "Animalia",
          "Chordata",
          "Mammalia",
          "Carnivora",
          "Felidae",
          "Panthera",
          "Panthera tigris",
        ],
      };
      gameStore.startGame(fallbackTarget, 6);
      return;
    }

    // Use the real animal data from the API
    gameStore.startGame(animalResponse.data, 6);
  } catch (error) {
    console.error("Failed to start game:", error);
    // Fallback to hardcoded data on error
    const fallbackTarget: Animal = {
      id: "41967",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: [
        "Animalia",
        "Chordata",
        "Mammalia",
        "Carnivora",
        "Felidae",
        "Panthera",
        "Panthera tigris",
      ],
    };
    gameStore.startGame(fallbackTarget, 6);
  }
}

/**
 * Initialize game on mount if not already started
 */
onMounted(() => {
  if (gameStore.status === "idle") {
    startNewGame();
  }
});
</script>

<template>
  <div class="min-h-screen">
    <!-- Game page structure - ready for game components integration -->
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-center mb-8">
        Cladle
      </h1>
      <p class="text-center text-muted mb-8">
        Phylogenetic guessing game
      </p>

      <!-- Game Status Display -->
      <div
        v-if="gameStore.isPlaying"
        class="max-w-2xl mx-auto mb-4 text-center"
      >
        <p class="text-sm text-muted">
          Guesses remaining: {{ gameStore.guessesRemaining }}
        </p>
      </div>

      <!-- Win/Loss State Component -->
      <GameWinState />

      <!-- Animal Search Component -->
      <div class="max-w-2xl mx-auto mb-8">
        <GameAnimalSearch
          :disabled="!gameStore.isPlaying"
          placeholder="Search for an animal..."
          :guess-history="guessHistory"
          @select="handleAnimalSelect"
          @input="handleInput"
          @validation-error="handleValidationError"
        />
      </div>

      <!-- Phylogenetic Tree Visualization -->
      <div class="max-w-6xl mx-auto mt-8 mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-center">
          Phylogenetic Tree
        </h2>
        <div class="w-full h-[600px]">
          <GameTreeVisualization
            :tree-data="treeData"
            :show-target="false"
            class="w-full h-full"
          />
        </div>
      </div>

      <!-- Game Info Display -->
      <div
        v-if="gameStore.isPlaying && gameStore.guesses.length > 0"
        class="max-w-2xl mx-auto mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg"
      >
        <h2 class="text-xl font-semibold mb-4">
          Recent Guesses
        </h2>
        <ul class="space-y-2">
          <li
            v-for="guess in gameStore.guesses.slice().reverse().slice(0, 3)"
            :key="guess.timestamp"
            class="flex justify-between items-center"
          >
            <span class="font-medium">
              {{ guess.animal.name }}
            </span>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              LCA: {{ guess.lca.clade }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
