# Architecture

Korean mirror: [ko/architecture.md](../ko/architecture.md)

## Style

Hexagonal (Ports & Adapters), with DDD bounded contexts.

## Directory Layout

```
src/
  core/                      # Pure utility helpers (no framework)
  kernels/                   # Base classes per layer (domain / application / infrastructure / presentation)
  platform/
    nest/                    # NestJS wiring: AppModule, ZodValidationPipe, HttpExceptionFilter
  contexts/
    session/                 # Bounded context — session lifecycle
      domain/
      application/
      infrastructure/
        in-memory/
      presentation/
        http/
      session.di-tokens.ts
      session.module.ts
    prompt/                  # Bounded context — LLM prompt execution
      domain/
      application/
      infrastructure/
        claude-cli/
        session/
      presentation/
        http/
      prompt.di-tokens.ts
      prompt.module.ts
```

## Layer Rules

| Layer | May import |
|-------|-----------|
| `domain/` | Nothing outside `domain/` in the same context; no framework |
| `application/` | `domain/` only; `@Injectable()` allowed for DI registration |
| `infrastructure/` | Anything (`domain/`, `application/`, other contexts via ports) |
| `presentation/` | Anything |

Cross-context access is always through an abstract port class defined in the consuming context's `domain/`.

## File Naming

| Layer | Suffix | Example |
|-------|--------|---------|
| domain entity | `*.entity.ts` | `session.entity.ts` |
| domain value object | `*.vo.ts` | `claude-options.vo.ts` |
| domain port | no suffix (abstract class) | `session.repository.ts`, `llm.executor.ts` |
| application service | `*.service.ts` | `session.service.ts` |
| infrastructure adapter | `*.adapter.ts`, `*.repository.ts` | `claude-cli.adapter.ts` |
| presentation controller | `*.controller.ts` | `session-http.controller.ts` |
| presentation DTO | `*.http.dto.ts` | `session.http.dto.ts` |
| DI tokens | `*.di-tokens.ts` | `session.di-tokens.ts` |
| NestJS module | `*.module.ts` | `session.module.ts` |
