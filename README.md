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

CLI 대신 앱을 쓰면 마지막에 새 제품 루트 폴더를 연다. 위 복사·등록 검사에는 npm ci가 필요 없다. 원본 AGENTS·package·앱·PM 명세·Git/Codex 훅·브라우저 데이터는 복사하지 않는다.

Codex 대화창의 첫 입력:

```text
$harness-cycle
대상: [새 제품의 절대 경로]
아이디어: [누가 어떤 문제를 해결하는 도구인지]
로컬 .agents/skills와 docs/harness/lifecycle.md를 읽어줘.
짧은 AGENTS와 기능별 progress를 준비하고, 인터뷰를 한 질문씩 진행해줘.
PM 사례를 내 제품의 결정으로 복사하지 마.
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

| 명령                           | 역할                                                 |
| ------------------------------ | ---------------------------------------------------- |
| node scripts/check-harness.mjs | 등록·스킬·문서·참조 검사, npm 설치 없이 실행 가능    |
| npm ci                         | 원본 앱·검사 의존성 설치 및 Husky 연결               |
| npm run dev                    | 현재 PM 사례 앱의 개발 서버                          |
| npm run lint                   | JS/MJS·TS/TSX·HTML 검사                              |
| npm run design:check           | 구조도와 PM 정적 디자인 검사                         |
| npm run format:check           | 서식 검사                                            |
| npm test                       | 단위 테스트                                          |
| npm run build                  | 타입 검사와 Vite 빌드                                |
| npm run test:browser           | 빌드된 앱의 Playwright 검사                          |
| npm run check                  | lint·디자인·하네스·서식·단위·타입/빌드·브라우저 통합 |

원본 앱은 Node 22.12+ 또는 24 계열을 사용한다. 브라우저 검사 전 `npx playwright install chromium`이 필요하다. `npm run test:browser` 단독 실행 전 현재 코드로 빌드한다. 제품·샘플 포트를 일괄 종료하거나 기존 브라우저 데이터를 지우지 않는다. 새 제품 이식에는 이 앱 실행 과정이 필요 없다.

## PM 사례의 경계

PM 사례는 단일 PC·브라우저의 프로그램 장부다. 등록·수정·간트·검색·백업·복원·삭제 구현은 기존 검증 기록을 따른다. **Git에 포함된 PM-07은 미구현 테스트·stub을 가진 준비 기준점(ca79c7a)**이다. 이후 로컬 Excel 구현은 미커밋이며 이번 하네스 문서 배포에 포함하지 않는다. 따라서 새 clone의 PM 전체 검사는 준비 단계의 실패 테스트를 포함한다. 하네스 이식·등록 검사와 구분한다.

로컬 Excel 구현은 단위 240·브라우저 85개를 통과했지만 독립 AC에서 정상 XLSX 일부 거부와 캐시 없는 수식 누락을 재현했다. 이후 일반 동작에 대한 사용자 확인을 받았으며, 이 확인을 해당 결함 해결로 바꾸지 않는다. PM-08–PM-10은 미착수다. [진행 상태](docs/features/pm-program-tracker/progress.md) · [검수 결과와 재개 조건](docs/features/pm-program-tracker/tests/PM-07-resume-stop.md).

이 데이터는 Git이 아니라 IndexedDB에 저장된다. 다른 PC로 옮기려면 별도 백업·복원이 필요하다. 새 제품에는 PM 데이터·인터뷰·승인·디자인을 복사하지 않는다.

## 구조도와 운영 경계

docs/architecture/index.html을 브라우저에서 열거나 다음처럼 로컬로 제공한다.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/architecture
```

http://127.0.0.1:8765/에서 확인 후 Ctrl+C로 종료한다. 본문은 로컬에서 읽을 수 있으며 Mermaid 렌더링에는 CDN 연결이 필요하다. 구조도 갱신은 상시 감시가 아니라 명시적 요청으로 수행한다.

Git 훅, Codex 훅, 자동 에이전트, 제품 검사, 원격 CI, 사용자 수락, 배포는 각각 다른 검증 대상이다. 새 PC에서는 설치 버전·연결·신뢰·권한을 별도로 확인한다.
