# 소스 의존성 규칙

영어 미러: [en/source-dependency.md](../en/source-dependency.md)

규칙은 `dependency-cruiser/rules/source-dependency.cjs`로 강제됩니다. `pnpm dep-cruiser`로 검증하세요.

## 레이어 격리

### `core/`와 `kernels/`

- `core/`는 순수 유틸리티만 포함; 프레임워크 import 금지
- `kernels/domain/`은 자기 자신 외 import 없음
- `kernels/application/`은 `kernels/domain/` import 가능
- `kernels/infrastructure/`는 `kernels/domain/`과 `kernels/application/` import 가능
- `kernels/presentation/`은 `kernels/domain/`과 `kernels/application/` import 가능

### 컨텍스트 레이어 규칙

| 레이어 | 허용 import |
|--------|------------|
| `domain/` | 같은 컨텍스트 `domain/`만; `@core/*`, `@kernels/domain/*` |
| `application/` | 같은 컨텍스트 `domain/`; `@kernels/application/*` |
| `infrastructure/` | `@contexts/*`, `@core/*`, `@kernels/*` 내 모두 |
| `presentation/` | `@contexts/*`, `@core/*`, `@kernels/*` 내 모두 |

### 크로스 컨텍스트 격리

컨텍스트의 `domain/`과 `application/` 레이어는 다른 컨텍스트를 **직접** import하면 안 됩니다. 크로스 컨텍스트 호출은 소비자 컨텍스트의 `domain/`에 정의된 포트를 통해 이루어집니다.

```
prompt/domain/session-reader.ts       ← 포트 (abstract class)
prompt/infrastructure/session/        ← 어댑터가 SessionService에 위임
```

## 경로 별칭 강제

모든 디렉토리를 넘나드는 import는 경로 별칭(`@contexts/*`, `@kernels/*`, `@core/*`, `@platform/*`)을 사용합니다. 단일 디렉토리를 벗어나는 상대 import는 `import-path-style` ESLint 규칙으로 금지합니다.
