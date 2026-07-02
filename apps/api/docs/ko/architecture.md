---
title: API 아키텍처 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/architecture.md
last_synced: 2026-07-02
related:
  - ./error.md
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API 아키텍처 컨벤션

이 문서는 API architecture map이다. 자세한 규칙은 연결된 문서를 사용한다.

## 적용 범위

- API 코드가 어느 상위 source area에 속하는지 결정할 때 이 문서를 사용한다.
- 이 문서는 architectural boundary를 이름 붙이고 상세 정책 문서로 라우팅한다. DDD, source dependency, runtime wiring, error policy를 대체하지 않는다.

## 아키텍처 축

API architecture는 두 축으로 설명한다:

- DDD model boundary는 model, language, responsibility가 어디에서 유효한지 정의한다.
- Dependency와 layer boundary는 어떤 코드가 어떤 다른 코드에 의존할 수 있는지 정의한다.

Application error, exception, protocol error response, system error를 정의, 변환, masking, 노출할 때는 error policy를 읽는다.

## 관련 문서

- [API 에러 정책](./error.md): application error 의미, category, transformation, response structure, unexpected system error handling.
- [API DDD 컨벤션](./ddd.md): bounded context, implementation module, domain kernel, domain model rule.
- [API 소스 의존성 컨벤션](./source-dependency.md): import direction, layer boundary, framework import rule.
- [API 런타임 와이어링 컨벤션](./runtime-wiring.md): NestJS DI, provider registration, platform runtime, port binding rule.

## 소스 경계

상위 API source boundary는 다음과 같다:

```text
src/
  main.ts
  core/
  kernels/
    domain/
    application/
    infrastructure/
    presentation/
  platform/
    nest/
  contexts/
    session/
      domain/
      application/
      infrastructure/
      presentation/
    prompt/
      domain/
      application/
      infrastructure/
      presentation/
```

이 map은 architectural boundary를 이름 붙일 뿐, 완전한 folder contract가 아니다.
Code가 필요로 할 때만 하위 directory와 layer folder를 만든다.
Context layer, `platform/nest`, `kernels` 내부 subdirectory는 feature, adapter type, framework need에 따라 달라질 수 있다.

## 현재 컨텍스트

- `session`은 browser/API conversation session lifecycle과 Claude session ID tracking을 소유한다.
- `prompt`는 prompt execution flow와 outbound Claude CLI integration을 소유한다.

Cross-context access는 consuming context가 소유한 좁은 contract를 통한다.
예를 들어 `prompt`는 session storage에 직접 접근하지 않고 `SessionReader`, `SessionManager` adapter를 통해 session data를 읽고 갱신한다.

## 디렉토리 읽기 규칙

- 먼저 코드가 bounded context, kernel, core, platform 중 어디에 속하는지 결정한다.
- 자세한 placement, import, wiring 규칙은 DDD, source dependency, runtime wiring 문서를 사용한다.
