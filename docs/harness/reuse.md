# 새 PC에서 새 프로젝트 시작하기

**cc-harness는 재사용 원본으로 유지하고, 실제 제품은 별도의 형제 폴더에서 개발합니다.** cc-harness는 제품 앱이 아니라 개발 순서와 검증 기준을 제공하는 독립 하네스입니다. 설치 스크립트는 등록된 스킬과 방법론만 새 프로젝트로 가져옵니다.

## 1. 폴더와 작업 위치

```text
ai-projects/
├── cc-harness/                 GitHub에서 clone한 재사용 원본
│   ├── .agents/skills/         스킬 15개
│   ├── .claude/skills/         Claude Code 진입점 15개
│   ├── docs/harness/           실행 순서·이식·양식·등록 목록
│   ├── docs/methods/           독립적인 실무 방법론
│   └── scripts/install-harness.mjs
└── my-new-project/             실제 제품: 별도 Git 저장소
    ├── .agents/skills/         설치 스크립트가 복사
    ├── .claude/skills/         설치 스크립트가 복사
    ├── docs/harness/           설치 스크립트가 복사
    ├── docs/methods/           설치 스크립트가 복사
    ├── docs/design-system/authoring-guide.md
    ├── scripts/               설치·등록 검사 도구
    ├── AGENTS.md              대상에서 새로 작성
    ├── CLAUDE.md              Claude Code를 쓰면 대상에서 작성
    ├── docs/features/<기능명>/ 인터뷰·명세·설계·이슈·진행 기록
    └── src/, tests/           기술안 승인 후 해당 스택에 맞게 생성
```

`my-new-project`는 실제 제품 이름으로 바꿉니다. **새 제품을 cc-harness 안에 만들지 마십시오.** 하네스와 제품의 지침, Git 이력, 검사 범위가 섞이는 것을 막기 위해서입니다.

| 작업                        | 실행 위치                                    |
| --------------------------- | -------------------------------------------- |
| 하네스 다운로드·업데이트    | ai-projects/cc-harness                       |
| 설치 dry-run·apply          | 원본의 스크립트에서 새 제품의 절대 경로 지정 |
| Codex·Claude Code 실행·코딩 | ai-projects/my-new-project                   |
| 제품 커밋·원격 연결·푸시    | my-new-project의 별도 Git 저장소             |
| 공통 하네스 개선            | cc-harness에서 검토 후 각 제품에 선택 반영   |

## 2. 새 PC 준비

- Git, Node.js와 npm, 편집기, Codex 앱 또는 CLI를 준비합니다. 하네스 도구 검증 기준은 Node 24 계열이며 제품 런타임은 이후 기술안에서 결정합니다.
- GitHub 접근 권한으로 인증합니다. 비공개 저장소라면 권한이 필요합니다. 토큰을 URL이나 문서에 넣지 않습니다.
- Codex는 새 PC에서 별도로 로그인합니다. clone으로 전역 설정·플러그인·MCP·훅 신뢰·인증이 복원되지 않습니다.
- 터미널에서 `git --version`, `node --version`, `npm --version`을 확인합니다. CLI 사용자는 `codex --version`도 확인합니다.

