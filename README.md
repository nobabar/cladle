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

This project follows Nuxt conventions (Nuxt 4):

- `app/` - Application code (components, pages, composables)
- `public/` - Static assets
- `server/` - Server API routes (for post-MVP features)

## License

MIT License - See [LICENSE](LICENSE) file for details.
