# Documentation Guidelines

## Paired Documents

All convention documents live in pairs:

```
docs/
  en/<topic>.md   ← English (source of truth for agents reading English)
  ko/<topic>.md   ← Korean  (source of truth for Korean-speaking contributors)
apps/api/docs/
  en/<topic>.md
  ko/<topic>.md
```

When you update one side, update the other in the same commit.

## Naming

- Filenames: `kebab-case.md`
- `index.md` is the entry point for each language folder

## What to Document

| Category | Where |
|----------|-------|
| Project-wide conventions (doc format, commit style) | `docs/` |
| App-specific architecture, DDD, testing, error-handling | `apps/<name>/docs/` |

## What Not to Document

- Code that is self-explanatory
- Details already captured in code comments or type definitions
- Git history (use `git log` instead)

## Keeping Docs Current

The `.claude/rules/doc-sync.md` rule requires docs to be updated in the same commit as related code changes. When in doubt, update the relevant `index.md` first to re-anchor readers.
