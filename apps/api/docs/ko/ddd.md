---
title: API DDD 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/ddd.md
last_synced: 2026-07-02
related:
  - ./architecture.md
---

# API DDD 컨벤션

이 API에서 DDD 용어는 model ownership, language boundary, business behavior를 정의한다.
단순한 folder name이 아니다.

## 적용 범위

- Bounded context boundary, domain model ownership, shared domain language, domain-kernel usage, repository contract name을 결정할 때 이 문서를 사용한다.
- Source map은 architecture convention, import direction은 source dependency convention, provider binding은 runtime wiring convention을 사용한다.

## 모델 경계

### 바운디드 컨텍스트

- Bounded context는 domain model, ubiquitous language, responsibility boundary를 소유한다.
- 같은 단어도 다른 bounded context에서는 다른 의미일 수 있다.
- Bounded context 밖의 코드는 그 context의 internal model을 직접 수정하면 안 된다.
- Bounded context 밖의 코드는 그 context의 internal domain object에 의존하지 않는 것이 좋다.
- Context 간 통신은 ID, DTO, event, port, anti-corruption layer를 통해 이루어진다.
- Folder name이 context를 나타낼 수 있지만, boundary는 model, language, responsibility로 정당화되어야 한다.

### 구현 모듈

- Implementation module은 실용적인 code wiring 또는 framework module 단위다.
- Implementation module이 자동으로 DDD bounded context가 되는 것은 아니다.
- 다른 bounded context는 internal domain object에 접근하기보다 public application contract, ID, DTO, event, port를 통해 상호작용하는 것이 좋다.

## 도메인 커널

- `kernels/domain`은 context domain layer가 공유하는 domain-layer kernel code를 담는다.
- Domain-kernel code에는 여러 bounded context가 의도적으로 공유하는 stable domain-layer policy와 stable domain concept가 들어갈 수 있다.
- Shared domain concept 변경은 영향을 받는 context owner와 함께 검토한다.
- `kernels/domain`을 generic duplication-removal directory로 사용하면 안 된다.
- Concept가 불안정하거나 context-specific하다면 섣부른 domain-kernel code보다 중복을 선호한다.

## 도메인 모델 빌딩 블록

DDD building block은 class가 어디에 있는지가 아니라 domain에서 어떤 역할을 하는지로 선택한다.

### 빌딩 블록 역할

| 개념 | 역할 |
|---|---|
| Entity | Identity가 있고 lifecycle 동안 state가 바뀔 수 있는 domain object. |
| Value Object | Identity가 아니라 value로 의미가 결정되는 immutable object. |
| Aggregate | 함께 consistency를 보호해야 하는 entity와 value object의 그룹. |
| Aggregate Root | Aggregate 외부에서 접근할 수 있는 유일한 entry point이며 aggregate invariant를 보호한다. |
| Domain Method | Domain rule에 따라 entity 또는 aggregate state를 변경하는 behavior. |
| Domain Service | 하나의 entity, value object, aggregate root에 자연스럽게 속하지 않는 business rule. |
| Repository | Aggregate 저장과 조회를 위한 domain collection-like abstraction. Database query helper가 아니다. |
| Factory | 복잡한 domain object creation rule을 캡슐화한다. |
| Domain Event | Domain 안에서 이미 발생한 의미 있는 business fact. |
| Specification | 재사용 가능한 domain condition 또는 decision rule. |

### 책임 배치

- Caller, storage, transport, use case entry point와 무관하게 지켜야 하는 business invariant라면 domain에 둔다.
- 무엇을 load, authorize, call, save할지 결정해 use case를 실행하는 orchestration은 application layer에 둔다.
- External process 호출, persistence, publish, technical library 사용 방법을 결정하는 구현은 infrastructure layer에 둔다.
- Application service는 필요한 object를 load하고 domain method 또는 domain service를 호출한 뒤 변경을 save한다. Domain judgment를 직접 구현하지 않는 것이 좋다.
- Infrastructure adapter는 external process, file system, SDK, persistence, 기타 기술 세부사항을 domain 또는 application contract 뒤에서 구현한다.

