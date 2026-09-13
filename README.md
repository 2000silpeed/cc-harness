# cc-harness · 재사용 가능한 Codex 개발 하네스

아이디어 → 요구사항 → 설계 → 이슈별 구현·검증 → 운영 인계를 연결하는 **15개 프로젝트 스킬과 실무 방법론**이다. 스킬은 수행 절차이며 앱·독립 에이전트·CI가 자동 설치됐다는 의미는 아니다.

## 새 PC에서 시작하기

**원본과 제품을 분리한다.** cc-harness는 참고·업데이트용으로 두고 새 제품을 형제 폴더에서 개발한다.

```text
ai-projects/
├── cc-harness/      하네스 원본
└── my-new-project/  실제 제품: Codex를 여기서 연다
```

[새 PC·새 프로젝트 시작 설명서](docs/harness/reuse.md)에 macOS/Linux/WSL·Windows PowerShell 명령, 복사 범위, 첫 대화, AGENTS, 품질·훅 연결, 매일 재개, 업데이트·데이터 이동을 정리했다.

Node와 Git, Codex 로그인 및 GitHub 접근 권한을 준비한 뒤:

```sh
mkdir -p "$HOME/ai-projects"
cd "$HOME/ai-projects"
git clone https://github.com/2000silpeed/cc-harness.git
mkdir my-new-project
git -C "$HOME/ai-projects/my-new-project" init
cd cc-harness
node scripts/check-harness.mjs
node scripts/install-harness.mjs --target "$HOME/ai-projects/my-new-project"
```

dry-run 결과를 확인한 뒤:

```sh
node scripts/install-harness.mjs --target "$HOME/ai-projects/my-new-project" --apply
cd "$HOME/ai-projects/my-new-project"
node scripts/check-harness.mjs
codex
```

CLI 대신 앱을 쓰면 마지막에 새 제품 루트 폴더를 연다. 위 복사·등록 검사에는 npm ci가 필요 없다. 원본 AGENTS·package·Git/Codex 훅·브라우저 데이터는 복사하지 않는다.

Codex 대화창의 첫 입력:

```text
$harness-cycle
대상: [새 제품의 절대 경로]
아이디어: [누가 어떤 문제를 해결하는 도구인지]
로컬 .agents/skills와 docs/harness/lifecycle.md를 읽어줘.
짧은 AGENTS와 기능별 progress를 준비하고, 인터뷰를 한 질문씩 진행해줘.
제품 요구사항과 기술 결정은 이 프로젝트에서 확인해.
기술안 승인 전 앱을 설치하지 말고 커밋·푸시·배포는 제외해.
```

## 실행 순서

| 단계             | 스킬                                         | 산출물·통과 조건                         |
| ---------------- | -------------------------------------------- | ---------------------------------------- |
| 시작·하네스 연결 | harness-cycle · project-bootstrap            | 대상·지침·진행 기록                      |
| 인터뷰           | feature-planner                              | 최초 요청·인터뷰·승인된 요구사항         |
| 디자인           | design-system                                | 화면·색상·타이포·간격·상태               |
| 기획·작업 분해   | feature-planner                              | PRD·ADR·범위·승인 이슈·AC                |
| 승인된 앱 기반   | project-bootstrap                            | 최소 실행·러너·실제 검사 명령            |
| 시나리오와 구현  | test-scenarios · tdd-red · tdd-green         | 정상/경계/예외 계약·올바른 Red·최소 구현 |
| 독립 검증·개선   | ac-verifier · tdd-refactor · security-review | AC별 증거·회귀·보안                      |
| 이슈 반복        | tdd-loop 또는 tdd-auto-loop                  | 유한 범위·승인·STOP 기록                 |
| 통합·전달        | e2e-write · create-pr                        | E2E·검사·리뷰·승인된 원격 작업           |
| 운영             | harness-cycle                                | 배포 대상·비용·데이터·복구·별도 승인     |

mermaid-diagram은 요청 시 구조도를 갱신하는 보조 스킬이다. 두 TDD 루프는 개발을 감싸는 실행 방식이며 프로젝트 마지막에 추가하는 단계가 아니다. 자동 모드도 테스트 완화·무제한 재시도·무단 원격 작업을 허용하지 않는다.

## 설명서 지도

- [전체 생명주기·승인](docs/harness/lifecycle.md)
- [새 PC·프로젝트 이식](docs/harness/reuse.md)
- [산출물 양식](docs/harness/templates.md)
- [지원 기능과 책임](docs/harness/coverage.md)
- [등록 목록](docs/harness/registry.json) · [검증 범위](docs/harness/verification.md)
- [테스트 전략](docs/methods/testing-strategy.md) · [프로젝트 기반](docs/methods/project-foundation.md)
- [요구사항 인터뷰](docs/methods/requirements-interview.md) · [PRD·ADR·이슈](docs/methods/planning.md)
- [디자인 적용](docs/methods/design-system.md) · [디자인 문서 작성법](docs/design-system/authoring-guide.md)
- [TDD·독립 AC·보안](docs/methods/tdd.md) · [E2E·전달·자동화](docs/methods/delivery-automation.md)
- [시각적 실행 지도](docs/architecture/index.html)

## 원본 저장소의 실행 명령

이 표는 cc-harness 원본의 명령이다. 새 제품의 명령은 해당 스택에 맞게 별도로 구성한다.

| 명령                           | 역할                                              |
| ------------------------------ | ------------------------------------------------- |
| node scripts/check-harness.mjs | 등록·스킬·문서·참조 검사, npm 설치 없이 실행 가능 |
| npm ci                         | 하네스 검사 의존성 설치 및 Husky 연결             |
| npm run lint                   | JS/MJS·TS/TSX·HTML 검사                           |
| npm run design:check           | 구조도 정적 디자인 검사                           |
| npm run format:check           | 서식 검사                                         |
| npm test                       | Vitest 하네스 이식 회귀 44개                      |
| npm run harness:check          | 하네스 등록·참조 검사                             |
| npm run typecheck              | TypeScript 타입 검사                              |
| npm run check                  | lint·디자인·하네스·서식·테스트·타입 통합          |

하네스 도구의 검증 기준은 Node 24 계열이다. TypeScript는 이식 회귀와 타입 검사를 위해 유지한다. 제품 앱·개발 서버·미리보기·앱 빌드·브라우저 테스트는 포함하지 않는다. 하네스 검사 통과는 제품 구현·AC 충족·시각 검증을 뜻하지 않는다. [검증 경계](docs/harness/verification.md)를 따른다.

## 구조도와 운영 경계

docs/architecture/index.html을 브라우저에서 열거나 다음처럼 로컬로 제공한다.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/architecture
```

http://127.0.0.1:8765/에서 확인 후 Ctrl+C로 종료한다. 본문은 로컬에서 읽을 수 있으며 Mermaid 렌더링에는 CDN 연결이 필요하다. 구조도 갱신은 상시 감시가 아니라 명시적 요청으로 수행한다.

Git 훅, Codex 훅, 자동 에이전트, 제품 검사, 원격 CI, 사용자 수락, 배포는 각각 다른 검증 대상이다. 새 PC에서는 설치 버전·연결·신뢰·권한을 별도로 확인한다.
