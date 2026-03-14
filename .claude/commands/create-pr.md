# PR 생성

아래 컨벤션에 따라 현재 브랜치의 변경사항으로 PR을 생성한다.

## 절차

1. 현재 브랜치가 `master`(또는 `main`)이면, 아래 브랜치 네이밍 규칙에 따라 feature 브랜치를 생성하고 전환한다
2. `git log`와 `git diff master...HEAD`로 브랜치의 전체 변경사항 파악
3. 아래 컨벤션에 따라 PR 제목과 본문 작성
4. 원격에 push 후 `gh pr create`로 PR 생성

## PR 단위

- 하나의 PR = 하나의 목적 (리뷰어가 "이 PR은 왜 필요한가"에 한 문장으로 답할 수 있어야 함)
- 리팩터링과 기능 변경은 별도 PR로 분리 — 섞이면 리뷰 난이도가 급증한다
- 변경 규모가 크면 스택형 PR(base를 다른 feature 브랜치로)로 분할을 고려

## 제목 형식

`type(scope): 설명 [CER-xxx]`

- 커밋 컨벤션의 type/scope 규칙을 동일하게 적용
- PR에 여러 커밋이 있으면 **가장 대표적인 변경**을 기준으로 type 결정
- **70자 이내** — GitHub PR 목록에서 잘리지 않는 한계

## 본문 구조

```markdown
## Summary
- 변경의 목적과 핵심 내용을 1-3개 bullet으로 요약
- "왜 이 변경이 필요한가"에 집중 — diff를 반복하지 않는다

## Test plan
- [ ] 검증 항목을 체크리스트로 작성
- [ ] 자동 테스트로 커버되지 않는 수동 확인 사항 포함
```

### Summary 작성 원칙

- **배경**: 이 PR이 없으면 어떤 문제가 있는지
- **해결**: 어떤 접근으로 해결했는지
- 선택하지 않은 대안이 있다면 간단히 언급 (why not)

### Test plan 작성 원칙

- 자동 테스트(unit/e2e)로 커버한 범위 명시
- 수동 확인이 필요한 항목은 재현 단계를 구체적으로
- 해당 없는 경우(docs, chore 등) "N/A" 또는 생략 가능

## 브랜치 네이밍

`type/간결한-설명` 또는 `type/CER-xxx-간결한-설명`

```
feat/session-management
fix/CER-203-pem-encoding
refactor/remove-unused-sse
chore/upgrade-nestjs-11
```

## 리뷰 & 머지

- 리뷰어 지정 후 approve 없이 머지하지 않는다 (1인 프로젝트 기간에는 자기 리뷰 허용)
- CI(lint, test, build)가 모두 통과해야 머지 가능
- **Squash merge** 기본 — 커밋 히스토리를 깔끔하게 유지
- 머지 후 원격 브랜치는 삭제

## 예시

```markdown
# 제목
feat(session): 세션 관리 API 추가 [CER-210]

# 본문
## Summary
- 프롬프트 전송 시 세션 단위로 Claude CLI 프로세스를 관리할 수 있도록
  세션 CRUD API를 추가한다
- 세션은 인메모리 Map으로 관리하며, 서버 재시작 시 초기화된다

## Test plan
- [x] SessionService unit 테스트: 생성/조회/삭제 로직 검증
- [x] SessionController unit 테스트: NotFoundException 등 HTTP 응답 검증
- [x] E2E 테스트: POST/DELETE 엔드포인트 상태 코드 확인
```