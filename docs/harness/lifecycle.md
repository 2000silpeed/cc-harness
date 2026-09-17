# 재사용 하네스 — 아이디어부터 검증된 프로젝트까지

## 먼저 구분할 것

이 저장소는 독립형 **워크플로우·스킬·검사 도구 자산**이다. 스킬 등록은 제품 구현 완료가 아니다. 새 프로젝트의 제품 명세와 승인 기록은 해당 프로젝트에서 작성한다. 도구와 기능 예시는 대상 스택에 맞게 적용한다.

tdd-loop와 tdd-auto-loop는 맨 끝 작업이 아니라 **이슈별 TDD 사이클을 감싸는 실행 방식**으로 선택한다.

## 1. 전체 실행 지도

| 단계           | 사용할 스킬                        | 입력                            | 산출물                             | 다음 단계 조건                         |
| -------------- | ---------------------------------- | ------------------------------- | ---------------------------------- | -------------------------------------- |
| 시작·아이디어  | harness-cycle                      | 대상 경로·문제·사용자·승인 범위 | 최초 요청·진행 상태                | 실제 대상과 범위 확인                  |
| 환경 준비      | project-bootstrap, mermaid-diagram | 대상 코드·설정                  | 짧은 AGENTS·검사 명령·훅·흐름 화면 | 도구 동작 확인, 없는 앱은 미구현 표시  |
| 요구사항       | feature-planner                    | 최초 요청·기존 코드             | spec-original·interview·spec-fixed | G1 요구사항 승인                       |
| 디자인         | design-system                      | 요구사항·참고 화면              | design.md·네 공통 문서             | 필요한 디자인 결정 승인                |
| PRD·ADR        | feature-planner                    | 확정 요구사항·디자인·코드       | prd.md·ADR·범위                    | G2 기술안 선택, G3 범위 승인           |
| 이슈 계획      | feature-planner                    | PRD·저장소·보드 정보            | issues.md·AC·의존성·등록 결과      | G4 이슈 목록 승인, 외부 등록 별도 권한 |
| 앱 기반 준비   | project-bootstrap                  | 선택한 기술안·준비 이슈         | 최소 실행 구조·테스트 러너·명령    | 실제 실행·테스트 수집 확인             |
| 시나리오       | test-scenarios                     | 이슈 AC·계약                    | scenarios.md                       | G5 인터페이스·시나리오 검토            |
| Red            | tdd-red                            | 검토한 시나리오                 | 실패 테스트·최소 stub·로그         | 미구현 실패와 Broken 구분              |
| Green          | tdd-green, design-system           | Red 증거·디자인                 | 최소 구현·테스트 로그              | 대상 테스트·회귀 검사 통과             |
| 독립 AC 확인   | ac-verifier                        | AC·코드·실행 증거               | AC별 판정                          | 빠진 AC는 시나리오/Red로 복귀          |
| Refactor·보안  | tdd-refactor, security-review      | 통과 구현·검증                  | 구조 개선·보안 판정                | 회귀 없음·차단 발견 해결               |
| 이슈 반복·통합 | tdd-loop 또는 tdd-auto-loop        | 의존성 순서·진행 기록           | 이슈별 결과·인계                   | 준비된 이슈만 처리, 승인 경계 유지     |
| 기능 E2E       | e2e-write                          | 통합 기능·사용자 시나리오       | 브라우저 테스트·증거               | 기능 경계 연결 검증                    |
| PR·CI·main     | create-pr                          | 검증한 변경·base/head           | PR·CI·머지·회고 기록               | 리뷰·필수 검사·머지 승인               |
| 배포·운영 인계 | harness-cycle                      | 머지된 변경·운영 요구           | release-checklist.md               | 배포 대상·비용·데이터·되돌리기 승인    |

