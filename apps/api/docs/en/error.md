# Error Handling

Korean mirror: [ko/error.md](../ko/error.md)

## Exception Hierarchy

Three typed exception classes live in `kernels/`:

| Class | Source | When to throw |
|-------|--------|---------------|
| `DomainException<F>` | `@kernels/domain` | Domain rule violations (invalid input, invariant broken) |
| `ApplicationException<F>` | `@kernels/application` | Use-case failures (not found, permission denied, conflict) |
| `InfrastructureException<F>` | `@kernels/infrastructure` | External system failures (DB down, bad response) |
| `PresentationException<F>` | `@kernels/presentation` | Request validation errors (thrown by `ZodValidationPipe`) |

Each exception carries a typed `error` payload with `kind`, `code`, `message`, and `details`.

## Throwing in Application Services

```typescript
throw new ApplicationException({
  kind: APPLICATION_ERROR_KIND.NOT_FOUND,
  code: 'session.not_found',
  message: 'Session not found',
  details: {},
});
```

Do **not** throw NestJS `NotFoundException` or other `HttpException` subclasses from domain or application layers.

## HTTP Exception Filter

`HttpExceptionFilter` in `platform/nest/filters/` catches all exceptions and maps them to JSON responses:

```json
{
  "statusCode": 404,
  "code": "session.not_found",
  "message": "Session not found",
  "details": {}
}
```

### HTTP Status Mapping

| Exception kind | HTTP status |
|---------------|------------|
| `PRESENTATION.VALIDATION_FAILED` | 400 |
| `APPLICATION.NOT_FOUND` | 404 |
| `APPLICATION.VALIDATION_FAILED` | 400 |
| `APPLICATION.AUTHENTICATION_REQUIRED` | 401 |
| `APPLICATION.PERMISSION_DENIED` | 403 |
| `APPLICATION.STATE_CONFLICT` | 409 |
| `APPLICATION.OPERATION_NOT_ALLOWED` | 422 |
| `APPLICATION.RATE_LIMITED` | 429 |
| `APPLICATION.DEPENDENCY_UNAVAILABLE` | 503 |
| `INFRASTRUCTURE.UNAVAILABLE` | 503 |
| `INFRASTRUCTURE.TIMEOUT` | 503 |
| Unexpected | 500 |

## Request Validation

`ZodValidationPipe` reads `zodSchema` from the DTO class and validates the request body. On failure it throws a `PresentationException(VALIDATION_FAILED)`.

DTOs use static class properties:

```typescript
export class PromptBodyDto {
  static readonly zodSchema = z.object({ prompt: z.string().min(1) });
  static readonly zodErrorCode = 'prompt.body.validation_failed';
  static readonly zodErrorMessage = 'Invalid prompt request body';
}
```