Codex 설치와 로그인은 [공식 CLI 안내](https://learn.chatgpt.com/docs/cli)를 따릅니다. CLI는 작업할 폴더에서 `codex`를 실행합니다. 앱 사용자는 같은 **새 제품 루트**를 프로젝트로 엽니다.

Windows에서는 아래 PowerShell 예제를 사용합니다. WSL을 선택했다면 Git·Node·Codex·프로젝트 경로를 WSL 안에서 일관되게 사용하고 macOS/Linux 예제를 따릅니다. Windows 경로와 Linux 경로를 섞지 않습니다. 이 문서의 이식 검증은 macOS 기준이며 Windows 실기기 검증은 아닙니다.

## 3. 다운로드와 이식

### macOS / Linux / WSL

아래 명령은 두 폴더가 아직 없는 새 환경을 기준으로 합니다. 이미 복제(clone)했다면 9절의 업데이트 절차를 따릅니다.

```sh
mkdir -p "$HOME/ai-projects"
cd "$HOME/ai-projects"
git clone https://github.com/2000silpeed/cc-harness.git
mkdir my-new-project
git -C "$HOME/ai-projects/my-new-project" init

cd "$HOME/ai-projects/cc-harness"
git rev-parse HEAD
node scripts/check-harness.mjs
node scripts/install-harness.mjs --target "$HOME/ai-projects/my-new-project"
```

마지막 명령은 파일을 쓰지 않는 **사전 점검(dry-run)**입니다. 생성 목록과 충돌을 확인하고, 오류가 없으며 목록이 맞을 때만 다음 명령을 실행합니다.

```sh
node scripts/install-harness.mjs --target "$HOME/ai-projects/my-new-project" --apply
cd "$HOME/ai-projects/my-new-project"
node scripts/check-harness.mjs
git status --short
codex
```

마지막 `codex` 명령은 CLI 사용자만 실행합니다. 앱 사용자는 이 폴더를 엽니다. `git init`은 로컬 저장소만 만들며 커밋, GitHub 저장소, 원격 연결은 생성하지 않습니다.

### Windows PowerShell

```powershell
$Workspace = Join-Path $HOME "ai-projects"
New-Item -ItemType Directory -Path $Workspace -Force | Out-Null
Set-Location $Workspace
git clone https://github.com/2000silpeed/cc-harness.git
$Harness = Join-Path $Workspace "cc-harness"
$Project = Join-Path $Workspace "my-new-project"
New-Item -ItemType Directory -Path $Project | Out-Null
git -C "$Project" init

Set-Location $Harness
git rev-parse HEAD
node scripts/check-harness.mjs
node scripts/install-harness.mjs --target "$Project"
```

dry-run 결과를 확인한 뒤 별도로 실행합니다. 오류가 나면 다음 명령으로 진행하지 않습니다.

```powershell
node scripts/install-harness.mjs --target "$Project" --apply
Set-Location $Project
node scripts/check-harness.mjs
git status --short
codex
```

**복사·등록 검사에는 원본의 npm ci가 필요 없습니다.** 두 스크립트는 Node 기본 모듈을 사용합니다. 새 폴더에는 아직 package.json이 없으므로 npm run dev도 실행할 수 없습니다. npm ci는 npm 기반 제품 구성과 잠금 파일이 생긴 뒤 해당 제품 폴더에서 실행합니다.

## 4. 자동 복사와 별도 설정

복사 범위의 기준은 `docs/harness/registry.json`입니다. 설치 도구는 이 등록 목록에 포함된 파일만 복사합니다.

| 복사함                              | 복사하지 않음                               |
| ----------------------------------- | ------------------------------------------- |
| 등록 스킬과 보조 설정               | 원본 AGENTS·CLAUDE·README·package.json·lock |
| docs/harness·docs/methods 등록 문서 | 원본 테스트·검증 로그·개인 데이터           |
| 디자인 authoring-guide              | 구조도 HTML·구조도용 색상·간격·검사기       |
| 설치·등록 검사 스크립트             | Git/Codex/Claude 훅·CI·배포·전역 설정       |
| registry                            | .git·node_modules·dist·tmp·브라우저 데이터  |

내용이 같은 파일은 `same`으로 표시하고 건너뜁니다. 기존 파일과 내용이 다르면 어떤 파일도 쓰기 전에 충돌로 중단합니다. 강제 덮어쓰기 옵션은 없으며, 심볼릭 링크나 대상 폴더 밖으로 쓰는 작업도 거부합니다. 이 결과물은 자동으로 동기화되는 복제본이 아니라 **독립 사본**입니다.

Design Ontology Harness와 Semantic-os 엔진은 포함되지 않습니다. 이전 PC의 절대 경로나 전역 스킬을 가정하지 않습니다. 재합성이 필요하면 별도로 연결하며, 없어도 제공된 디자인 작성 방법론으로 새 제품 기준을 만들 수 있습니다.

## 5. Codex를 연 다음 첫 입력

프로젝트 스킬 목록에서 `harness-cycle`, `feature-planner`, `project-bootstrap`을 확인합니다. 보이지 않으면 작업 폴더와 `.agents/skills` 파일을 확인한 뒤 Codex를 다시 시작합니다. 이름이 같은 전역 스킬과 혼동하지 않도록 로컬 경로를 명시합니다. 자세한 내용은 [공식 스킬 발견 규칙](https://learn.chatgpt.com/docs/build-skills)을 참조합니다.

아래 내용은 **터미널 명령이 아니라 Codex 대화창에 붙여넣는 요청문**입니다.

```text
$harness-cycle
대상 프로젝트: [새 제품의 절대 경로]
하네스: 이 프로젝트의 .agents/skills와 docs/harness
아이디어: [누가 어떤 문제를 해결하는 도구인지 2~3문장]
이번 범위: 하네스 연결과 요구사항 인터뷰부터

현재 작업 루트와 Git 상태를 확인하고 로컬 스킬을 사용해줘.
docs/harness/lifecycle.md와 reuse.md를 읽어줘.
짧은 AGENTS.md와 docs/features/[기능명]/progress.md를 만들되,
기존 파일이 있으면 먼저 읽고 필요한 부분만 병합해줘.
제품 요구사항·디자인·승인·기술안은 이 프로젝트에서 확인해.
인터뷰는 추천안과 이유를 포함해 한 번에 질문 하나씩 진행해줘.
기술안 승인 전 앱 스택을 설치하지 마.
커밋·푸시·배포는 별도 요청 전 실행하지 마.
하네스 원본 커밋 [3절에서 확인한 SHA]도 진행 기록에 남겨줘.
```

다음은 AGENTS의 최소 예시입니다. [필수 오케스트레이션 정책](../methods/delivery-automation.md#필수-오케스트레이션-정책)을 대상에 함께 유지합니다. 아직 없는 검사 명령을 작동한다고 기록하지 않습니다.

```markdown
# 프로젝트 협업 기준

- 실제 대상은 이 저장소다. 전체 흐름은 docs/harness/lifecycle.md를 따른다.
- 로컬 스킬은 .agents/skills/에서 읽는다.
- 대화형·자동 실행과 하네스 유지보수 모두 `docs/methods/delivery-automation.md`의 필수 오케스트레이션 정책을 따른다.
- 메인은 상태·승인·라우팅·증거 통합·사용자 대화를 맡고 실제 탐색·산출물 수정·테스트는 반드시 작업자에게 위임한다. 작은 구현도 예외가 없다.
- 새 최소 작업 컨텍스트와 별도 검증자를 사용한다. 작업자는 재귀 위임하지 않는다. 도구가 없으면 오류·재개 조건을 보고하고 메인 직접 구현으로 대체하지 않는다.
- 요구사항·승인·검증·다음 행동은 docs/features/<기능명>/progress.md에 기록한다.
- 사용자 결정·코드·데이터를 보존하고 작은 변경부터 검증한다.
- 제품 디자인·기술안은 별도 확정한다. 예시를 사용자 결정으로 간주하지 않는다.
- 구현 전 요구사항·기술안·범위·이슈·시나리오 게이트를 확인한다.
- 실제 검사 명령은 구성이 생긴 뒤 README와 이 파일에 기록한다.
- 별도 요청 없이 커밋·푸시·배포하지 않는다.
```

### Claude Code를 쓸 때

Claude Code도 같은 스킬과 문서를 씁니다. 설치 스크립트가 복사하는 `.claude/skills/<이름>/SKILL.md`는 `.agents/skills`의 원본을 읽게 하는 진입점일 뿐이므로, 절차는 한 곳에서만 관리됩니다. Claude Code는 `AGENTS.md`를 직접 읽지 않으니 새 제품 루트에 아래 `CLAUDE.md`를 둡니다.

```markdown
# 프로젝트 협업 기준

@AGENTS.md

- 스킬은 /harness-cycle처럼 호출한다. 문서의 `$스킬명`은 `/스킬명`으로 읽는다.
- security-review는 기본 명령과 겹치지 않도록 /harness-security-review로 호출한다.
- 역할 배정: 작업자는 harness-worker, 독립 검증자는 harness-verifier, 읽기 전용 진단은 harness-diagnostic 서브에이전트에 맡긴다. 작업자와 검증자는 서로 다른 호출로 만든다.
- 서브에이전트가 응답을 끝냈다는 사실만으로 완료로 보지 않는다. 반환된 증거를 AC와 대조한 뒤 완료로 기록한다.
```

제품 폴더에서 `claude`를 실행하고, 위 첫 입력의 `$harness-cycle`을 `/harness-cycle`로 바꿔 붙여넣습니다. `/` 목록에 스킬이 보이지 않으면 작업 루트와 `.claude/skills` 파일을 확인한 뒤 Claude Code를 다시 시작합니다. `.claude/agents`의 세 역할도 함께 복사되며, 기본값은 모두 `claude-opus-5-5`이고 effort만 작업자 medium, 검증자 high, 진단 xhigh로 다릅니다. 원본의 `.claude/settings.json` 훅은 구조도 전용이라 복사하지 않습니다.

전역 AGENTS와 제품 AGENTS는 별개입니다. 개인 규칙이 필요하면 검토 후 따로 설정하고 인증 폴더를 통째로 복사하지 않습니다. [공식 AGENTS 적용 범위](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

## 6. 아이디어부터 구현까지

이후의 대화, 소스 수정, 검사, 커밋은 모두 **my-new-project**에서 수행합니다. 기능 산출물은 `docs/features/<기능명>/`에 모읍니다. 공통 기술 결정 기록(ADR)과 디자인 문서의 위치는 제품 구조에 맞게 연결합니다.

| 순서 | 스킬과 행동                                    | 내가 결정할 것                     | 산출물                                |
| ---- | ---------------------------------------------- | ---------------------------------- | ------------------------------------- |
| 1    | harness-cycle + project-bootstrap: 하네스 연결 | 대상·목적·현재 상태                | AGENTS·progress·원본 SHA              |
| 2    | feature-planner: 인터뷰                        | 사용자·범위·데이터·예외·성공 조건  | spec-original·interview·spec-fixed    |
| 3    | design-system: UI가 있다면                     | 배치·색·글꼴·간격·상태·반응형      | design.md·공통 디자인 문서            |
| 4    | feature-planner: PRD·ADR·이슈                  | 기술안 비교·제외 범위·AC·의존 순서 | prd·ADR·issues                        |
| 5    | project-bootstrap: 승인된 앱 기반              | 실행 환경·검사·최소 실행           | 소스·러너·설정·README                 |
| 6    | test-scenarios → tdd-loop                      | 첫 이슈 계약·정상/경계/예외        | Red → Green → 독립 AC → Refactor·보안 |
| 7    | 같은 루프로 다음 이슈                          | 완료 근거·미검증·남은 범위         | 이슈별 결과·progress                  |
| 8    | e2e-write → create-pr                          | 전체 여정·회귀·원격 작업 범위      | E2E·검사·리뷰·승인된 Git 작업         |
| 9    | 운영 인계                                      | 배포 대상·비용·데이터·복구         | 별도 승인·배포 검증                   |

**하네스 연결과 앱 생성은 서로 다른 작업입니다.** React나 IndexedDB를 미리 고정하지 않습니다. API/CLI 제품은 사용자 화면(UI) 검사가 해당하지 않는 이유를 기록하고 실제 진입점 검사로 대체합니다. 상세 양식은 [templates.md](templates.md), 승인 관문은 [lifecycle.md](lifecycle.md)를 따릅니다.

첫 이슈 구현 요청:

```text
$tdd-loop
대상: docs/features/[기능명]/issues.md의 [이슈 ID] 하나
승인과 실제 파일을 대조하고 계약·시나리오 → Red → Green →
독립 AC → Refactor·보안 순서로 진행해줘.
커밋·푸시·배포는 제외해.
```

자동 모드는 첫 사이클과 도구를 확인한 뒤 유한 범위로 요청합니다.

```text
$tdd-auto-loop
대상: [프로젝트 / 기능명]
승인된 이슈: [ID 1] → [ID 2], 총 2개
이슈별 Green 최대 3회. 단계별 분리 에이전트와 독립 AC를 사용해줘.
하네스 STOP 조건과 기존 데이터를 보존해줘.
푸시·배포는 제외하고 미커밋 변경이 있으면 내용을 먼저 보고해줘.
```

스킬은 위임 실행 환경을 설치하지 않습니다. 대화형 실행에도 같은 위임 의무가 적용됩니다. 도구가 없다면 실제 장애·미수행 범위·재개 조건을 보고하고 공통 정책에 따라 실행을 보류합니다. 테스트 통과와 인수 조건(AC) 충족은 서로 다른 결과입니다. STOP이면 원인·재개 조건을 남기고 입력을 보강한 뒤 재개합니다.

## 7. 훅·품질·디자인 연결 시점

앱 도구를 구성한 뒤 project-bootstrap에 요청합니다.

```text
기존 설정부터 조사하고 실제 lint·format·test·build를 연결해줘.
필요한 Git 훅은 기존 설정과 병합하고 새 의존성은 이유를 설명해줘.
UI에는 새 제품의 design.md·공통 기준을 읽는 검사기를 만들고
정상 파일과 의도적인 위반 파일로 동작을 확인해줘.
설치된 Codex가 지원하는 도구 완료 훅을 확인해 연결하되,
신뢰 승인과 실제 경고 발화를 검증하고 미지원이면 수동 검사로 명시해줘.
구조도 전용 색상·검사기·절대 경로를 복사하지 마.
```

Git 훅은 Git 시점, Codex·Claude Code 훅은 지원되는 도구 이벤트 시점에 실행됩니다. 원본 hooks.json과 .claude/settings.json은 구조도 경로와 셸 문법에 묶여 있어 이식하지 않습니다. 버전·Windows 셸·신뢰를 새 환경에서 검증합니다. 원본 npm run check는 lint·디자인 정적 검사·하네스·서식·이식 회귀·타입 검사만 포함하므로 새 제품은 자체 검사 묶음을 만듭니다.

## 8. 매일 재개하고 끝내기

새 제품을 열어 git status와 progress를 보고 대화합니다.

```text
$harness-cycle
progress.md와 실제 변경을 대조해 마지막 미완료 단계부터 이어가줘.
이미 승인한 결정은 반복 질문하지 말고 오늘 범위는 [이슈 ID] 하나야.
미커밋 변경은 소유와 내용을 확인하고 보존해줘.
```

종료하기 전에 변경 파일, 검사 명령과 결과, 미검증 항목, 다음 행동을 기록합니다. 대화 기록만을 근거로 삼아서는 안 됩니다. 다른 PC로 옮길 제품 코드는 검토한 뒤 **제품 저장소**에 커밋하고 푸시합니다. `git remote -v`로 대상을 확인하고, cc-harness 원격 저장소로 새 제품을 푸시하지 않습니다.

## 9. 개선판 업데이트

원본 폴더에서 git status를 확인하고, 깨끗한 상태에서 git pull --ff-only로 갱신합니다. 미커밋 작업이나 분기 충돌을 reset·강제 pull로 지우지 않습니다. 새 원본으로 설치 dry-run을 다시 수행합니다.

- 동일 파일은 건너뛰고 새 파일은 apply로 추가합니다.
- 이미 복사한 내용이 달라지면 업데이트도 충돌입니다. 자동 병합기가 아니므로 원본·대상을 비교해 필요한 변경을 검토·병합합니다.
- 원본 파일 삭제는 대상에 자동 반영되지 않습니다. 참조와 사용 여부를 확인한 뒤 별도로 정리합니다.
- 대상의 check-harness와 제품 자체 검사를 실행하고 변경한 원본 SHA를 기록합니다.
- 원본을 pull했다고 제품의 독립 사본이 자동 변경되지 않습니다. 필수 오케스트레이션 정책도 기존 대상의 `AGENTS.md`·방법론·스킬에 명시적으로 병합해야 합니다. 이 의무는 지침으로 적용되며 메인의 직접 실행을 런타임에서 기술적으로 차단하지 않습니다.

### ADOPT/RESUME reconciliation 경계

등록 목록(registry)에 경로가 있다는 이유만으로 대상 파일을 하네스 관리 파일(Harness-managed)로 단정하지 않습니다. 이전에 사용한 원본 버전과 관련 계약 해시가 모두 일치할 때만 하네스 관리 파일로 판단합니다. 제품 소유 파일(project-owned)인 제품 코드, 기능 문서, 설정, AGENTS는 보존합니다.

하네스와 제품이 함께 수정했거나(shared/customized) 원본을 알 수 없다면 차이(diff)를 검토하고 사용자 승인을 받아야 합니다. 설치 도구가 같은 파일은 건너뛰고 하나라도 충돌하면 아무것도 쓰지 않는 계약은 유지합니다. `--upgrade`, 변경 목록(manifest), 3방향 병합(3-way merge), 강제 덮어쓰기는 제공하지 않습니다.

검증 증거를 재사용하기 전에는 확인 비용이 낮은 정보부터 대조합니다. 원본 버전, 관련 계약 해시, 인수 조건·테스트·명령·실행 환경, 실제 적용 확인점(effective checkpoint)이 여기에 해당합니다. 관련 입력이 모두 같지 않거나 확인할 수 없으면 영향을 받는 범위만 다시 검증합니다. 저장소 전체의 현재 커밋(HEAD)이 다르다는 이유만으로 모든 증거를 버리지는 않습니다.

## 10. 새 제품과 기존 제품 이사는 다르다

| 목적                            | 방법                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 완전히 새 제품                  | 별도 빈 폴더에 이 문서대로 하네스만 이식                                                              |
| 기존 제품을 새 PC에서 계속 개발 | 그 제품 저장소를 clone하고 제품 README·lock·progress를 따릅니다. 하네스가 커밋돼 있으면 재설치 불필요 |

임시 파일·미커밋 소스·로컬 대화·Codex 인증·.env·서버는 clone으로 옮겨지지 않습니다. 제품 데이터는 해당 제품의 저장 방식과 백업·복원 절차를 확인해 별도로 안전하게 이동합니다.

## 11. 첫날 체크리스트와 문제 해결

- [ ] 원본과 새 제품은 별도 Git 루트이며 Codex는 새 제품 루트에서 열었습니다.
- [ ] 원본·대상 check-harness가 통과하고 등록 스킬·문서가 존재합니다.
- [ ] 로컬 스킬 발견, 짧은 AGENTS, 기능별 progress, 원본 SHA를 확인했습니다.
- [ ] 하네스 자산과 제품 결정·코드·데이터를 분리했습니다.
- [ ] 미설치 앱·훅·독립 에이전트를 완료라고 표시하지 않았습니다.
- [ ] 첫 인터뷰에 답할 준비가 됐고 다음 승인 대상이 명확합니다.

| 증상                               | 조치                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| Repository not found               | URL·권한·GitHub 인증 확인                            |
| 대상 디렉터리 오류                 | 폴더 먼저 생성, 절대 경로 따옴표, 링크 폴더 제외     |
| 충돌                               | 기존 파일 보존 후 비교·병합. 억지로 삭제하지 않음    |
| 셸이 $harness-cycle을 못 찾음      | Codex 대화창에 입력(Claude Code는 /harness-cycle)    |
| 스킬이 안 보임                     | 작업 루트·숨김 폴더·동명 전역 스킬·Codex 재시작 확인 |
| npm run dev나 디자인 검사기 없음   | 이식만 완료한 상태. 승인 후 앱 기반·제품별 검사 구성 |
| 등록 검사는 통과했는데 제품이 없음 | 인터뷰·PRD·이슈 사이클부터 진행                      |

이식 검사는 파일 복사, 충돌 방어, 참조, 등록 구조를 확인합니다. 새 PC 인증, Windows 실행, 실제 제품 생성, 훅 신뢰 승인, 외부 엔진 설치까지 보증하지는 않습니다. 검사 근거는 [verification.md](verification.md)를 따릅니다.