한 프로젝트는 여러 feature로 구성될 수 있다. 첫 기능을 끝낸 뒤 회고와 공통 규칙을 정리하고 다음 기능을 같은 루프로 진행한다. API·CLI처럼 UI가 없는 대상은 디자인·브라우저 E2E를 이유와 함께 해당 없음으로 정리하고 실제 사용자 진입점의 통합 테스트로 바꾼다.

## 2. 시작 명령

아래는 Codex 대화 입력이며 셸 명령이 아니다.

```text
$harness-cycle
대상 프로젝트: [경로]
아이디어: [누가 어떤 문제를 해결하는가]
이번 범위: [기획만 / 승인된 기능 구현까지 / PR 준비까지]
기존 결정: [문서 경로 또는 없음]
실제 상태를 조사하고 가장 먼저 미완료인 단계부터 진행해줘.
이미 결정한 내용은 다시 인터뷰하지 말고 승인 게이트를 지켜줘.
```

이미 기획했다면 `$feature-planner [feature] PRD부터`, 한 이슈를 구현하려면 `$tdd-loop [issue]`, 준비된 여러 이슈를 명시적으로 맡기려면 `$tdd-auto-loop [issue 목록] 최대 3개, 수정 재시도 2회`처럼 범위와 상한을 정한다. 숫자는 사용자가 선택할 실행 범위이지 무제한 실행의 기본값이 아니다.

## 3. 대상과 하네스 위치

- **하네스 원본**: 이 저장소. 스킬·방법론·설명서의 기준.
- **대상 프로젝트**: 실제 제품 코드를 작성할 저장소. 모든 실행 명령은 대상 경로와 연결한다.
- 스킬의 상대 문서 경로는 하네스 루트 기준이다. 대화 시작 때 하네스 위치와 대상 위치를 함께 확인한다. 같은 위치라고 가정하지 않는다.
- 다른 저장소로 복사할 때는 [이식 절차](reuse.md)를 따른다. 스킬만 복사하면 참조 문서가 누락될 수 있다.
- 전역 스킬에 동명이 있더라도 어느 경로가 선택됐는지 확인한다. 새 세션의 스킬 발견은 설치 검증이며 실제 기능 구현 성공과 다르다.

## 4. 재개 가능한 기록

대상 프로젝트의 `docs/features/{feature}/progress.md`에 [산출물 템플릿](templates.md)의 진행 표를 사용한다. 날짜가 최신이라는 이유만으로 다음 단계로 넘어가지 않는다.

기록에는 현재 단계·이슈 ID·승인 대상/내용/근거·수정 파일·실행 명령/cwd/종료 코드·증거 경로·남은 문제·다음 행동을 둔다. 승인된 문서가 바뀌면 해당 문서에 의존하는 승인과 테스트가 여전히 유효한지 확인한다. AI가 스스로 `approved`를 채우지 않는다.

재개 시 실제 파일과 진행 기록을 대조한다. CI가 다른 커밋을 검사했거나 테스트 후 관련 코드·contract/AC·test·command·environment가 바뀌었다면 해당 pass를 재사용하지 않는다. global HEAD 차이만으로 전체 evidence를 폐기하지 않고 저비용 metadata/hash/command/checkpoint로 관련 입력을 먼저 대조한다. Git 커밋이 없다면 검사 당시 변경 파일의 해시 등 재현 가능한 식별 정보를 기록한다.

### NEW, ADOPT, RESUME과 Adaptive Execution

NEW는 새 프로젝트, ADOPT는 하네스를 처음 적용하는 기존 프로젝트, RESUME은 기존 하네스 프로젝트의 재개/호환 갱신이다. ADOPT/RESUME은 기존 승인, spec, ADR, issue, progress, code, config, AGENTS와 evidence를 보존한다. source revision, relevant contract hashes, `policy_effective_checkpoint`, evidence valid/invalid와 이유를 기존 기록에 추가한다. routing field가 없는 과거 기록은 `legacy-unknown`으로 보존하며 새 policy를 소급 적용하지 않는다.

