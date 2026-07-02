---
title: API 테스트 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/test.md
last_synced: 2026-07-02
related:
  - ./architecture.md
  - ./index.md
---

# API 테스트 컨벤션

API app은 Vitest를 사용하며 unit test와 integration test를 분리한다.
Framework routing, 실제 HTTP response, 실제 adapter module, external dependency처럼 real boundary를 넘는 observable behavior를 검증해야 할 때 integration test를 작성한다.

## 적용 범위

- Test type, test file placement, test case shape, API test command를 선택할 때 이 문서를 사용한다.

## 테스트 도구

- `apps/api` 테스트는 반드시 Vitest를 사용한다.
- Vitest 설정은 named `test.projects`를 사용하는 `apps/api/vitest.config.ts`에 모아둔다.
  Vitest나 다른 도구가 별도 config file을 요구하는 경우가 아니라면 새 test boundary는 named project로 추가한다.

## 테스트 케이스 설계

- `describe()`에는 test target name을 사용하는 것을 선호한다.
- `it()` test case name은 팀이 behavior intent를 쉽게 review할 수 있도록 한글 중심으로 작성해야 한다. Route, code identifier, technical term은 더 명확하다면 원문 언어를 유지할 수 있다.
- 각 `it()`는 하나의 work unit을 호출하고 하나의 구체적인 behavior result를 검증해야 한다.
- Status code, body, header가 같은 execution result를 검증한다면 같은 `it()` 안에서 assertion한다.
- Success, failure, exception, boundary value, authentication/authorization, validation처럼 execution path나 expected result가 다르면 `it()` block을 나눈다.
- Test 사이에 state sharing은 피한다. Shared resource가 필요하면 `beforeEach`에서 만들고 `afterEach`에서 정리한다.
- Test는 같은 조건에서 항상 같은 결과를 내야 한다.

## Test Double

- Test code는 test double을 만들고 검증하기 위해 `vi.fn()`, `vi.spyOn()`, mock return 설정, mock assertion 같은 Vitest helper에 의존할 수 있다.
- Dependency가 configured return value, call verification, simple error injection만 필요로 한다면 bespoke stub class보다 test-library mock을 선호한다.
- Test double에 meaningful state, 여러 method가 공유하는 behavior, 또는 mock function 묶음보다 읽기 쉬운 domain-specific in-memory implementation이 필요하다면 hand-written fake 또는 stub class를 사용한다.
- Test double은 유용한 가장 좁은 scope에 둔다. 기본적으로 spec file 안에 정의하고, 여러 test가 같은 behavior를 필요로 할 때만 shared factory로 추출한다.
- Integration test에서는 검증하려는 boundary 바깥의 collaborator에만 test double을 사용한다. Integration test가 증명하려는 adapter, runtime dependency, framework wiring 자체는 mock으로 대체하지 않는다.
- `test/{boundary}/` 아래의 boundary-specific integration test에서는 boundary directory가 검증 대상인 real dependency를 나타낸다. 해당 boundary를 명시적으로 test하는 경우가 아니라면 관련 없는 boundary adapter는 test double로 대체한다.

## Test Fixtures And Factories

- Fixture 또는 helper는 기본적으로 spec file 안에 둔다. 여러 spec이 같은 setup shape를 필요로 하거나 반복 setup이 검증하려는 behavior를 가릴 때만 추출한다.
- `buildX`는 external I/O나 persistence side effect 없이 in-memory value, domain object, DTO, row, test double만 생성하는 pure fixture factory에 사용한다.
- `createX`는 data를 저장하거나 runtime resource를 시작하거나 external state를 바꾸는 helper에만 사용한다.
- `setupX`는 Nest application, testing module, mock group, boundary runtime 같은 test environment를 조립하는 helper에 사용한다.
- Unit test와 integration test가 공유하는 context-wide fixture는 여러 spec이 필요로 하게 되면 `test/contexts/{context}/fixtures/` 아래에 두는 것이 좋다.
- Boundary-specific fixture는 matching boundary directory 아래에 두는 것이 좋다.
- 여러 integration boundary가 공유하는 helper는 `test/support/` 아래에 둔다.
- Import를 짧게 만들기 위해서만 test path alias를 추가하지 않는다. Source dependency convention에서 test-specific alias를 의도적으로 도입하기 전까지는 relative import를 사용한다.

