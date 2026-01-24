<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { Animal } from "~/types/animal";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { validateAnimalGuess } from "~/utils/animalValidator";
import type { ValidationError } from "~/utils/animalValidator";

/**
 * Props
 */
interface Props {
  /** Optional list of animals to search through (if not provided, uses API) */
  animals?: Animal[];
  /** Placeholder text for the input */
  placeholder?: string;
  /** Minimum characters before showing suggestions (default: 2) */
  minChars?: number;
  /** Maximum number of suggestions to display (default: 20) */
  maxSuggestions?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Array of previously guessed animals for duplicate prevention */
  guessHistory?: Animal[];
}

const props = withDefaults(defineProps<Props>(), {
  animals: undefined,
  placeholder: "Search for an animal...",
  minChars: 2,
  maxSuggestions: 20,
  disabled: false,
  guessHistory: () => [],
});

const emit = defineEmits<Emits>();

/**
 * Emits
 */
interface Emits {
  (e: "select", animal: Animal): void;
  (e: "input", value: string): void;
  (e: "validationError", error: ValidationError): void;
}

/**
 * API Client
 */
const api = useBiologicalAPI();

/**
 * State
 */
const searchQuery = ref("");
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);
const suggestionsRef = ref<HTMLUListElement | null>(null);
const selectedAnimal = ref<Animal | null>(null);
const apiAnimals = ref<Animal[]>([]);
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const validationError = ref<ValidationError | null>(null);
const isSearching = ref(false);
const isSubmitting = ref(false);

/**
 * Keyboard shortcut to focus input
 * Must be defined after inputRef is declared
 * Only triggers when input is not already focused (prevents interference when typing "/")
 */
defineShortcuts({
  "/": {
    handler: () => {
      if (inputRef.value) {
        // UInput component wraps the actual input, need to find the real input element
        const componentElement = (inputRef.value as any)?.$el || inputRef.value;
        // Find the actual input element within the component
        const actualInput = componentElement?.querySelector?.("input") || componentElement;
        if (actualInput && typeof actualInput.focus === "function") {
          // Check if input is not already focused
          if (document.activeElement !== actualInput) {
            actualInput.focus();
          }
        }
      }
    },
    // Prevent shortcut when user is typing in any input/textarea
    usingInput: false,
  },
});

/**
 * Use API or provided animals
 */
const useApi = computed(() => !props.animals);

/**
 * Filtered suggestions based on search query
 */
const filteredSuggestions = computed(() => {
  const trimmedQuery = searchQuery.value?.trim() || "";
  if (!trimmedQuery || trimmedQuery.length < props.minChars) {
    return [];
  }

  const animalsToSearch = useApi.value ? apiAnimals.value : props.animals || [];
  const query = trimmedQuery.toLowerCase();
  const matches = animalsToSearch
    .filter((animal) => {
      const name = animal.name.toLowerCase();
      const scientificName = animal.scientificName.toLowerCase();
      return name.includes(query) || scientificName.includes(query);
    })
    .slice(0, props.maxSuggestions);

  return matches;
});

/**
 * Check if suggestions should be visible
 */
const showSuggestions = computed(() => isOpen.value && filteredSuggestions.value.length > 0);

/**
 * Handle input change
 * @param event
 */
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  searchQuery.value = target.value;
  // Clear selected animal when user starts typing again
  if (selectedAnimal.value) {
    selectedAnimal.value = null;
  }
  // Clear validation error when user starts typing
  if (validationError.value) {
    validationError.value = null;
  }
  isOpen.value = true;
  highlightedIndex.value = -1;
  emit("input", searchQuery.value);
}

/**
 * Handle suggestion selection with validation
 * @param animal
 */
async function selectAnimal(animal: Animal) {
  // Clear previous validation error
  validationError.value = null;

  // Set submitting state
  isSubmitting.value = true;

  try {
    // Validate animal guess before emitting
    const validationResult = await validateAnimalGuess(
      animal,
      props.guessHistory || [],
      api,
    );

    if (!validationResult.valid) {
      // Validation failed - show error and don't emit select event
      validationError.value = validationResult.error || null;
      emit("validationError", validationResult.error!);
      isSubmitting.value = false;

      // Keep suggestions open so user can try again
      // Don't clear the selected animal yet - let user see what they selected
      return;
    }

    // Validation passed - proceed with selection
    selectedAnimal.value = validationResult.animal || animal;
    searchQuery.value = ""; // Clear input after selection
    closeSuggestions();
    // Clear API results to prevent reopening
    if (useApi.value) {
      apiAnimals.value = [];
    }
    // Clear validation error on success
    validationError.value = null;
    emit("select", validationResult.animal || animal);

    // Clear submitting state after a short delay for visual feedback
    setTimeout(() => {
      isSubmitting.value = false;
    }, 300);
  } catch (error) {
    isSubmitting.value = false;
    // Handle unexpected errors
    validationError.value = {
      type: "invalid",
      message: "An unexpected error occurred. Please try again.",
      details: error,
    };
    emit("validationError", validationError.value);
  }
}

