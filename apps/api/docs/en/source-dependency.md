# Source Dependency Rules

Korean mirror: [ko/source-dependency.md](../ko/source-dependency.md)

Rules are enforced by `dependency-cruiser/rules/source-dependency.cjs`. Run `pnpm dep-cruiser` to validate.

## Layer Isolation

### `core/` and `kernels/`

- `core/` contains only pure utilities; no framework imports
- `kernels/domain/` has no imports outside itself
- `kernels/application/` may import `kernels/domain/`
- `kernels/infrastructure/` may import `kernels/domain/` and `kernels/application/`
- `kernels/presentation/` may import `kernels/domain/` and `kernels/application/`

### Context Layer Rules

| Layer | Allowed imports |
|-------|----------------|
| `domain/` | Same context `domain/` only; `@core/*`, `@kernels/domain/*` |
| `application/` | Same context `domain/`; `@kernels/application/*` |
| `infrastructure/` | Anything within `@contexts/*`, `@core/*`, `@kernels/*` |
| `presentation/` | Anything within `@contexts/*`, `@core/*`, `@kernels/*` |

### Cross-Context Isolation

A context's `domain/` and `application/` layers must **not** directly import from another context. Cross-context calls go through ports defined in the consumer's own `domain/`.

```
prompt/domain/session-reader.ts       ← port (abstract class)
prompt/infrastructure/session/        ← adapter delegates to SessionService
```

## Path Alias Enforcement

All cross-directory imports use path aliases (`@contexts/*`, `@kernels/*`, `@core/*`, `@platform/*`). Relative imports that escape a single directory are banned by the `import-path-style` ESLint rule.