## 테스트 계층

### Unit Tests

- Unit test는 target file directory 안의 `__tests__` directory에 두는 것을 선호한다. 예: `apps/api/src/contexts/prompt/domain/__tests__/claude-options.vo.spec.ts`.
- Pure service, function, HTTP transport 없는 controller, 작은 business logic unit을 대상으로 한다.
- Unit test는 edge case, boundary value, invalid shape, error path, immutability, identity/equality behavior, meaningful default behavior가 unit contract를 정의한다면 대표적으로 검증해야 한다. 이런 세부사항은 느린 integration test로 미루기보다 unit level에서 증명하는 것을 선호한다.
- HTTP server, 실제 Nest application startup, external I/O를 사용하지 않는다.
- 필요한 dependency는 직접 만들거나 lightweight mock/stub으로 대체한다.
- DI configuration을 검증해야 할 때만 Nest testing module을 사용한다.

#### Domain Unit Tests

- Domain unit test는 domain object 또는 domain service가 소유한 behavior와 invariant에 집중한다.
- Value object와 domain value는 valid construction, normalization, invariant violation, boundary value, equality 또는 identity behavior를 우선적으로 검증하고, immutability는 explicit contract일 때만 검증한다.
- Aggregate와 entity는 lifecycle creation과 restoration, state transition, consistency boundary protection, domain event emission, invalid domain action에 대한 thrown domain error를 우선적으로 검증한다.
- Case는 domain language로 표현한다. DTO, storage, API scenario의 shape가 domain concept 자체가 아니라면 그 shape를 중심으로 domain test를 작성하지 않는다.

#### Application Service Unit Tests

- Application service test는 service가 조율하는 application flow가 드러나는 case로 작성하는 것을 기본으로 한다. Business situation별로 case를 나누고, 입력과 collaborator outcome으로 orchestration branch를 명확히 드러내며, private helper 호출 순서보다 final decision 또는 side effect를 검증한다.
- Command interpretation, repository 또는 port result에 따른 branch, domain result propagation, 필요한 storage 또는 external port call, service가 소유한 error mapping 같은 application-level decision을 우선적으로 검증한다.
- Collaborator는 port boundary에서 mock 또는 stub으로 대체한다. Collaborator outcome을 설정해 각 orchestration branch를 명확히 만들고, final result와 observable port interaction을 검증한다.
- 상세한 domain invariant나 adapter storage behavior를 application service unit test에서 반복하지 않는다. 그런 검증은 domain unit test나 boundary integration test에 둔다.

### Shared Contract Tests

- Shared contract, base class, kernel helper, reusable policy는 자신이 소유한 behavior를 특히 촘촘한 unit test로 검증해야 한다.
- Shared contract test는 최소한의 representative implementation, fixture, subclass를 사용해 reusable guarantee를 한 번 증명해야 한다.
- Shared contract에 의존하는 concrete implementation은 inherited 또는 delegated contract test를 반복하지 않는다. 자신의 validation, configuration, override, composition, domain-specific behavior만 test한다.
- Concrete implementation이 shared contract behavior를 override, narrow, extend한다면 implementation-specific behavior와 shared contract expectation과의 compatibility를 모두 test한다.
- Coverage를 review할 때 behavior가 shared abstraction에 속한다면 duplicated implementation test를 shared contract test로 올리는 것을 선호한다.

### Integration Tests