/**
 * Handle keyboard navigation
 * @param event KeyboardEvent
 */
function handleKeydown(event: KeyboardEvent) {
  // Handle Escape key first
  if (event.key === "Escape") {
    if (isOpen.value && filteredSuggestions.value.length > 0) {
      // If suggestions are open, close them (don't unfocus)
      event.preventDefault();
      closeSuggestions();
    } else {
      // If suggestions are closed and input is focused, unfocus the input
      event.preventDefault();
      const componentElement = inputRef.value
        ? ((inputRef.value as any)?.$el || inputRef.value)
        : null;
      const actualInput = componentElement?.querySelector?.("input") || componentElement;
      if (actualInput && document.activeElement === actualInput) {
        actualInput.blur();
      }
    }
    return;
  }

  // Only handle navigation keys when suggestions are open
  if (!isOpen.value || filteredSuggestions.value.length === 0) {
    return;
  }

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredSuggestions.value.length - 1,
      );
      scrollToHighlighted();
      break;

    case "ArrowUp":
      event.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
      scrollToHighlighted();
      break;

    case "Enter":
      event.preventDefault();
      if (
        highlightedIndex.value >= 0
        && highlightedIndex.value < filteredSuggestions.value.length
      ) {
        selectAnimal(filteredSuggestions.value[highlightedIndex.value]!);
      }
      break;

    default:
      // Allow other keys (typing) to work normally
      break;
  }
}

/**
 * Scroll to highlighted suggestion
 */
function scrollToHighlighted() {
  nextTick(() => {
    if (suggestionsRef.value && highlightedIndex.value >= 0) {
      const items = suggestionsRef.value.querySelectorAll("[role='option']");
      const highlightedItem = items[highlightedIndex.value] as HTMLElement;
      if (highlightedItem && typeof highlightedItem.scrollIntoView === "function") {
        highlightedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  });
}

/**
 * Close suggestions
 */
function closeSuggestions() {
  isOpen.value = false;
  highlightedIndex.value = -1;
}

/**
 * Clear input and reset state
 */
function clearInput() {
  searchQuery.value = "";
  selectedAnimal.value = null;
  closeSuggestions();
  if (useApi.value) {
    apiAnimals.value = [];
  }
  // Focus input after clearing
  nextTick(() => {
    if (inputRef.value) {
      const inputElement = (inputRef.value as any)?.$el || inputRef.value;
      if (inputElement && typeof inputElement.focus === "function") {
        inputElement.focus();
      }
    }
  });
}

/**
 * Handle click outside to close suggestions
 * @param event MouseEvent
 */
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  // Handle both component ref and element ref
  const inputElement = (
    (inputRef.value as any)?.$el || inputRef.value
  ) as HTMLElement | null;
  if (
    inputElement
    && typeof inputElement.contains === "function"
    && !inputElement.contains(target)
    && suggestionsRef.value
    && typeof suggestionsRef.value.contains === "function"
    && !suggestionsRef.value.contains(target)
  ) {
    closeSuggestions();
  }
}

/**
 * Split text into parts for highlighting (before, match, after)
 * Returns array of { text: string, isMatch: boolean } objects
 * This avoids v-html and prevents XSS attacks by using Vue's text interpolation
 * @param text - The text to split
 * @param query - The query to highlight
 * @returns Array of text parts with match indicators
 */
function splitTextForHighlight(
  text: string,
  query: string,
): Array<{ text: string; isMatch: boolean }> {
  if (!query || !text) {
    return [{ text, isMatch: false }];
  }

  const parts: Array<{ text: string; isMatch: boolean }> = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let searchIndex = 0;

  while (searchIndex < text.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, searchIndex);
    if (matchIndex === -1) {
      // No more matches, add remaining text
      if (lastIndex < text.length) {
        parts.push({ text: text.slice(lastIndex), isMatch: false });
      }
      break;
    }

    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push({ text: text.slice(lastIndex, matchIndex), isMatch: false });
    }

    // Add matched text
    parts.push({
      text: text.slice(matchIndex, matchIndex + query.length),
      isMatch: true,
    });

    lastIndex = matchIndex + query.length;
    searchIndex = lastIndex;
  }

  return parts.length > 0 ? parts : [{ text, isMatch: false }];
}

