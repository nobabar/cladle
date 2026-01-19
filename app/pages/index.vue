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
  <div class="min-h-screen game-page">
    <!-- Game page structure - mobile-first responsive design -->
    <div class="container mx-auto px-4 py-4 sm:py-6 md:py-8">
      <!-- Header -->
      <header class="mb-4 sm:mb-6 md:mb-8">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-4">
          Cladle
        </h1>
        <p class="text-center text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Phylogenetic guessing game
        </p>
      </header>

      <!-- Game Status Display -->
      <div
        v-if="gameStore.isPlaying"
        class="max-w-2xl mx-auto mb-3 sm:mb-4 text-center"
      >
        <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Guesses remaining: <strong>{{ gameStore.guessesRemaining }}</strong>
        </p>
      </div>

      <!-- Win/Loss State Component -->
      <GameWinState />

      <!-- Animal Search Component -->
      <div class="max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8">
        <GameAnimalSearch
          :disabled="!gameStore.isPlaying"
          placeholder="Search for an animal..."
          :guess-history="guessHistory"
          @select="handleAnimalSelect"
          @input="handleInput"
          @validation-error="handleValidationError"
        />
        <!-- First-time user hint (progressive disclosure) -->
        <p
          v-if="gameStore.isPlaying && gameStore.guesses.length === 0"
          class="mt-2 text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400"
        >
          Start by searching for an animal to see how it relates to the target
        </p>
      </div>

      <!-- Phylogenetic Tree Visualization -->
      <div class="max-w-6xl mx-auto mt-4 sm:mt-6 md:mt-8 mb-4 sm:mb-6 md:mb-8">
        <h2 class="text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4 text-center">
          Phylogenetic Tree
        </h2>
        <!-- Progressive disclosure: Show hint only when tree is empty -->
        <p
          v-if="!treeData || treeData.nodes.length === 0"
          class="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 mb-2"
        >
          Make your first guess to see the phylogenetic tree
        </p>
        <div class="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
          <GameTreeVisualization
            :tree-data="treeData"
            :show-target="false"
            class="w-full h-full"
          />
        </div>
        <!-- Progressive disclosure: Show interaction hint when tree has data -->
        <p
          v-if="treeData && treeData.nodes.length > 0"
          class="mt-2 text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400"
        >
          <span class="hidden sm:inline">Click on nodes to explore details</span>
          <span class="sm:hidden">Tap nodes to explore</span>
        </p>
      </div>

      <!-- Game Info Display (Progressive Disclosure) -->
      <div
        v-if="gameStore.isPlaying && gameStore.guesses.length > 0"
        class="max-w-2xl mx-auto mt-4 sm:mt-6 md:mt-8 p-4 sm:p-5 md:p-6 bg-gray-100 dark:bg-gray-800 rounded-lg"
      >
        <h2 class="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">
          Recent Guesses
        </h2>
        <ul class="space-y-2 sm:space-y-3">
          <li
            v-for="guess in gameStore.guesses.slice().reverse().slice(0, 3)"
            :key="guess.timestamp"
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 py-2 sm:py-1"
          >
            <span class="font-medium text-sm sm:text-base">
              {{ guess.animal.name }}
            </span>
            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              LCA: {{ guess.lca.clade }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
