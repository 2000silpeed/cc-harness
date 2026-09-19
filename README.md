# cc-harness · 재사용 가능한 Codex 개발 하네스

cc-harness는 AI와 함께 소프트웨어를 개발할 때 작업 순서, 역할, 승인 시점, 검증 기준을 안내하는 도구 모음입니다. 아이디어를 요구사항, 설계, 이슈별 구현·검증, 운영 인계까지 연결하는 **15개 프로젝트 스킬과 실무 방법론**으로 구성됩니다. 여기서 스킬은 일을 진행하는 절차를 뜻합니다. 앱, 독립 에이전트, 지속적 통합(CI) 환경까지 자동으로 설치한다는 의미는 아닙니다.

## 새 PC에서 시작하기

**원본과 제품을 분리합니다.** cc-harness는 참고·업데이트용으로 유지하고, 새 제품은 형제 폴더에서 개발합니다.

```text
ai-projects/
├── cc-harness/      하네스 원본
└── my-new-project/  실제 제품: Codex를 여기서 연다
```

[새 PC·새 프로젝트 시작 설명서](docs/harness/reuse.md)는 macOS/Linux/WSL과 Windows PowerShell용 명령부터 복사 범위, 첫 대화, AGENTS, 품질 검사와 훅 연결, 매일의 재개 방법, 업데이트와 데이터 이동까지 설명합니다.

Node와 Git을 설치하고 Codex 로그인과 GitHub 접근 권한을 준비한 뒤, 다음 명령을 실행합니다.

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

파일을 쓰지 않는 사전 점검(dry-run) 결과를 확인한 뒤, 실제 이식을 실행합니다.

```sh
node scripts/install-harness.mjs --target "$HOME/ai-projects/my-new-project" --apply
cd "$HOME/ai-projects/my-new-project"
node scripts/check-harness.mjs
codex
```

명령줄 인터페이스(CLI) 대신 앱을 사용한다면 마지막에 새 제품의 루트 폴더를 엽니다. 위 복사·등록 검사에는 `npm ci`가 필요하지 않습니다. 원본의 AGENTS, package, Git/Codex 훅, 브라우저 데이터는 복사하지 않습니다.

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

위에서 아래로 진행하되, 각 승인 지점에서는 사용자의 결정을 받은 뒤 다음 단계로 넘어갑니다. 표의 PRD는 제품 요구사항 문서, ADR은 기술 결정 기록, AC는 인수 조건을 뜻합니다. Red는 아직 구현되지 않은 동작 때문에 테스트가 예상대로 실패하는 상태이고, E2E는 사용자의 전체 흐름을 처음부터 끝까지 확인하는 테스트입니다. STOP은 안전하게 계속할 수 없어 작업을 멈추고 원인과 재개 조건을 기록하는 상태입니다.

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

`mermaid-diagram`은 요청을 받았을 때 구조도를 갱신하는 보조 스킬입니다. 두 테스트 주도 개발(TDD) 루프는 이슈 개발 과정 전체를 감싸는 실행 방식이며, 프로젝트 끝에 덧붙이는 별도 단계가 아닙니다. 자동 모드에서도 테스트를 완화하거나 무제한으로 재시도하거나 승인 없이 원격 작업을 수행할 수 없습니다.

## 설명서 지도

- 처음부터 전체 흐름과 승인 지점을 파악하려면 [전체 생명주기·승인](docs/harness/lifecycle.md)을 읽습니다.
- 새 컴퓨터나 새 제품 저장소에 하네스를 옮기려면 [새 PC·프로젝트 이식](docs/harness/reuse.md)을 따릅니다.
- 진행 기록이나 요구사항 문서의 형식이 필요하면 [산출물 양식](docs/harness/templates.md)을 사용합니다.
- 자동으로 지원되는 범위와 사용자가 준비할 범위를 구분하려면 [지원 기능과 책임](docs/harness/coverage.md)을 확인합니다.
- 이식 대상 파일은 [등록 목록](docs/harness/registry.json), 실제 검사 범위와 한계는 [검증 범위](docs/harness/verification.md)에서 확인합니다.
- 검사 체계를 설계할 때는 [테스트 전략](docs/methods/testing-strategy.md), 저장소의 실행·품질 기반을 마련할 때는 [프로젝트 기반](docs/methods/project-foundation.md)을 읽습니다.
- 요구사항을 확정할 때는 [요구사항 인터뷰](docs/methods/requirements-interview.md), 제품 문서와 작업 단위를 만들 때는 [PRD·ADR·이슈](docs/methods/planning.md)를 따릅니다.
- 화면 기준을 적용할 때는 [디자인 적용](docs/methods/design-system.md), 새 디자인 문서를 작성할 때는 [디자인 문서 작성법](docs/design-system/authoring-guide.md)을 사용합니다.
- 이슈를 구현하고 검증할 때는 [TDD·독립 AC·보안](docs/methods/tdd.md), 전체 흐름을 검증하고 전달할 때는 [E2E·전달·자동화](docs/methods/delivery-automation.md)를 따릅니다.
- 실행 관계를 한눈에 보려면 [시각적 실행 지도](docs/architecture/index.html)를 엽니다.

## 원본 저장소의 실행 명령

아래 표는 cc-harness 원본을 설치하고 검사할 때 사용하는 명령입니다. 새 제품에서는 선택한 기술 구성에 맞는 명령을 별도로 구성해야 합니다.

| 명령                           | 역할                                              |
| ------------------------------ | ------------------------------------------------- |
| node scripts/check-harness.mjs | 등록·스킬·문서·참조 검사, npm 설치 없이 실행 가능 |
| npm ci                         | 하네스 검사 의존성 설치 및 Husky 연결             |
| npm run lint                   | JS/MJS·TS/TSX·HTML 검사                           |
| npm run design:check           | 구조도 정적 디자인 검사                           |
| npm run format:check           | 서식 검사                                         |
| npm test                       | Vitest 하네스 이식 회귀 검사                      |
| npm run harness:check          | 하네스 등록·참조 검사                             |
| npm run typecheck              | TypeScript 타입 검사                              |
| npm run check                  | lint·디자인·하네스·서식·테스트·타입 통합          |

하네스 도구는 Node 24 계열을 기준으로 검증합니다. TypeScript는 이식 과정의 회귀와 타입을 검사하기 위해 유지합니다. 이 검사는 제품 앱, 개발 서버, 미리보기, 앱 빌드, 브라우저 테스트를 포함하지 않습니다. 따라서 하네스 검사가 통과해도 제품 구현, 인수 조건(AC) 충족, 시각 검증까지 끝났다고 볼 수 없습니다. 자세한 범위는 [검증 경계](docs/harness/verification.md)를 따릅니다.

## 구조도와 운영 경계

`docs/architecture/index.html`을 브라우저에서 직접 열거나 다음 명령으로 로컬에서 제공합니다.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/architecture
```

http://127.0.0.1:8765/에서 확인한 뒤 Ctrl+C로 종료합니다. 본문은 로컬에서 읽을 수 있지만 Mermaid를 화면에 그리려면 콘텐츠 전송 네트워크(CDN) 연결이 필요합니다. 구조도는 상시 감시로 갱신하지 않으며, 명시적인 요청이 있을 때만 갱신합니다.

Git 훅, Codex 훅, 자동 에이전트, 제품 검사, 원격 CI, 사용자 수락, 배포는 서로 다른 검증 대상입니다. 새 PC에서는 설치 버전, 연결 상태, 신뢰 승인, 권한을 각각 확인해야 합니다.
