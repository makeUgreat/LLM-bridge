# 코드 리뷰

PR의 서비스 코드와 테스트 코드를 각각 전담 subagent로 **병렬** 리뷰하고, 결과를 PR 인라인 코멘트로 게시한다.
각 finding은 해당 코드 라인에 개별 스레드로 달리므로, 사용자가 항목별로 reply를 남길 수 있다.

## PR 번호 결정

$ARGUMENTS가 있으면 PR 번호로 사용한다. 없으면 현재 브랜치의 PR을 자동 탐색한다:

```bash
gh pr view --json number --jq '.number'
```

## 모드 판별

PR 번호를 확정한 뒤, 해당 PR에 기존 봇 리뷰 코멘트에 대한 **사용자 reply**가 있는지 확인한다:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '[.[] | select(.in_reply_to_id != null and .user.login != "github-actions[bot]")] | length'
```

- reply가 **0건**: 신규 리뷰 모드로 실행
- reply가 **1건 이상**: 재리뷰 모드로 실행

## 신규 리뷰

아래 두 subagent를 **동시에** Agent 도구로 호출한다.
메인 컨텍스트에서 직접 diff를 읽거나 리뷰하지 않는다.

### 1. 서비스 코드 리뷰

- description: "서비스 코드 리뷰 PR #N"
- subagent_type: `review-service`
- prompt: "PR #N을 리뷰해줘. PR 번호: N"

### 2. 테스트 코드 리뷰

- description: "테스트 코드 리뷰 PR #N"
- subagent_type: `review-test`
- prompt: "PR #N을 리뷰해줘. PR 번호: N"

## 재리뷰

사용자가 인라인 코멘트에 reply를 남긴 경우, 해당 피드백을 수집하여 에이전트에 전달한다.

### 1. 피드백 수집

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '[.[] | select(.in_reply_to_id != null) | {id: .id, reply_to: .in_reply_to_id, user: .user.login, body: .body, path: .path, line: .line}]'
```

원본 코멘트도 함께 수집하여 어떤 finding에 대한 reply인지 매핑한다:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '[.[] | {id: .id, user: .user.login, body: .body, path: .path, line: .line}]'
```

### 2. 피드백 분류

수집한 reply를 파일 확장자로 분류한다:
- `*.spec.ts`, `*.e2e-spec.ts` → 테스트 리뷰 에이전트
- 그 외 `*.ts` → 서비스 리뷰 에이전트

### 3. 에이전트 호출

피드백이 있는 에이전트만 호출한다. 두 쪽 모두 피드백이 있으면 병렬 호출한다.

**서비스 코드 재리뷰:**

- description: "서비스 코드 재리뷰 PR #N"
- subagent_type: `review-service`
- prompt: "PR #N을 재리뷰해줘. PR 번호: N\n\n## 사용자 피드백\n\n{피드백 JSON}"

**테스트 코드 재리뷰:**

- description: "테스트 코드 재리뷰 PR #N"
- subagent_type: `review-test`
- prompt: "PR #N을 재리뷰해줘. PR 번호: N\n\n## 사용자 피드백\n\n{피드백 JSON}"

## 결과 보고

subagent가 모두 완료되면, 각각의 리뷰 결과를 요약하여 사용자에게 보고한다.
재리뷰의 경우 수용/반론 현황도 함께 보고한다.