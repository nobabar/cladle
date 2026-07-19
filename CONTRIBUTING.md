# Contributing

## Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <subject>
```

Scope is optional for broad tooling/chore work (`chore:`, `ci:`, `build:`), but prefer a scope when the change maps to a product area below.

### Types

Common types: `feat`, `fix`, `refactor`, `test`, `chore`, `style`, `docs`, `perf`, `ci`, `build`.

### Scopes

Use one of these scopes (prefer an existing one over inventing a new name):

| Scope          | Use for                                              |
| -------------- | ---------------------------------------------------- |
| `api`          | iNaturalist / network client and API integration     |
| `config`       | App and tooling configuration                        |
| `hints`        | In-game hint system                                  |
| `i18n`         | Locales, translations, locale preferences            |
| `info-postit`  | Information post-it / sticky-tab UI                  |
| `onboarding`   | Guided tour                                          |
| `preferences`  | User preferences (color mode, reading comfort, etc.) |
| `search`       | Animal search and suggestion filtering               |
| `storage`      | Persistence, caching, localStorage / IndexedDB       |
| `tests`        | Unit, component, and e2e tests                       |
| `tree`         | Phylogeny tree logic, layout, and navigation         |
| `ui`           | Shared UI, theming, icons, layout chrome             |
| `win-state`    | Win state panel, share, photo gallery                |

**Examples:**

```bash
feat(tree): keep deeper LCA clades attached when broader clades are added
fix(ui): improve suggestion highlighting with pointer events
feat(storage): add safe localStorage and session-gated persist errors
chore: upgrade pnpm and TypeScript stack
```

### Branches

- Do not commit directly to `main` or `dev`
- Use feature branches: `feature/{short-description}`

## Code of Conduct

By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
