<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { Animal } from "~/types/animal";
import type { ValidationError } from "~/utils/animalValidator";
import { useGameStore } from "~/stores/gameStore";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";

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
 * Fetches full animal data with taxonomy before processing
 * @param animal - The selected animal (may have incomplete taxonomy from search)
 */
async function handleAnimalSelect(animal: Animal) {
  try {
    // Fetch full animal data with complete taxonomy
    // Search results have empty taxonomy for performance
    const api = useBiologicalAPI();
    const fullAnimalResponse = await api.fetchAnimalData(animal.id);

    if (fullAnimalResponse.error || !fullAnimalResponse.data) {
      console.warn("Failed to fetch full animal data:", fullAnimalResponse.error?.message);
      // Fallback: try to process with the animal we have (may have incomplete taxonomy)
      gameStore.processGuess(animal);
      return;
    }

    // Process guess with full animal data (includes complete taxonomy)
    gameStore.processGuess(fullAnimalResponse.data);
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
 * For now, uses a default animal - can be enhanced later with random selection
 */
async function startNewGame() {
  try {
    // For now, use a default target animal
    // TODO: Implement random animal selection or allow user to choose
    const defaultTarget: Animal = {
      id: "default-tiger",
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

    gameStore.startGame(defaultTarget, 6);
  } catch (error) {
    console.error("Failed to start game:", error);
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

      <!-- Win/Loss Messages -->
      <div
        v-if="gameStore.isWon"
        class="max-w-2xl mx-auto mb-4 p-4 bg-green-100 dark:bg-green-900 rounded-lg text-center"
      >
        <p class="text-lg font-semibold text-green-800 dark:text-green-200">
          🎉 Congratulations! You found the target animal!
        </p>
      </div>

      <div
        v-if="gameStore.isLost"
        class="max-w-2xl mx-auto mb-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg text-center"
      >
        <p class="text-lg font-semibold text-red-800 dark:text-red-200">
          Game Over! The target was: {{ gameStore.target?.name }}
        </p>
        <button
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          @click="startNewGame"
        >
          Start New Game
        </button>
      </div>

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
