# 재설계 품질 보완 계약 · 2026-10-02

## 승인·기준·판정 경계

- G1 사용자 원문: 직전 평가의 보완점에 대해 “2점 마저 보완하자! 힘내요 넌 잘할수있어”. 보완 대상은 현재 Git 전달 기록과 좁은 평가 oracle, 수제 앵커 파서의 유지 비용이다. 기존 재설계의 “커밋 푸시” 권한은 같은 기능의 완료분에 유효하되 이 보완 구현의 검사 전 실행을 뜻하지 않는다.
- 시작 source는 `0c96b805f345b4d8fadcb6c7079bab69f4fa392f` (`master`)다. 시작 dirty `docs/features/trusted-approval/`, `harness-map/`은 다른 작업 소유다. `git ls-remote origin refs/heads/master`로 같은 SHA를 확인했다. 이는 **이전 AR-04~06 완료분의 전달 상태**이며 이번 보완의 통과 또는 전달 증거가 아니다.
- G2/G3 기술 선택: 기존 평가 CLI와 fixture를 유지하면서 의미 필드·record 상태를 검증한다. 기준선은 현재 후보에서 생성하지 않고 원본 source `ae9ff54c33518b77fc0de18feb217660303ac739:scripts/session-handoff.mjs`의 SHA-256 `19823e889fa3e3db7a74b98610f8efbe8fd4412248860d7cf313b4176b84aefe`를 고정한다. 앵커 검사기는 현행 범위를 명시하고 범용 파서를 추가하지 않는다. 변경 파일·의존성·STOP·외부 권한을 키우지 않기 위한 AI 판단이며 사용자 직접 기술 선택으로 쓰지 않는다.
- G4 이 문서의 AC·[G5 시나리오](tests/AR-07-scenarios.md)는 구현자와 분리해 검토한다. 계약 감사, Red/Green, 독립 AC, 최종 통합 검사, Git 전달은 각각 별도 증거와 상태로 기록한다. 기존 176/176, 14/14는 역사적 결과다.

## R10 / AR-07 AC1 · 현재 Git 전달 사실

- `progress.md`, 현재 HTML 보고서, `evidence/closure-contract.md`는 이전 완료분의 커밋 `0c96b80`이 로컬 `master`와 `origin/master`에 도달했음을 실제 Git 조회로 표시한다. 이전의 “커밋·푸시 아직 실행 전” 문구는 현재 상태에서 바로잡는다.
- 당시 감사 문구와 `evidence/closure-final-review.md`의 작성 시점 상태는 보존한다. 현재 상태 문장은 작성 시점의 과거 사실을 현재 미실행으로 오독하지 않게 시제를 명시한다. 후행 보완의 로컬 변경·검사·Git 결과는 `0c96b80` 전달 사실과 분리한다.
- G5-01: 로컬 HEAD·branch·origin SHA를 조회해 기록값과 대조한다. G5-02: 역사적 검토 문구의 뜻이 바뀌지 않았고 현재 보고서에 미실행 오기가 없는지 검색한다. 원격 조회 실패나 SHA 불일치는 완료로 표시하지 않는다.

## R11 / AR-07 AC2 · 평가 의미 oracle

- 동일 입력 평가에서 operation/case별로 계약상 존재하는 안정 필드만 선택한다: `result.decision/reason/resume_condition/budget/next_skill/next_action/transfer/handoff_id/idempotent/launch_allowed`, `transition.changed`, `transition.record`의 `status/sequence/checkpoint.next_action/task.used_rollovers/budgets.green.used/budgets.diagnostic.used/budgets.rework_count/rollover.claim/rollover.receipt`. `source` hash/path, notice/instruction/prompt/time 등 CLI 장식은 비교 대상에서 제외한다. 전달한 입력 객체와 config 파일의 불변성을 확인하며, 정상 `claim`/`receipt`가 저장하는 record 전이와 구분한다. 기존 STOP·승인 경계를 바꾸거나 기대값을 구현 결과에 맞춰 완화하지 않는다.
- 역사 CLI 캡처 전 `git cat-file -p ae9ff54c33518b77fc0de18feb217660303ac739:scripts/session-handoff.mjs | shasum -a 256`로 원본 바이트의 위 SHA를 재확인한다. Git 고정 CLI와 코어를 격리 fixture 저장소에서 실제 `prepare|decide|claim|receipt`로 실행하고 stdout/stderr/종료 코드/state 전후를 원시 증거로 보존한다. evaluator는 별도로 baseline의 provenance와 schema를 검증한다. 독립 expected semantic observation, 역사 CLI 관찰, 현재 후보 관찰을 case별로 구분한다. 기존 v1의 decision-only 14건은 역사 자료이며 새 의미 비교에는 불충분하므로 v2 관찰을 새로 캡처하고 원본 자료는 보존한다.
- case별로 operation이 반환해야 하는 필드의 존재·타입·`null` 허용 여부와 record 전후값을 사전에 고정한다. 의미값은 깊은 값 비교를 하고 객체 키 순서만 무시한다. 누락과 `null`, `false`와 `0`, `undefined`와 빈 문자열을 서로 정규화하지 않는다. 현재값·expected·baseline의 누락/형식 오류 또는 의미 차이는 필드 경로를 표시하며 비영(非零) 종료한다. 원본 SHA 불일치·실행 불가도 비교 불가로 종료한다. 현재 후보 출력을 기준선으로 쓰거나 누락 필드를 같은 값으로 간주하지 않는다.
- G5-03: 고정 CLI와 현재 후보의 동일 fixture에 대해 위 의미 필드와 case별 고정 expected를 비교하고 종료 코드·건수를 기록한다. G5-04: baseline drift, 후보 mismatch, 기준선 누락, 해시 불일치, 필드 누락·타입/`null` 오류, 동일 `decision` 속 `idempotent`·`next_action`·record `status`·counter 차이에서 비영 종료와 필드 경로를 확인한다. G5-05: 성공·STOP·재실행에서 `record` 상태·카운터·claim/receipt 전후값, 입력 객체·config 파일 불변, 실패 때 record 무변경을 확인한다.

## R12 / AR-07 AC3 · 앵커 검사기 지원 경계

- 현행 검사기의 ATX 제목, GitHub 방식의 제한된 slug·중복 처리, 명시적 Markdown 앵커와 정적 HTML `id` 범위를 `docs/harness/coverage.md`에 적는다. Setext 제목, 런타임 DOM 생성 등 비지원 입력은 지원한다고 암시하지 않는다.
- G5-06: 문서 예시와 기존 앵커 회귀를 대조하고, 지원 범위·비지원 범위·유지 판단이 코드의 실제 동작과 맞는지 독립 확인한다. 새 범용 Markdown/HTML 파서나 의존성은 넣지 않는다.

## 실행·STOP

- 허용 범위는 계약·진행 기록·현재 HTML·coverage·증거와 별도 작업자의 평가 코드/fixture다. 기존 승인·record/approval/STOP·예산·runtime core 계약은 변경하지 않는다. 새 보안·외부 권한, 원본 CLI 해시·입력 불일치, 독립 감사 실패, 진전 없는 반복에서는 증거와 재개 조건을 남기고 멈춘다.
- 관련 검사 → 실패 수정·재검사 → 가능한 전체 `npm run check` 1회와 독립 G4/G5·AC 판정을 분리한다. 이 문서 작성 시 구현·이번 검사·후행 Git 작업은 아직 미실행이다.
