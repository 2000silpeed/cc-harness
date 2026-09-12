# PM 디자인 하네스 실행·검증 기록

검증일: 2026-09-12. 범위: 디자인 입력 저작 → 로컬 합성 → 엄격 계약 검사 → PM용 명세 재정립. 제품 런타임 QA나 출시 검증이 아니다.

## 실행 결과

| 검사               | 실제 결과                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Semantic-os 동기화 | --check 통과, changed=false. 380노드·1266엣지·308키워드, payload 4041facc76b5557979f38a27688d349378caece64d143eb409fc78890a9903b9 |
| 엔진 팀 테스트     | tests/test_agent_team.py + tests/test_agent_packs.py: 28 passed, 7 subtests passed                                                |
| PM 전용 팀 팩      | Codex 전용 생성, 역할 10개 정의. 모두 동시에 실행한 에이전트 수가 아님. 상위 하네스는 덮어쓰지 않음                               |
| 합성               | 로컬 KB 3개 reference / 21개 문서로 run-project 완료. 최초 anti_keywords 필수 키 누락을 입력에서 고친 후 재실행                   |
| 입력 검증          | profile_validation.json: valid=true, errors=[], warnings=[]                                                                       |
| 엄격 컴포넌트      | ok=true, 6개 저작 계약, needs-authoring=0, primitive 대응 6개, waiver=0, 토큰 88개                                                |
| 색상 검증          | 최종 밝은 테마 11역할·121방향 조합 분류, 필수 5쌍 통과                                                                            |
| 부정 검사          | 임시 복사본의 없는 토큰 별칭과 같은 색 글자/배경 모두 종료 코드 1로 거부                                                          |
| 보호 자료          | 기존 PM 인터뷰·spec-original·spec-fixed의 Git diff 없음                                                                           |

## 독립 검토와 재정립

Brief Author와 Component Contract Author는 하나의 별도 에이전트가 순차 수행했다. 메인은 입력 통합·Token Curator·컴파일 실행과 PM 문서 통합을 맡았다. 추가 읽기 전용 검토에서 범위 유입을 확인했다. 역할명은 별도 모델 실행을 자동으로 뜻하지 않는다.

| 생성물 발견                               | PM 재정립                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 다크 테마 검증을 일반 필수로 서술         | 현재 밝은 테마 제안만 대상으로 삼음. 다크는 별도 요구 승인 필요                                                          |
| 이미지·아이콘·브랜드 마크 일반 요구       | 데이터 도구에 새 그림 필요 없음. 기능적 아이콘도 선택 사항                                                               |
| 검색·필터·라이브 요약 등의 범용 문구      | PM 제외 범위를 우선하며 6개 계약 밖 기능 추가 금지                                                                       |
| 색상 설명 mixed/tinted·12색 확장 문구     | 입력은 cool/flat·확장 비활성. 생성 요약 대신 실제 선택 ID와 emitted brand 토큰을 확인하고 runtime-theme에서 PM 역할 연결 |
| Pretendard 범용 가이드와 명시적 폰트 혼재 | 저작 입력 Inter + Noto Sans KR을 채택, 실제 파일 로드는 미실행                                                           |
| complete 계약과 승인 상태 혼동 가능       | 구조 완결성과 P01–P04 사용자 승인을 분리                                                                                 |

엔진의 범용 문구를 손으로 수정하지 않았다. 제품별 채택 판단은 상위 design.md와 design-system 문서에 명시했다. Design Ontology Harness를 실행했다는 이유로 생성 문구 전체를 자동 채택하지 않는다.

기존 엔진 저장소의 전체 과거 handoff에 freshness 검사를 실행했을 때 다른 프로젝트의 오래된 해시로 실패했다. 그 기록은 PM 실행의 근거로 사용하지 않고 새 전용 팀 팩과 PM handoff로 분리했다. 엔진 코드·과거 기록·Semantic-os는 변경하지 않았다.

## 재현 명령

