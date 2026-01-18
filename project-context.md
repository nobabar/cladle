# Project Context - Cladle

**Last Updated:** 2026-01-14

This document serves as the authoritative coding standards and project context for developers implementing features in this project.

---

## Critical Rules for Developers

### ALWAYS Follow These Standards

1. **Read the Architecture Document First**
   - Location: `_bmad-output/planning-artifacts/architecture.md`
   - This document contains comprehensive architectural decisions, patterns, and structures
   - All implementation MUST align with architectural decisions

2. **Follow ESLint Configuration**
   - Configuration file: `eslint.config.mjs`
   - ESLint rules are MANDATORY and auto-enforced

3. **Run Linting Before Committing**
   - Always run linting checks before marking tasks complete
   - Fix all linting errors immediately

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

## Testing Requirements

### Test-Driven Development (TDD)

**For Algorithms and Core Logic (MANDATORY TDD):**
- LCA calculation
- Puzzle selection algorithm
- Taxonomy normalization
- API client utilities
- Pinia stores

**Write tests FIRST (Red-Green-Refactor):**

1. **RED:** Write failing test
2. **GREEN:** Write minimal code to pass test
3. **REFACTOR:** Improve code while keeping tests green

**Test Framework:**
- Use Vitest (configured in `vitest.config.ts`)
- All tests must pass before marking tasks complete
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

**Follow git-workflow-standards.md:**
- Never commit to `main` or `dev` directly
- Create feature branches: `feature/{story-id}-{description}`
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

---

## Enforcement

### Before Completing Any Task

1. ✅ Run ESLint: All rules must pass
2. ✅ Run tests: All tests must pass (no regressions)
3. ✅ Verify naming conventions match architecture
4. ✅ Check file organization matches project structure
5. ✅ Confirm code follows formatting rules (double quotes, semicolons)

### ESLint Command

```bash
# Run linting
npx eslint .

# Auto-fix formatting issues (when possible)
npx eslint . --fix
```

---

## Quick Reference Checklist

Before marking any task complete, verify:

- [ ] Code uses **double quotes** for all strings
- [ ] Code includes **semicolons** at the end of statements
- [ ] Code uses **2 space indentation**
- [ ] File naming follows conventions (kebab-case for components, camelCase for composables/stores/utils)
- [ ] Files are in correct directories per project structure
- [ ] Tests exist and pass (100% pass rate)
- [ ] ESLint passes with no errors
- [ ] TypeScript compiles with no errors
- [ ] Pinia actions follow naming conventions (fetch*/get*/set*/update*/reset*)
- [ ] Error handling follows standardized patterns
- [ ] API responses use wrapped format with camelCase fields
- [ ] No regressions in existing functionality

---

## References

- **Architecture Document:** `_bmad-output/planning-artifacts/architecture.md`
- **ESLint Config:** `eslint.config.mjs`
- **Git Workflow:** `_bmad/bmm/data/git-workflow-standards.md`
- **Epics & Stories:** `_bmad-output/planning-artifacts/epics.md`
- **PRD:** `_bmad-output/planning-artifacts/prd.md`

---

**Remember:** This document is the authoritative source for coding standards. Follow it strictly to ensure consistency across all code in this project.