/**
 * Get suggestion ID for ARIA
 * @param index - The index of the suggestion
 * @returns The suggestion ID
 */
function getSuggestionId(index: number): string {
  return `animal-suggestion-${index}`;
}

/**
 * Lifecycle hooks
 */
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

/**
 * Search animals from API
 * @param query - Search query string
 */
async function searchAnimalsFromAPI(query: string) {
  if (!useApi.value) {
    return;
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < props.minChars) {
    apiAnimals.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  try {
    const result = await api.searchAnimals(trimmedQuery, props.maxSuggestions);
    if (result.data) {
      apiAnimals.value = result.data;
    } else {
      apiAnimals.value = [];
    }
  } catch {
    apiAnimals.value = [];
  } finally {
    isSearching.value = false;
  }
}

/**
 * Debounced search function
 * @param query - Search query string
 */
function debouncedSearch(query: string) {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  searchTimeout.value = setTimeout(() => {
    searchAnimalsFromAPI(query);
  }, 300); // 300ms debounce
}

/**
 * Watch for query changes to update suggestions visibility and trigger API search
 */
watch(searchQuery, (newQuery) => {
  const trimmedQuery = newQuery?.trim() || "";
  if (trimmedQuery.length >= props.minChars) {
    // Only open if not explicitly closed or if user is typing
    if (isOpen.value || !selectedAnimal.value) {
      isOpen.value = true;
      if (useApi.value) {
        debouncedSearch(newQuery);
      }
    }
  } else {
    isOpen.value = false;
    highlightedIndex.value = -1;
    if (useApi.value) {
      apiAnimals.value = [];
    }
  }
});

/**
 * Cleanup timeout on unmount
 */
onUnmounted(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="animal-search relative w-full">
    <!-- Search Input -->
    <div class="relative">
      <UInput
        ref="inputRef"
        :model-value="searchQuery"
        :placeholder="placeholder"
        :disabled="disabled || isSubmitting"
        :loading="isSearching"
        :ui="{ trailing: 'pe-1' }"
        aria-label="Search for an animal"
        :aria-expanded="isOpen"
        aria-autocomplete="list"
        :aria-controls="showSuggestions ? 'animal-suggestions' : undefined"
        :aria-activedescendant="
          highlightedIndex >= 0 ? getSuggestionId(highlightedIndex) : undefined
        "
        :aria-busy="isSearching || isSubmitting"
        class="w-full min-h-[44px] text-base notebook-input"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="isOpen = searchQuery.length >= minChars"
      >
        <template #trailing>
          <GameLoadingIndicator
            v-if="isSubmitting"
            size="sm"
            message=""
            class="mr-2"
          />
          <UButton
            v-else-if="searchQuery?.length"
            color="neutral"
            variant="link"
            size="sm"
            icon="i-lucide-circle-x"
            aria-label="Clear input"
            class="min-w-[44px] min-h-[44px] touch-target flex items-center justify-center"
            @click="clearInput"
          />
          <UKbd
            v-else
            value="/"
            class="text-xs mr-2 hidden sm:inline-flex sm:items-center sm:justify-center"
          />
        </template>
      </UInput>
    </div>

    <!-- Validation Error Message -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="validationError"
        role="alert"
        aria-live="polite"
        class="
          mt-2 px-3 py-2 text-sm
          text-[var(--color-error)] dark:text-[var(--color-error)]
          bg-[var(--color-error-soft)] dark:bg-[var(--color-error-soft)]
          border border-[var(--color-error)] dark:border-[var(--color-error)]
          rounded-sm italic
          notebook-error-message
        "
      >
        <div class="flex items-start">
          <span class="flex-shrink-0 mr-2">✏️</span>
          <span>{{ validationError.message }}</span>
        </div>
      </div>
    </Transition>

    <!-- Suggestions Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <ul
        v-if="showSuggestions"
        id="animal-suggestions"
        ref="suggestionsRef"
        role="listbox"
        :aria-label="`${filteredSuggestions.length} suggestions available`"
        class="
          absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-sm
          border border-[var(--color-secondary)] dark:border-[var(--color-secondary)]
          bg-[var(--color-paper)] dark:bg-[var(--color-paper)]
          notebook-suggestions
        "
      >
        <li
          v-for="(animal, index) in filteredSuggestions"
          :id="getSuggestionId(index)"
          :key="animal.id"
          role="option"
          :aria-selected="index === highlightedIndex"
          class="
            min-h-[44px] px-3 sm:px-4 py-3 cursor-pointer text-sm sm:text-base
            transition-colors touch-target
            border-b border-[var(--color-border-subtle)] dark:border-[var(--color-border-subtle)]
          "
          :class="[
            index === highlightedIndex
              ? 'bg-[var(--color-secondary-soft)] dark:bg-[var(--color-secondary-soft)]'
              : 'bg-[var(--color-paper)] dark:bg-[var(--color-paper)]',
          ]"
          @click="selectAnimal(animal)"
          @mouseenter="highlightedIndex = index"
        >
          <div class="flex flex-col">
            <span class="font-medium text-gray-900 dark:text-gray-100">
              <template
                v-for="(part, partIndex) in splitTextForHighlight(animal.name, searchQuery)"
                :key="partIndex"
              >
                <mark
                  v-if="part.isMatch"
                  class="bg-yellow-200 dark:bg-yellow-500 font-semibold"
                >
                  {{ part.text }}
                </mark>
                <template v-else>
                  {{ part.text }}
                </template>
              </template>
            </span>
            <span
              v-if="animal.scientificName"
              class="text-sm text-gray-500 dark:text-gray-400 italic"
            >
              <template
                v-for="
                  (part, partIndex) in splitTextForHighlight(
                    animal.scientificName,
                    searchQuery,
                  )
                "
                :key="partIndex"
              >
                <mark
                  v-if="part.isMatch"
                  class="bg-yellow-200 dark:bg-yellow-500 font-semibold"
                >
                  {{ part.text }}
                </mark>
                <template v-else>
                  {{ part.text }}
                </template>
              </template>
            </span>
          </div>
        </li>
      </ul>
    </Transition>

    <!-- Empty State -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="
          isOpen
            && searchQuery.length >= minChars
            && filteredSuggestions.length === 0
        "
        class="
          absolute z-50 mt-1 w-full rounded-sm border border-[var(--color-border-subtle)]
          dark:border-[var(--color-border-subtle)] bg-[var(--color-paper)] dark:bg-[var(--color-paper)]
          p-4 text-center text-[var(--color-ink-subtle)] dark:text-[var(--color-ink-subtle)]
        "
      >
        No animals found matching "{{ searchQuery }}"
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Notebook-style input */
.notebook-input :deep(input) {
  min-height: 44px;
  font-size: 16px; /* Prevent zoom on iOS */
  background-color: var(--color-paper);
  border-color: var(--color-secondary);
}

.notebook-input :deep(input:focus) {
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 1px var(--color-secondary);
  box-shadow: 0 0 0 3px rgba(107, 127, 142, 0.1); /* subtle glow with notebook-blue */
  outline: none;
}

/* Notebook-style suggestions - light rows aligned to grid */
.notebook-suggestions {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.notebook-suggestions li {
  border-bottom: 1px solid var(--color-border-subtle);
}

.notebook-suggestions li:last-child {
  border-bottom: none;
}

/* Teacher red pen error style */
.notebook-error-message {
  font-style: italic;
}

/* Touch target class for interactive elements */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: flex;
}

/* Custom scrollbar for suggestions */
ul::-webkit-scrollbar {
  width: 8px;
}

ul::-webkit-scrollbar-track {
  background: transparent;
}

ul::-webkit-scrollbar-thumb {
  background-color: var(--color-border-subtle);
  border-radius: 4px;
}

ul::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-border);
}

/* Mobile optimizations */
@media (max-width: 767px) {
  .animal-search {
    width: 100%;
  }
}

/* Tablet and desktop enhancements */
@media (min-width: 768px) {
  .notebook-input :deep(input) {
    font-size: 1rem;
  }

  /* Ensure UKbd is properly centered */
  .animal-search :deep(kbd) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }
}
</style>
