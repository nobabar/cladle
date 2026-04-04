# Project Context - Cladle

**Last Updated:** 2026-01-14

This document serves as the authoritative coding standards and project context for developers implementing features in this project.

---

## Code Style Standards

### TypeScript/JavaScript Formatting

**Critical Formatting Rules (from ESLint config):**

```javascript
// ✅ CORRECT - Use double quotes
const correctMessage = "Hello, world";
const animal = "Tiger";

// ❌ WRONG - Single quotes not allowed
const wrongMessage = 'Hello, world';

// ✅ CORRECT - Always use semicolons
const correctResult = calculateLCA(animal1, animal2);

// ❌ WRONG - Missing semicolons
const wrongResult = calculateLCA(animal1, animal2)

// ✅ CORRECT - 2 space indentation
function example() {
  if (condition) {
    doSomething();
  }
}

// ✅ CORRECT - 1TBS brace style
if (condition) {
  doSomething();
} else {
  doSomethingElse();
}
```

### Key ESLint Rules to Follow

From `eslint.config.mjs`:

- **quotes: "double"** - Always use double quotes for strings
- **semi: true** - Always include semicolons at the end of statements
- **indent: 2** - Use 2 spaces for indentation (never tabs)
- **brace-style: "1tbs"** - One True Brace Style with single line allowed
- **max-len: 100** - Maximum 100 characters per line (with exceptions for URLs, strings, etc.)
- **camelcase: "warn"** - Use camelCase for variable names

**Linting Commands:**
```bash
# Run linting
pnpm run lint

# Auto-fix formatting issues (when possible)
pnpm run lint:fix
```

---

## Architecture Compliance

### Naming Conventions

**Components:**
```
<!-- ✅ CORRECT - kebab-case for .vue files -->
components/game/tree-visualization.vue
components/game/animal-search.vue

<!-- ❌ WRONG - PascalCase not used for .vue files -->
components/game/TreeVisualization.vue
```

**Composables:**
```
// ✅ CORRECT - camelCase with 'use' prefix
composables/useAnimalData.ts
composables/useGameState.ts

// ❌ WRONG - kebab-case or PascalCase
composables/use-animal-data.ts
composables/UseAnimalData.ts
```

**Pinia Stores:**
```
// ✅ CORRECT - camelCase with 'Store' suffix
stores/gameStore.ts
stores/animalDataStore.ts

// ❌ WRONG - kebab-case or missing suffix
stores/game-store.ts
stores/game.ts
```

**Utilities:**
```
// ✅ CORRECT - camelCase
utils/lcaCalculator.ts
utils/taxonomyNormalizer.ts

// ❌ WRONG - kebab-case
utils/lca-calculator.ts
```

### Vue 3 Composition API

**Always use Composition API (REQUIRED):**

```vue
<script setup lang="ts">
// ✅ CORRECT - Composition API with <script setup>
import { computed, ref } from "vue";

const count = ref(0);
const doubleCount = computed(() => count.value * 2);

function increment() {
  count.value++;
}
</script>
```

### TypeScript Strict Mode

- TypeScript strict mode is enabled
- Always provide explicit types for function parameters and return values
- Avoid `any` types - use proper type definitions
- Use types from `types/` directory: `types/animal.ts`, `types/clade.ts`, `types/api.ts`, etc.

---

## Project Structure Compliance

### File Organization

```
components/
├── game/              # Game-specific components (by feature)
│   ├── tree-visualization.vue
│   ├── animal-search.vue
│   └── information-panel.vue
└── ui/                # Reusable UI components

composables/           # Flat structure, no nesting
├── useAnimalData.ts
├── useGameState.ts
└── useTreeLayout.ts

stores/               # One store per domain
├── gameStore.ts
└── animalDataStore.ts

utils/                # Pure functions
├── lcaCalculator.ts
├── taxonomyNormalizer.ts
└── puzzleSelector.ts

tests/                # Separate test directory (mirrors source structure)
├── components/
├── composables/
├── stores/
└── utils/
```

### Test File Locations

**ALWAYS place tests in the `tests/` directory:**

```
✅ CORRECT:
tests/composables/useAnimalData.test.ts
tests/stores/gameStore.test.ts
tests/utils/lcaCalculator.test.ts

❌ WRONG (co-located tests):
composables/useAnimalData.test.ts
stores/gameStore.test.ts
```

---

## State Management Patterns

### Pinia Action Naming

```typescript
// ✅ CORRECT - Follow naming conventions
export const useGameStore = defineStore("game", {
  actions: {
    // fetch* for API calls
    async fetchAnimalData(id: string) { ... },

    // get* for computed/getters
    getCurrentPuzzle() { ... },

    // set* for direct state updates
    setGameState(state: GameState) { ... },

    // update* for partial updates
    updateGuessHistory(guess: Guess) { ... },

    // reset* for resets
    resetGameState() { ... }
  }
});
```

### Error Handling

```typescript
// ✅ CORRECT - Store error state
interface StoreState {
  isLoading: boolean;
  error: {
    message: string;
    code?: string;
    details?: any;
  } | null;
}

// User-facing error messages
const error = {
  message: "Animal not found. Please try another name.",
  code: "ANIMAL_NOT_FOUND"
};
```

---

## Testing

**Test Framework:** Vitest (configured in `vitest.config.ts`)
- All tests must pass before committing
- No regressions allowed

---

## API Response Format

```typescript
// ✅ CORRECT - Wrapped response format
{
  data: { animalName: "Tiger", cladeInfo: {...} },
  error: null
}

// or for errors:
{
  data: null,
  error: {
    message: "User-friendly message",
    code: "ERROR_CODE",
    details: {}
  }
}

// ❌ WRONG - Direct response
{ animalName: "Tiger" }

// ❌ WRONG - snake_case fields
{ animal_name: "Tiger" }
```

---

## Git Workflow

- Never commit to `main` or `dev` directly
- Create feature branches: `feature/{short-description}`
- Use conventional commits for semantic release
- Commit format: `<type>(<scope>): <subject>`

**Example:**
```bash
feat(api): implement biological database client

- Add abstract API client interface
- Implement NCBI API integration
- Add error handling and retry logic

Closes #2-3
```
