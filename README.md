# cladle

A web-based phylogenetic guessing game where players guess animals and see evolutionary
relationships visualized in a phylogenetic tree.

## Project Status

🚧 **In Development** - This project is currently under active development.

## Technology Stack

- **Framework:** Nuxt 4 with Vue 3 Composition API
- **Language:** TypeScript (strict mode)
- **Build Tool:** Vite
- **UI Framework:** Nuxt UI
- **Package Manager:** pnpm

## Development

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm (or npm)

### Setup

Install dependencies:

```bash
pnpm install
```

### Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

### Type Checking

Run TypeScript type checking:

```bash
pnpm typecheck
```

### Linting

Run ESLint:

```bash
pnpm lint
```

Fix linting issues automatically:

```bash
pnpm lint:fix
```

### Pre-Commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to automatically check code quality before commits.

**What runs on commit:**
- ESLint with auto-fix on staged `.js`, `.ts`, `.vue` files
- TypeScript type checking on the whole project

**Hooks are automatically installed when you run `pnpm install` via the `prepare` script.**

**Bypassing hooks (emergencies only):**

```bash
git commit --no-verify -m "your message"
```

**⚠️ Note:** Only bypass hooks when absolutely necessary. The checks help maintain code quality.

**Troubleshooting:**

If hooks aren't working after cloning:
```bash
pnpm install  # Reinstalls hooks via prepare script
```

If you need to manually reinstall hooks:
```bash
pnpm exec husky install
```

### Production Build

Build the application for production:

```bash
pnpm build
```

Preview production build locally:

```bash
pnpm preview
```

## Project Structure

This project follows Nuxt 4 conventions with a structured organization:

```
cladle/
├── app/
│   ├── components/
│   │   ├── game/        # Game-specific components (tree visualization, animal search, etc.)
│   │   └── ui/          # Reusable UI components (custom components if needed)
│   ├── composables/     # Auto-imported composables (useAnimalData, useGameState, etc.)
│   ├── stores/          # Pinia stores (gameStore, animalDataStore)
│   ├── utils/           # Utility functions (lcaCalculator, taxonomyNormalizer, etc.)
│   ├── services/        # API and service layers (apiClient, cacheService)
│   ├── types/           # TypeScript type definitions (animal, clade, game, api, tree)
│   ├── pages/           # Nuxt pages (auto-routing)
│   └── app.vue          # Root application component
├── tests/               # All tests (separate from source)
│   ├── components/      # Component tests
│   ├── composables/     # Composable tests
│   ├── stores/          # Store tests
│   ├── utils/           # Utility tests
│   └── __mocks__/       # Test mocks and fixtures
├── public/              # Static assets
└── server/              # Server API routes (for post-MVP features)
```

### Directory Purpose

- **components/game/**: Game-specific Vue components (feature-based organization)
- **components/ui/**: Reusable UI components (most provided by Nuxt UI)
- **composables/**: Auto-imported composables following Nuxt 3 conventions
- **stores/**: Pinia stores with auto-import support via Pinia module
- **utils/**: Utility functions (auto-importable)
- **services/**: API clients and service layer logic
- **types/**: Shared TypeScript type definitions
- **tests/**: All test files mirroring source structure

### Auto-Imports

Nuxt 4 automatically imports:
- **Components** from `components/` directory
- **Composables** from `composables/` directory
- **Utilities** from `utils/` directory (if configured)
- **Stores** from `stores/` directory (via Pinia module)

No explicit imports needed for these items in your code!

## Coding Conventions

### Naming Conventions

This project follows strict naming conventions for consistency:

#### Components
- **Format:** kebab-case with `.vue` extension
- **Examples:** `tree-visualization.vue`, `animal-search.vue`, `information-panel.vue`
- **Usage:** Auto-imported, use in templates as `<TreeVisualization />` or `<tree-visualization />`

#### Composables
- **Format:** camelCase with `use` prefix and `.ts` extension
- **Examples:** `useAnimalData.ts`, `useGameState.ts`, `useTreeLayout.ts`
- **Usage:** Auto-imported, use in components as `const { data } = useAnimalData()`

#### Pinia Stores
- **Format:** camelCase with `Store` suffix and `.ts` extension
- **Examples:** `gameStore.ts`, `animalDataStore.ts`
- **Usage:** Auto-imported via Pinia module, use as `const gameStore = useGameStore()`

#### Utilities
- **Format:** camelCase with `.ts` extension
- **Examples:** `lcaCalculator.ts`, `taxonomyNormalizer.ts`, `dateUtils.ts`
- **Usage:** Auto-imported (if configured), export named functions

#### Services
- **Format:** camelCase with `.ts` extension
- **Examples:** `apiClient.ts`, `cacheService.ts`
- **Usage:** Import explicitly when needed

#### Types
- **Format:** camelCase with `.ts` extension
- **Examples:** `animal.ts`, `clade.ts`, `game.ts`, `api.ts`, `tree.ts`
- **Usage:** Import types explicitly: `import type { Animal } from '~/types/animal'`

### File Organization Principles

1. **Feature-based for components**: Group game components by feature in `components/game/`
2. **Flat structure for composables**: No unnecessary nesting in `composables/`
3. **One store per domain**: Separate stores for different concerns
4. **Service layer separation**: Keep API and service logic in `services/`
5. **Tests mirror source**: Test files in `tests/` follow same structure as source

## License

MIT License - See [LICENSE](LICENSE) file for details.
