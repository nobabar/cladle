<script setup lang="ts">
import { ref } from "vue";
import type { Animal } from "~/types/animal";
import type { ValidationError } from "~/utils/animalValidator";
import type { TreeData } from "~/types/tree";

// Main game page - foundation for game interface
// This page will be extended with game components in future stories

const selectedAnimal = ref<Animal | null>(null);
// TODO: Replace with game store guess history (Story 3.6)
const guessHistory = ref<Animal[]>([]);

// Tree data for visualization
// TODO: Replace with tree data from game store (Story 3.6)
// TODO: Build tree from guesses using tree building logic (Story 3.4)
const treeData = ref<TreeData | null>(null);

function handleAnimalSelect(animal: Animal) {
  selectedAnimal.value = animal;
  // Add to guess history for duplicate prevention
  // TODO: Integrate with game store to add animal as guess (Story 3.6)
  guessHistory.value.push(animal);
  // TODO: Update tree data when guess is made (Story 3.4)
}

function handleValidationError(error: ValidationError) {
  // Validation error is already displayed in the component
  // This handler can be used for additional error handling if needed
  console.warn("Validation error:", error.message);
}

function handleInput(_value: string) {
  // Input event handler - can be used for additional logic if needed
  // The component now handles API calls internally
}
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

      <!-- Animal Search Component -->
      <div class="max-w-2xl mx-auto mb-8">
        <GameAnimalSearch
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

      <!-- Selected Animal Display (temporary for demonstration) -->
      <div
        v-if="selectedAnimal"
        class="max-w-2xl mx-auto mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg"
      >
        <h2 class="text-xl font-semibold mb-2">
          Selected Animal
        </h2>
        <p class="text-lg font-medium">
          {{ selectedAnimal.name }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 italic">
          {{ selectedAnimal.scientificName }}
        </p>
      </div>
    </div>
  </div>
</template>
