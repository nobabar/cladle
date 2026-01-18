<script setup lang="ts">
import { ref } from "vue";
import type { Animal } from "~/types/animal";

// Main game page - foundation for game interface
// This page will be extended with game components in future stories

const selectedAnimal = ref<Animal | null>(null);

function handleAnimalSelect(animal: Animal) {
  selectedAnimal.value = animal;
  // TODO: Integrate with game store to add animal as guess (Story 3.2)
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
          @select="handleAnimalSelect"
          @input="handleInput"
        />
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
