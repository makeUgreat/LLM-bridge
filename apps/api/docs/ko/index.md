---
title: API 컨벤션 인덱스
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/index.md
last_synced: 2026-07-02
related:
  - ./error.md
  - ./architecture.md
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
  - ./test.md
---

# API 컨벤션 인덱스

## 동기화 정책

영어와 한글 `apps/api` 컨벤션 문서는 같은 정책을 설명하는 쌍 문서다.
두 문서가 충돌하면 영어와 한글 중 의도한 정책을 선택하고 같은 변경 단위에서 양쪽 문서를 모두 수정한다.

## 읽기 규칙

현재 작업과 관련된 `apps/api` 컨벤션 문서만 읽는다.
공개 프로젝트 Markdown 문서를 변경할 때는 저장소 문서 컨벤션 인덱스도 읽는다.

## 라우팅

- API error, exception, masking, propagation, error response contract를 검토할 때: [API 에러 정책](./error.md)을 읽는다.
- `apps/api` architecture, DDD boundary, source structure, module boundary를 결정할 때: [API 아키텍처 컨벤션](./architecture.md)을 읽는다.
- `apps/api` DDD boundary, domain model ownership, shared domain language를 결정할 때: [API DDD 컨벤션](./ddd.md)을 읽는다.
- Import direction, layer boundary, framework import를 결정할 때: [API 소스 의존성 컨벤션](./source-dependency.md)을 읽는다.
- NestJS DI, provider registration, module wiring, platform startup flow, port binding을 결정할 때: [API 런타임 와이어링 컨벤션](./runtime-wiring.md)을 읽는다.
- `apps/api` test file, test structure, test command를 선택할 때: [API 테스트 컨벤션](./test.md)을 읽는다.