아래에서 ENGINE은 설치된 하네스, PROJECT는 이 문서가 있는 폴더의 절대 경로다. 다른 PC에서는 project_manifest.json의 KB 경로와 brand_profile/color-selection의 color_reference.path를 실제 설치 위치로 변경해야 한다. 로컬 KB는 과거 수집본이며 이번에 웹 최신성을 확인하거나 다시 크롤링하지 않았다.

```sh
ENGINE=/Users/sungwoon/ai-projects/design-ontology-harness
PROJECT=/Users/sungwoon/ai-projects/cc-harness/docs/features/pm-program-tracker/ontology
cd "$ENGINE"
.venv/bin/design-ontology sync-semantic-colors --source ../semantic-os/domains/color/ontology/build/graph.json --color-reference-output docs/color-reference.md --check --json
.venv/bin/design-ontology run-project --project-dir "$PROJECT" --kb-dir "$ENGINE/kb/default"
.venv/bin/design-ontology emit-tokens --project-dir "$PROJECT"
.venv/bin/design-ontology validate-component-contracts --project-dir "$PROJECT" --json
node "$PROJECT/verify-design.mjs" > "$PROJECT/build/palette-verification.json"
```

생성된 build는 로컬 재현 산출물이며 원문 KB 사본도 포함하므로 Git에서 제외했다. 사람이 읽는 최종 제안은 상위 design.md, 저작 입력은 brand_profile/spec/component-contracts, 생성 CSS는 tokens.css, 명시적 PM 확장은 runtime-theme.css다. tokens.css 재생성만으로 확장이 없어지지 않는다.

## PM 검사 연결

PM-00 갱신: CSS·HTML에 더해 TSX/JSX의 정적 style AST 검사를 연결했다. 동적 style·JSX spread는 오류로 처리한다. 과거의 TSX 전체 미지원 기록을 대체하며 자세한 환경·결과·제한은 [PM-00 검증](../pm-00-verification.md)을 따른다. 실제 앱은 빈 장부 실행 기반만 있으며 업무 기능은 아직 없다.

후속 실제 이벤트 검증: 사용자 신뢰 승인 후 apply_patch로 `public/pm-hook-probe.css`를 생성하자 색상 #123456 및 간격 13px·19px 위반이 PostToolUse additionalContext로 전달됐다. PM 토큰으로 수정한 뒤 경고는 없었고 임시 파일을 삭제했다. 이 재검증에서는 검사기를 수동 실행하지 않았다. 아래 초기 미검증 기록과 구분한다.

### 중복 정리

- PM 사람이 읽는 기준: 상위 design.md와 design-system의 colors·typography·spacing·components 네 문서.
- ontology/design-system: 위 문서의 사본이 아니라 실행 토큰·테마·저작 컴포넌트 계약 및 생성 보조 파일. 검사와 재합성 경로를 보존한다.
- 중복 하네스 plugins·agent-team과 재생성 가능한 build는 `/Users/sungwoon/ai-projects/cc-harness-design-backup-20260912-220325/`로 이동했다. PM 폴더는 약 1.8MB에서 200KB로 줄었다. 원본 인터뷰·요구사항은 변경하지 않았다.
- 문서에 남은 build 경로는 재합성 후 생성되는 경로이며 현재 상주 파일이 아니다. 아래 run-project 명령으로 복원할 수 있다. 팀 작업을 재개할 때는 백업의 plugins·agent-team을 복원하거나 엔진의 init-agent-pack으로 재생성하고 handoff freshness를 검증한다. 세 생성 폴더는 Git 제외 대상으로 지정했다.

2026-09-12 연결 검증: 정상 CSS 통과, HEX/rgb/hsl 및 13px 위반 감지, 수동 exit 1, 훅 exit 0과 additionalContext JSON, 파일 누락·미지원 형식 실패, 하위 디렉터리에서 설정 명령 실행을 확인했다. 임시 fixture는 삭제했다. `npm run check` 전체 통과. 실제 도구 이벤트 발화와 모델의 자가 수정은 미검증이다. Codex CLI 0.154.0에서 hooks 기능은 stable/true로 확인했지만 신뢰 승인을 대신 수행하지 않았다.

