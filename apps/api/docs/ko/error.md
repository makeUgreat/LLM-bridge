# 에러 처리

영어 미러: [en/error.md](../en/error.md)

## 예외 계층

`kernels/`에 세 가지 타입 예외 클래스가 있습니다:

| 클래스 | 소스 | 언제 throw |
|--------|------|-----------|
| `DomainException<F>` | `@kernels/domain` | 도메인 규칙 위반 (잘못된 입력, 불변성 파괴) |
| `ApplicationException<F>` | `@kernels/application` | 유스케이스 실패 (not found, 권한 없음, 충돌) |
| `InfrastructureException<F>` | `@kernels/infrastructure` | 외부 시스템 장애 (DB 다운, 잘못된 응답) |
| `PresentationException<F>` | `@kernels/presentation` | 요청 검증 에러 (`ZodValidationPipe`가 throw) |

각 예외는 `kind`, `code`, `message`, `details`를 포함한 타입화된 `error` 페이로드를 가집니다.

## 애플리케이션 서비스에서 throw

```typescript
throw new ApplicationException({
  kind: APPLICATION_ERROR_KIND.NOT_FOUND,
  code: 'session.not_found',
  message: 'Session not found',
  details: {},
});
```

도메인 또는 애플리케이션 레이어에서 NestJS `NotFoundException`이나 다른 `HttpException` 서브클래스를 **throw하지 않습니다**.

## HTTP 예외 필터

`platform/nest/filters/`의 `HttpExceptionFilter`가 모든 예외를 받아 JSON 응답으로 변환합니다:

```json
{
  "statusCode": 404,
  "code": "session.not_found",
  "message": "Session not found",
  "details": {}
}
```

### HTTP 상태 코드 매핑

| 예외 kind | HTTP 상태 |
|----------|----------|
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
| 예상치 못한 예외 | 500 |

## 요청 검증

`ZodValidationPipe`는 DTO 클래스에서 `zodSchema`를 읽어 요청 body를 검증합니다. 실패 시 `PresentationException(VALIDATION_FAILED)`를 throw합니다.

DTO는 static 클래스 프로퍼티를 사용합니다:

```typescript
export class PromptBodyDto {
  static readonly zodSchema = z.object({ prompt: z.string().min(1) });
  static readonly zodErrorCode = 'prompt.body.validation_failed';
  static readonly zodErrorMessage = 'Invalid prompt request body';
}
```
