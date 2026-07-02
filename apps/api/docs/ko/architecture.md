# 아키텍처

영어 미러: [en/architecture.md](../en/architecture.md)

## 스타일

헥사고날(Ports & Adapters) 아키텍처 + DDD 바운디드 컨텍스트.

## 디렉토리 구조

```
src/
  core/                      # 순수 유틸리티 헬퍼 (프레임워크 의존 없음)
  kernels/                   # 레이어별 베이스 클래스 (domain / application / infrastructure / presentation)
  platform/
    nest/                    # NestJS 와이어링: AppModule, ZodValidationPipe, HttpExceptionFilter
  contexts/
    session/                 # 바운디드 컨텍스트 — 세션 생명주기
      domain/
      application/
      infrastructure/
        in-memory/
      presentation/
        http/
      session.di-tokens.ts
      session.module.ts
    prompt/                  # 바운디드 컨텍스트 — LLM 프롬프트 실행
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

## 레이어 규칙

| 레이어 | import 가능 범위 |
|--------|----------------|
| `domain/` | 같은 컨텍스트 `domain/` 내부만; 프레임워크 금지 |
| `application/` | `domain/`만 허용; `@Injectable()` 허용 (DI 등록 목적) |
| `infrastructure/` | 모두 허용 (`domain/`, `application/`, 포트를 통한 타 컨텍스트) |
| `presentation/` | 모두 허용 |

크로스 컨텍스트 접근은 항상 소비 컨텍스트의 `domain/`에 정의된 추상 포트 클래스를 통해 이루어집니다.

## 파일 네이밍

| 레이어 | 접미사 | 예시 |
|--------|--------|------|
| 도메인 엔티티 | `*.entity.ts` | `session.entity.ts` |
| 도메인 값 객체 | `*.vo.ts` | `claude-options.vo.ts` |
| 도메인 포트 | 접미사 없음 (abstract class) | `session.repository.ts`, `llm.executor.ts` |
| 애플리케이션 서비스 | `*.service.ts` | `session.service.ts` |
| 인프라 어댑터 | `*.adapter.ts`, `*.repository.ts` | `claude-cli.adapter.ts` |
| 프레젠테이션 컨트롤러 | `*.controller.ts` | `session-http.controller.ts` |
| 프레젠테이션 DTO | `*.http.dto.ts` | `session.http.dto.ts` |
| DI 토큰 | `*.di-tokens.ts` | `session.di-tokens.ts` |
| NestJS 모듈 | `*.module.ts` | `session.module.ts` |