- `npm run design:check:pm`: 밝은 팔레트 대비·간격 토큰 존재와 src/app/public 아래 CSS 및 HTML style 블록 검사. 앱이 없으면 검사 파일 0개를 명시한다.
- `npm run design:check:pm -- 경로.css`: 명시한 파일을 검사한다. 임의 HEX/rgb/hsl 및 spacing.md 첫 JSON에 없는 margin/padding/gap 값을 보고한다. 값은 생성 tokens.css에서 읽는다.
- docs의 토큰 선언·생성 산출물은 앱 파일 스캔에서 제외하고 기존 팔레트 검사로 확인한다. 지원하지 않는 JSX/TSX/Vue/Svelte/SCSS는 실패로 알린다. JS 동적 스타일, 외부 CSS, 전체 CSS 문법·시각적 배치는 지원하지 않는다. HTML 줄 번호는 추출한 style 블록 기준이다.
- `.codex/hooks.json`에 기존 구조도 검사와 별도의 PM 검사를 연결했다. PM 훅은 전체 지정 루트를 읽기 전용 검사한다. 수정 파일 경로 추출이나 `$CLAUDE_FILE_PATH`에 의존하지 않으며 Bash 읽기 명령 뒤에도 실행될 수 있다.
- PM 훅은 경고를 stderr 및 stdout의 PostToolUse additionalContext JSON으로 전달하고 exit 0을 반환한다. 수동·통합 검사는 위반 시 exit 1이다. 기존 구조도 훅의 exit 2 정책은 유지한다. 자동 복구나 작업 취소는 하지 않는다. [공식 출력 규약](https://learn.chatgpt.com/docs/hooks).
- 새 Codex CLI 세션에서 `/hooks`로 변경된 명령을 검토·신뢰 승인하고 파일 수정 후 PM 검사 상태와 위반 피드백을 확인한다. 신뢰 설정을 대신 변경하지 않는다. 명령 직접 실행과 실제 Codex 이벤트 발화는 별도다.

## 미실행·제한

최종 통합 `npm run check`는 종료 코드 0으로 통과했다. 최초 검사에서 생성기의 폰트 보조 스크립트·상호작용 산출물 서식이 감지되어, 생성물을 손으로 포맷하는 대신 해당 생성 경로만 Prettier 대상에서 분리했다. 저작한 입력·계약·검사 스크립트·PM 설명서는 서식 검사에 포함한다. PM 전용 팀 계약 및 인계 해시 freshness 검사도 통과했다.

README와 구조도에 PM 디자인 검토 상태를 연결했다. Chrome에서 Markdown 직접 열기가 ERR_BLOCKED_BY_CLIENT로 차단되어, 보안 설정을 우회하지 않고 구조도에는 에디터에서 열 문서 경로를 표시했다. 변경된 하단 안내의 실제 표시를 확인했으며 이는 PM 앱 화면 검증이 아니다.

- 실제 PM 웹앱·브라우저 화면·폰트 로드·반응형·키보드·저장·복원·기능/E2E 테스트는 아직 없다.
- 팔레트 검사는 불투명한 밝은 테마의 HEX·단순 CSS 별칭만 지원한다. 다크·투명 합성·화면상의 실효 대비는 검사하지 않는다.
- lint-implementation / reference-fidelity-loop / verify-production-ui는 실제 구현과 승인 시안이 없어 실행하지 않았다. 출시 준비 완료로 보고하지 않는다.
- 하네스 팀 팩과 명세 생성은 전역 플러그인 설치나 실제 훅 발화가 아니다.
- 이 작업에서 커밋·푸시·외부 모델 호출·유료 이미지 생성·앱 의존성 설치는 하지 않았다.
