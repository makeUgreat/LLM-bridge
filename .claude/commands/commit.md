# 커밋 생성

아래 컨벤션에 따라 현재 변경사항을 커밋한다.

## 절차

1. `git status`와 `git diff`로 변경사항 확인
2. `git log --oneline -5`로 최근 커밋 스타일 참고
3. 아래 컨벤션에 따라 커밋 메시지 작성
4. 변경사항을 스테이징하고 커밋

## 커밋 단위
- 하나의 커밋 = 하나의 논리적 변경 (한 문장으로 설명 가능해야 함)
- 프로덕션 코드와 그에 대한 테스트는 같은 커밋에 포함
- 리팩터링과 기능 변경은 분리
- 마이그레이션은 별도 커밋
- 변경사항이 여러 논리적 단위로 나뉘면 커밋을 분리한다

## 제목 형식

`type(scope): 설명 [CER-xxx]`

- scope: 모듈명 (`certificate`, `migration`, `encryption` 등). 전체 범위면 생략
- 설명: "무엇을 했는가"를 한글로 간결하게
- `[CER-xxx]`: 이슈 트래커 참조 (있을 때만)
- **제목 전체 72자 이내** — `git log --oneline`에서 잘리지 않는 한계

### type 선택 기준

| type | 기준 | 예 |
|------|------|----|
| `feat` | 사용자에게 새 기능이나 동작 변경을 제공 | 초기화 기능 추가, 프로토콜 필드 변경 |
| `fix` | 기존 기능의 버그 수정 | PEM 인코딩 오류 수정 |
| `refactor` | 동작 변경 없이 코드 구조 개선·제거 | 미사용 코드 제거, if문 스타일 변환 |
| `chore` | 빌드·설정·의존성 등 비즈니스 로직 외 변경 | 패키지 업데이트, CI 설정 |
| `test` | 프로덕션 코드 변경 없이 테스트만 추가·수정 | 누락된 에러 케이스 추가 |
| `docs` | 문서만 변경 | README 수정 |

> **판단 팁**: "이 커밋을 되돌리면 사용자가 눈치채는가?" → Yes면 `feat`/`fix`, No면 `refactor`/`chore`/`test`

## 본문
- 제목만으로 "왜"가 충분히 전달되면 생략
- 필요한 경우: 기존 동작이 바뀌는 이유, 선택하지 않은 대안, 여러 파일에 걸친 맥락
- "왜 이 변경이 필요한가"에 집중 — diff를 반복하지 않는다

## 예시

```
# 좋은 예
feat(certificate): 교체 대기 인증서 초기화 기능 추가 [CER-197]
fix(certificate): 자체서명 인증서 체인 PEM 인코딩 오류 수정
refactor: single-statement if를 block statement로 변환
refactor: 미사용 SSE 기능 제거

# 본문이 필요한 경우
feat(certificate): discard-rollback 의존성 제거

discard가 rollback 완료를 선행 조건으로 요구하던 제약을 제거한다.
두 작업이 서로 다른 파일 상태(CertChangeReady / RollbackTarget)만
조작하므로 독립 실행해도 안전하다.

# 나쁜 예 → 개선
feat(certificate): 개인키 등록 로직 추가 및 pipeline 인터페이스 개선 - 인증서, 개인키로 구분
→ feat(certificate): 개인키 등록 로직 추가  (pipeline 개선은 별도 커밋)

feat: 사용하지 않는 인증서 fixture 제거
→ refactor: 미사용 인증서 fixture 제거  (feat 아님, 기능 추가가 아니라 정리)

feat(certificate): 누락된 에러 테스트 케이스 추가
→ test(certificate): 누락된 에러 테스트 케이스 추가  (프로덕션 코드 변경 없음)
```