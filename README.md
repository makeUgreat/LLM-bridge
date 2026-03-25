# LLM-bridge

로컬에 설치된 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)를 웹 브라우저에서 사용할 수 있게 해주는 브릿지 서버.

## 왜 필요한가

Claude Code는 터미널에서 동작하는 CLI 도구다. LLM-bridge는 이 CLI를 HTTP API와 웹 UI로 감싸서, 브라우저에서도 Claude Code와 대화할 수 있게 한다. 로컬 머신에서만 동작하며, 로컬에 설치된 Claude Code CLI를 직접 호출하는 방식이므로 별도의 API 키 설정 없이 기존 Claude Code 인증을 그대로 사용한다.

## 동작 방식

1. 사용자가 웹 UI 또는 API로 프롬프트를 전송한다
2. 서버가 로컬의 `claude` CLI 프로세스를 실행하고 프롬프트를 전달한다
3. CLI의 응답을 SSE(Server-Sent Events)로 실시간 스트리밍하여 브라우저에 표시한다

세션을 생성하면 이전 대화 맥락을 유지한 연속 대화가 가능하고, 일회성(one-shot) 모드로도 사용할 수 있다.

## 주요 기능

- **세션 관리** — 대화 세션 생성·유지·삭제, 만료 세션 자동 정리
- **실시간 스트리밍** — SSE로 Claude 응답을 토큰 단위로 스트리밍
- **웹 채팅 UI** — 모델 선택, 시스템 프롬프트, 작업 디렉토리 등 고급 옵션 제공

## 전제 조건

- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 설치 및 인증 완료

## 시작하기

```bash
npm install
npm run dev        # 개발 서버 (ts-node)
```

서버가 `http://localhost:3737`에서 실행된다.

```bash
npm run build
npm start          # 프로덕션 실행
```

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/sessions` | 새 세션 생성 |
| GET | `/sessions` | 전체 세션 목록 조회 |
| DELETE | `/sessions/:id` | 세션 삭제 |
| POST | `/sessions/:id/prompt` | 세션 기반 프롬프트 실행 (SSE) |
| POST | `/sessions/:id/prompt/sync` | 세션 기반 동기 프롬프트 실행 (JSON) |
| POST | `/prompt` | 일회성 프롬프트 실행 (SSE) |
| POST | `/prompt/sync` | 일회성 동기 프롬프트 실행 (JSON) |

## 테스트

```bash
npm test           # 유닛 테스트
npm run test:e2e   # E2E 테스트
npm run test:cov   # 커버리지 리포트
```