ADOPT discovery는 runtime, 구조, 경계, 검사, CI/CD, Git, 문서, 기존 결정, 현재 작업, 기술부채를 `CONFIRMED`/`DOCUMENTED`/`INFERRED`/`UNKNOWN`으로 표기한다. AI 추론은 과거 승인이나 ADR이 아니다. baseline은 사용자 승인 후에만 유효하고, legacy AC는 제안 → 사용자 확인 → 독립 검증 → 남은 lifecycle 순서를 따른다. 기술부채 자체는 adoption blocker가 아니지만 security/data-loss/Broken STOP, dirty auto-loop STOP, Refactor 전체 회귀 STOP은 baseline으로 완화하지 않는다.

ADOPT ratchet는 count뿐 아니라 같은 입력의 failure identity(command, signature, tool version, scope)를 비교한다. count가 같아도 기존 identity A가 새 identity B로 바뀌면 regression이다. relevant code·contract/AC·test·command·environment가 같은지 먼저 대조하고, `unknown`은 해당 범위의 targeted investigation으로 남긴다. baseline은 어떤 mandatory STOP도 면제하지 않는다.

재개 시 profile과 역할 요청을 새 checkpoint 이후에만 기록한다. profile은 compact/standard/intensive 중 risk evidence로 정하며, known local blast radius가 아닌 경우 compact를 쓰지 않는다. MSC와 JIT 탐색·Evidence Reuse는 [공통 실행 정책](../methods/delivery-automation.md#adaptive-execution-process와-model의-분리)을 따른다.

### 세션 checkpoint와 handoff

의미 단계가 끝나 다음의 비싼 작업 묶음을 시작하기 전이나 runtime이 실제 context pressure를 알린 때 checkpoint를 만든다. 계정 quota나 임의 context 비율을 신호로 쓰지 않는다. native compaction은 현재 대화의 runtime 기능이고, durable handoff 및 새 세션 생성과 구분한다. 비동기 compaction은 `contextCompaction` 완료 뒤에만 끝난 것으로 기록하며 `resume`·`fork`는 과거 history를 유지하므로 fresh session이 아니다. 2026-09-17에 관찰한 Codex App surface에는 compact 호출과 정확한 thread별 context telemetry가 없었다. 실행 때마다 현재 callable capability를 다시 확인하고 지원을 추정하지 않는다. 관련 공식 사양은 [config reference](https://learn.chatgpt.com/docs/config-file/config-reference), [developer commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli), [App Server](https://learn.chatgpt.com/docs/app-server)를 따른다.

`docs/features/{feature}/session-handoff.json`에는 목표·승인 범위와 근거, source revision·dirty 소유/해시, 현재 checkpoint와 정확한 다음 행동, contract·evidence 참조/해시와 유효성, 실패 identity와 증거 참조, 실제 Green/diagnostic/rework/rollover 누계, 진행 중 worker·외부 작업, STOP·재개 조건만 보존한다. 대화 서사, 반복 계획, 긴 로그·도구 출력, 전체 저장소 목록, 폐기한 선택지와 evidence 본문은 다음 prompt에서 빼되 디스크에서는 삭제하지 않고 필요한 경로·해시·무효 이유를 남긴다.

`node scripts/session-handoff.mjs --help`와 `template`로 필요할 때만 strict 입력 계약을 읽는다. `prepare --input <json> --state docs/features/{feature}/session-handoff.json`으로 record를 원자적으로 준비하고 `decide --state <path> --root <project> [--session-id <real-id>]`로 source·dirty·참조와 승인·증거·STOP·관련 다음 행동 예산·in-flight 상태를 다시 확인한다. 자동 decide/claim은 Git HEAD/status를 전제로 한다. Git이 없으면 `progress.md`와 동일한 참조/해시 manifest로 수동 인계하고 자동 claim은 사용하지 않는다. helper는 session을 만들지 않는다.

`fresh-session`은 작업별 rollover 승인과 유한 cap이 남아 있을 때만 가능하며, 같은 checkpoint의 no-progress 연쇄와 누계 reset을 막는다. `action_kind=phase`인 다음 Green만 Green 예산을 쓰고, `action_kind=diagnostic`은 기존 정책의 bounded read-only 역할로 diagnostic 예산을 쓴다. 한 handoff chain의 rollover·Green·diagnostic limit은 불변이다. 새 limit이나 범위는 lifecycle 승인으로 새 chain을 열되 이전 task의 사용량·실패를 reset하지 않는다. active STOP 해제는 새 sequence에서 기존 reason/condition을 보존하고 `resume:<previous-handoff-id>` 승인과 같은 새 valid evidence를 `resolution_ref`로 연결할 때만 허용한다.

새 세션은 `claim --state <path> --handoff-id <id> --executor-id <id>` 성공 뒤 runtime에 startup-only prompt로 한 번만 생성한다. claim 직후 원 세션은 project/source 수정을 멈추고 생성·receipt 기록·prompt 전달만 한다. 같은 claim replay에는 launch prompt가 없으며 reconciliation에서 멈춘다. 새 thread는 제품 작업을 기다린다. caller가 real session ID를 받은 뒤 `receipt --state <path> --handoff-id <id> --executor-id <id> --session-id <real-id>`를 기록하고, 이때 처음 반환된 bounded resume prompt를 그 thread에 보낸다. consumer는 prompt 첫 명령으로 자신의 session ID를 넣은 `decide`에서 matching receipt를 확인한 뒤에만 다음 행동을 수행한다. pending client ID, timeout, claim 뒤 불명확한 생성은 재생성하지 않는다. executor/session ID는 runtime 영수증이지 실행 진실성의 독립 증거가 아니다.

## 5. 승인과 외부 작업

G1 요구사항, G2 기술안, G3 Out of Scope, G4 이슈 목록은 사용자 확정이 필요하다. 기술 선택을 위임받아도 세 안의 비교와 AI 추천을 먼저 제시하고 최종 선택을 확인한다. 기술 선택 위임은 요구사항 확정이 아니다. G5 시그니처·시나리오는 일반 모드에서 사용자 검토를 유지하며, 자동 모드에 한해 명시적 기술 판단 위임과 객관 STOP 조건을 적용한다. 위임 대상·범위·근거를 기록하고 이미 받은 승인을 반복 요구하지 않는다.

GitHub 이슈/보드 등록, 브랜치 생성, 커밋, 푸시, PR, 머지, 배포는 계획 문서 생성과 다른 행동이다. 사용자에게 받은 구체적 실행 범위 안에서만 수행한다. ‘스킬 등록’ 요청은 이 작업들의 허가가 아니다. 파괴적 복구, 강제 푸시, 운영 데이터 변경, 비용 발생은 실행 전에 별도 검토한다.

## 6. 이슈 한 개의 운영 루프

```text
선행 이슈·승인·대상 브랜치 확인
  → 계약·시나리오 → [사용자 검토]
  → Red(실패 원인 확인)
  → Green(최소 구현·회귀 확인)
  → 독립 AC 검증
       누락이면 시나리오·Red로 돌아감
  → Refactor(동작 보존)
       회귀이면 자신의 변경 복구
  → 보안·타입·설정 검토
  → 승인 범위 안의 이슈 PR/통합
  → 진행 기록 → 다음 준비된 이슈
```

가급적 한 이슈에 사용자에게 보여줄 수 있는 수직 동작을 넣는다. 새 앱의 러너·빌드 준비처럼 필요한 기반 작업은 숨기지 말고 별도 준비 작업으로 표시한다. 이는 사용자 기능 슬라이스 완료로 계산하지 않는다.

## 7. 스킬과 독립 판단 역할

스킬은 읽어서 따르는 절차이며 자동으로 별도 프로세스를 생성하지 않는다. `$tdd-loop`가 호출되면 담당 에이전트는 필요한 하위 SKILL.md를 읽고 순서대로 수행한다. 문자열을 셸에 실행하지 않는다.

`ac-verifier`는 AC 판단 계약을 담는다. 독립 검토가 허용되고 도구가 있으면 구현자가 아닌 서브에이전트에 AC·변경·증거를 전달한다. 없으면 동일 에이전트 검토임을 밝히고 독립 검토 완료라고 기록하지 않는다. 대상 정책상 독립 검토가 필수면 그 게이트는 미완료다.

반복 모드는 `tdd-loop`(순서 자동화, 단계별 사람 검토 유지)와 `tdd-auto-loop`(격리된 단계 위임·JSON 증거·위임된 기술 판단·객관 STOP) 중 선택한다. 자동 모드도 한 이슈에 적용할 수 있으며 여러 이슈는 명시된 집합과 유한 상한 안에서만 반복한다. 기획의 사용자 결정을 건너뛰지 않는다. 승인 부재·Broken 환경·진전 없는 반복·새 범위·보안 차단·충돌·상한 도달 시 기록 후 정지한다.

## 8. 앱을 처음부터 만드는 경우

빈 저장소에서는 요구사항/기술 선택 전에 React·DB·호스팅을 임의로 깔지 않는다. PRD와 준비 이슈가 정해진 뒤 선택한 스택의 최소 엔트리·의존성 잠금·실행 명령·테스트 러너를 구성한다.

기반 준비의 완료는 서버/CLI 실행과 테스트 수집이 가능하다는 뜻이다. 기능 구현 완료는 아니다. 이후 첫 수직 슬라이스를 Red부터 구현한다. 기존 프로젝트에선 이 단계를 중복 실행하거나 현재 도구를 새 도구로 교체하지 않는다.

## 9. 배포·운영 인계

main 머지는 배포가 아니다. 실제 배포 요청이 들어오면 대상 플랫폼·환경·요금·도메인·비밀·데이터 마이그레이션·백업·롤백·상태 확인을 먼저 결정한다. 플랫폼별 현재 공식 문서와 기존 CI를 확인한 뒤 배포 절차를 만든다.

배포 전 승인과 배포 후 smoke test·로그·모니터링·복구 담당자를 [release 템플릿](templates.md)에 기록한다. 배포를 실행하지 않았다면 URL이나 운영 완료를 만들어내지 않는다. 스킬 등록은 배포 자동화나 호스팅 설정의 완료를 의미하지 않는다.

## 10. 완성의 증거

| 구분             | 증거                        | 이것만으로 보장하지 않는 것 |
| ---------------- | --------------------------- | --------------------------- |
| 스킬 등록        | 파일·형식·발견 결과         | 실제 제품 작업 성공         |
| 문서             | 승인·입출력·출처            | 구현 완료                   |
| 단위·통합 테스트 | 실제 명령·assertion·결과    | AC 전체 충족·UI 품질        |
| AC 검토          | AC별 구현·실행 근거         | 보안 전수 검증              |
| E2E              | 주요 사용자 흐름 실행·trace | 모든 경계와 운영 안정성     |
| CI               | 검토 대상 변경의 필수 체크  | 사용자 머지·배포 승인       |
| 머지             | 실제 base/head·머지 결과    | 배포됨                      |
| 배포             | 승인·URL·smoke·복구 준비    | 지속 운영 완료              |

상세 단계는 [프로젝트 기반](../methods/project-foundation.md), [요구사항 인터뷰](../methods/requirements-interview.md), [디자인 시스템](../methods/design-system.md), [기획](../methods/planning.md), [테스트 전략](../methods/testing-strategy.md), [TDD](../methods/tdd.md), [전달·자동화](../methods/delivery-automation.md)를 참조한다. 준비 기록과 스킬을 실제 수행 결과로 혼동하지 않는 것이 이 하네스의 핵심이다.