### Value Object Raw Value 접근

- Base value-object contract가 제공한다면 raw value를 읽을 때 `unpack()`을 사용한다.
- Composite value object에서 여러 field를 읽을 때는 한 번 unpack해서 local variable에 담고 그 variable에서 field를 읽는다.
- Project-specific value object가 의도적으로 named readonly field를 노출한다면, request DTO를 그대로 반영하기보다 domain meaning에 집중한 API로 유지한다.

## Repository Method Naming

- `save`는 repository contract를 통해 aggregate를 persist한다. Context에 의미 있는 별도 command가 없다면 create와 update에 사용한다.
- `find`는 unique lookup으로 aggregate 또는 read model 하나를 조회하고 없으면 `undefined` 또는 `null`을 반환한다. 하나의 repository contract 안에서는 absence type을 일관되게 유지한다.
- `find`는 object parameter field name으로 lookup 의미를 표현해야 한다. 예: `find({ id })`.
- `get`은 caller가 resource 존재를 기대한다는 뜻이다. Absence가 그 contract에서 exceptional일 때만 사용하고, 아니면 `find`를 선호한다.
- `get`은 `find`와 같은 object parameter naming을 사용한다. 예: `get({ id })`.
- `list`는 여러 aggregate 또는 read model을 반환한다. Filtering이 필요하면 explicit criteria object를 받는 것이 좋다.
- `find`와 `get` criteria object는 하나의 resource를 식별하는 unique lookup만 표현해야 한다. 여러 결과가 나올 수 있는 filtering에는 `list`를 사용한다.
- Storage mechanic, query implementation, table shape를 노출하는 repository method name은 피한다.

## 도메인 캡슐화

- Domain object는 internal prop을 그대로 보여주는 generic getter보다 intention-revealing method로 behavior를 노출하는 것이 좋다.
- Caller가 domain state를 읽고 object 밖에서 domain decision을 내리게 하려는 getter와 snapshot은 피한다.
- Field를 꺼내 외부에서 판단하기보다 `isExpired`, `touch`, `attachClaudeSession`처럼 object에게 domain question에 답하거나 domain action을 수행하게 한다.
- DTO, persistence, presentation mapping은 layer boundary에서 explicit mapper나 purpose-specific read model을 사용할 수 있지만, 그 shape가 domain model의 기본 API가 되면 안 된다.
- Value object는 primitive value 자체가 domain concept라면 노출할 수 있다. Entity와 aggregate는 behavior-oriented API를 선호한다.

## Domain API Type Extraction

- 단순 method parameter 또는 return value가 한 method에서만 쓰이고 method name만으로 이해하기 쉽다면 inline object type을 선호한다.
- Shape가 하나의 aggregate 안에서 재사용되거나 signature를 너무 복잡하게 만들거나 internal restore/mapping detail을 나타낸다면 local non-exported type을 사용한다.
- Method parameter, result, status type은 다른 layer나 bounded context가 stable contract로 import해야 할 때만 export한다.
- Method가 public이라는 이유만으로 `Params`, `Result`, `Status` type을 만들지 않는다.
- 이름 붙일 가치가 있는 type은 기계적인 suffix보다 domain name을 선호한다. 그렇지 않으면 inline shape를 유지한다.

## 리뷰 체크

- 새 shared abstraction이 정말 stable domain concept인지 확인한 뒤 domain-kernel code로 만든다.
- Bounded context의 public language가 다른 context의 internal model을 누출하는지 확인한다.
- Domain object가 database row나 request DTO처럼 동작하지 않고 business behavior를 표현하는지 확인한다.
- Business invariant가 application orchestration이나 infrastructure implementation이 아니라 domain에 속하는지 확인한다.
- Application service가 state를 꺼내 외부에서 domain decision을 내리는 대신 domain behavior를 호출하는지 확인한다.
- Repository가 storage mechanic을 query helper로 노출하지 않고 aggregate storage와 retrieval을 모델링하는지 확인한다.
- Model boundary를 넘는 통신이 ID, DTO, event, port, anti-corruption mapping을 사용하는지 확인한다.
