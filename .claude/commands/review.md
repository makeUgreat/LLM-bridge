# 코드 리뷰

PR의 서비스 코드와 테스트 코드를 각각 전담 subagent로 **병렬** 리뷰하고, 결과를 PR 코멘트로 게시한다.

## PR 번호 결정

$ARGUMENTS가 있으면 PR 번호로 사용한다. 없으면 현재 브랜치의 PR을 자동 탐색한다:

```bash
gh pr view --json number --jq '.number'
```

## 실행

PR 번호를 확정한 뒤, 아래 두 subagent를 **동시에** Agent 도구로 호출한다.
메인 컨텍스트에서 직접 diff를 읽거나 리뷰하지 않는다.

### 1. 서비스 코드 리뷰

- description: "서비스 코드 리뷰 PR #N"
- subagent_type: `review-service`
- prompt: "PR #N을 리뷰해줘. PR 번호: N"

### 2. 테스트 코드 리뷰

- description: "테스트 코드 리뷰 PR #N"
- subagent_type: `review-test`
- prompt: "PR #N을 리뷰해줘. PR 번호: N"

## 결과 보고

두 subagent가 모두 완료되면, 각각의 리뷰 결과를 요약하여 사용자에게 보고한다.