- Integration spec file은 boundary, context, architecture layer 기준으로 나누는 것을 선호한다. 현재 프로젝트는 HTTP boundary test에 `apps/api/test/http/*.e2e-spec.ts`를 사용한다. Boundary가 충분히 커지면 더 깊은 `test/{boundary}/contexts/{context}/...` layout을 추가한다.
- Routing, request/response handling, real adapter contract behavior, real external dependency behavior처럼 unit test로 다룰 수 없는 interaction을 검증할 때 integration test를 사용한다.
- Actual network, REST API, system time, file system, database, real CLI process처럼 통제하기 어려운 요소를 사용하는 test는 unit test가 아니라 integration test로 분리한다.
- 모든 domain 또는 application invariant를 integration test에서 반복하지 않는다. 상세한 domain/application rule coverage는 unit test에 두고, integration test는 request/response shape, validation pipe behavior, framework routing, route 또는 port contract를 통해 관찰되는 adapter wiring, repository save/find contract 같은 observable boundary behavior에 사용한다.
- Nest app integration test file은 app을 초기화한다면 `beforeEach`에서 만들고 `afterEach`에서 닫아야 한다.
- 바깥 `describe()`는 integrated target name을 지정해야 한다.
- Route test에서는 안쪽 `describe()`가 보통 controller method와 route를 나타내야 한다. 예: `describe('POST /prompt')`.

#### Integration Boundary Layout

Integration spec은 `test/{boundary}/` 아래로 묶는다.
Boundary directory는 HTTP, real CLI process, file system access, real external API처럼 검증 대상인 protocol 또는 runtime dependency를 나타낸다.
Nested directory는 extra structure가 navigation을 개선할 때 bounded context, layer, target을 나타낸다.
`test/contexts/{context}/`는 특정 integration boundary에 속하지 않는 shared context fixture 또는 helper에 사용하고, boundary-specific spec에는 사용하지 않는다.

File name은 참여하는 모든 implementation이 아니라 test target을 나타내는 데 사용한다.
Application integration test는 해당 boundary의 representative production composition을 검증해야 하며, implementation-specific behavior는 관련 adapter contract 또는 integration test에 둔다.

Boundary-specific setup과 support file은 같은 boundary directory 아래에 둔다.
여러 integration boundary가 공유하는 helper는 `test/support/` 아래에 둔다.

#### Adapter Boundary Scope

Adapter integration test는 real adapter implementation과 필요한 external dependency를 붙인 상태에서 application-owned port 또는 protocol contract를 검증해야 한다.

Adapter test coverage는 검증하려는 behavior의 ownership을 기준으로 나눈다.
Unit test는 external shape와 domain object 사이의 mapping, domain exception 보존, adapter 또는 infrastructure exception을 유용한 context로 감싸는 behavior, 실제 external I/O 없이 증명할 수 있는 adapter-specific branching처럼 adapter code 자체가 소유한 behavior를 검증해야 한다.
Integration test는 real process invocation, protocol compatibility, route-to-provider wiring처럼 선택된 boundary가 조립되었을 때만 의미가 있는 behavior를 검증해야 한다.

각 behavior는 신뢰성 있게 증명할 수 있는 가장 저렴한 test layer에서 검증하는 것을 선호한다.
Adapter가 흐름에 참여한다는 이유만으로 상세한 domain, application, mapper invariant case를 integration test에서 반복하지 않는다.
같은 observable result를 검증하더라도 responsibility가 다르면 제한적으로 중복을 허용할 수 있다.

## 명령어

```bash
pnpm lint:check         # ESLint 검사
pnpm typecheck          # TypeScript type checking
pnpm test:unit          # Unit test
pnpm test:integration   # Integration 및 e2e test
pnpm test:integration:all # 모든 integration test
pnpm test               # Unit test, 그 다음 모든 integration test
pnpm test:watch         # API package에서 Vitest watch mode
pnpm test:cov           # API package에서 unit test coverage
```

PR을 열기 전에 변경 범위에 맞는 검사를 실행한다.
고립된 service나 function만 변경했다면 `pnpm lint:check`, `pnpm typecheck`, `pnpm test:unit`을 실행한다.
