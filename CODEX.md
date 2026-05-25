# CODEX.md — OpenAI Codex Agent Guide

> See `AGENTS.md` for the full rule index. This file covers environment
> bootstrap and Codex-specific gotchas only.

## Environment

| Requirement | Source                          | Value           |
| ----------- | ------------------------------- | --------------- |
| Node.js     | `.nvmrc`                        | `24.3.0`        |
| pnpm        | `package.json` `packageManager` | `10.33.0`       |
| corepack    | ships with Node >= 16           | must be enabled |

### Setup script (paste into Codex environment config)

```bash
# Bun + Homebrew bins
export PATH="$HOME/.bun/bin:/opt/homebrew/bin:$PATH"

# Load nvm and activate the project's .nvmrc version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true

# Enable corepack so the packageManager field activates pnpm@10.33.0
corepack enable >/dev/null 2>&1 || true

# Install deps (makes husky hooks, lint-staged, commitlint available)
pnpm install --frozen-lockfile >/dev/null 2>&1 || true
```

## Key commands

| Task       | Command           |
| ---------- | ----------------- |
| Build      | `pnpm build`      |
| Test       | `pnpm test:run`   |
| Lint       | `pnpm lint`       |
| Lint + fix | `pnpm lint:fix`   |
| Format     | `pnpm format:fix` |
| Typecheck  | `pnpm typecheck`  |

## Git hooks (Husky)

Hooks fire automatically on commit — **do not skip them**.

- **pre-commit** — runs `lint-staged` (oxfmt + oxlint on staged files).
- **commit-msg** — runs `commitlint` enforcing conventional commits.

### Commit format

Conventional commits are enforced. Allowed types:
`build`, `chore`, `ci`, `deps`, `docs`, `feat`, `fix`, `refactor`, `revert`, `style`, `test`.

```
type(scope): short description   ← max 100 chars
                                  ← blank line
- terse bullet points             ← body lines max 120 chars
```

**Never** include `Co-Authored-By` lines.

## Troubleshooting

| Symptom                              | Fix                                                    |
| ------------------------------------ | ------------------------------------------------------ |
| `pnpm: command not found`            | Run `corepack enable` — corepack ships with Node       |
| Wrong pnpm version                   | `corepack enable` reads the `packageManager` field     |
| Husky hook fails with missing binary | Run `pnpm install` — hooks need dev deps installed     |
| `nvm: command not found`             | Ensure nvm is installed and `NVM_DIR` is set correctly |
| Node version mismatch                | Run `nvm install` then `nvm use` (reads `.nvmrc`)      |

## Rules

All project rules are in `.github/instructions/` — see `AGENTS.md` for the full index.
Do not reference `@workspace/*` — all imports and deps must use published package names.
