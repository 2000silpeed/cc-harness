---
name: tdd-auto-loop
description: 승인된 이슈를 명시적 위임·유한 상한 안에서 자동 반복해 PR 준비까지 진행하도록 요청할 때 사용한다.
---

# 범위가 정해진 반복 자동화

[필수 오케스트레이션 정책](../../../docs/methods/delivery-automation.md#필수-오케스트레이션-정책), delivery의 `## Adaptive Execution: process와 model의 분리`, [자동 승인·STOP·결과 JSON 계약](../../../docs/methods/delivery-automation.md#tdd-auto-loop의-자체-승인과-객관-stop), `docs/harness/lifecycle.md`의 `## 5. 승인과 외부 작업`부터 `## 7. 스킬과 독립 판단 역할`까지를 읽는다. 각 절은 지정 제목부터 다음 같은/상위 수준 제목 직전까지만 선택한다. E2E·PR 절은 그 단계에서만 읽는다.

## 진입

사용자가 자동 반복을 요청했는지 확인하고 repo/feature, 승인 이슈와 의존 순서, 최대 이슈 수, 이슈별 재시도 상한, 외부 작업 범위를 기록한다. 객관 STOP이 이미 확인됐으면 즉시 끝낸다. 상한이 없으면 한 번 질문하고 시작하지 않는다. 자동 위임은 요구사항·아키텍처·범위·이슈·G5 승인이나 외부 권한을 대신하지 않는다.

실제 위임 도구와 구현자와 분리된 verifier가 없으면 자동 모드는 실행하지 않고 정확한 재개 조건을 보고한다. 메인이 대신 구현하지 않는다. profile은 risk evidence로 정하며 worker·verifier·필수 검사·예산을 생략하지 않는다.

MSC에는 승인 목표/범위, revision·dirty hash, 직접 관련 contract/AC/code/test, 명령, STOP·잔여 예산, checkpoint와 evidence 참조만 전달한다. 탐색은 얕은 구조에서 직접 의존성 순으로 넓힌다. 긴 로그는 파일에 두고 결과·실패 정체성·경로만 반환한다.

## 실행과 증거

격리된 단계별 작업자, 구조화 결과, Green 직후 독립 AC 검증, 객관 STOP, 사람의 PR 리뷰를 사용한다. 메인은 passed 표기가 아니라 source revision, contract hash, 실제 명령·종료 코드·실패 결과와 증거를 대조한다. Evidence Reuse는 관련 code·contract/AC·test·command·environment가 같은지 version/hash/checkpoint로 먼저 확인하며, 명령과 실제 결과 확인을 생략하는 뜻이 아니다. 불일치·UNKNOWN만 재탐색/재검증하고 global HEAD 차이만으로 모든 증거를 폐기하지 않는다.

준비된 이슈를 tdd-loop 순서로 수행한다. 실패를 Broken/구현 결함/요구사항 불명확/외부 도구 실패로 분류하고 필수 STOP을 복구 반복보다 먼저 적용한다. 승인 범위의 국소 결함만 남은 예산 안에서 고치며 테스트·AC를 완화하거나 원격 작업을 중복 생성하지 않는다.

## STOP과 예산

delivery 계약의 필수·실행 안전 STOP 전체를 실행 전과 각 단계 전후에 적용한다. Green은 누적 최대 3회(사용자 상한이 낮으면 그 값), 읽기 전용 diagnostic은 이슈당 누적 1회다. 새 context/model/RESUME으로 counter를 초기화하지 않는다. Refactor는 대상의 전체 회귀 명령이 통과하지 않으면 STOP이며 일부 테스트로 대신하지 않는다.

diagnostic은 STOP/gate가 없고 정상 환경·승인 범위·남은 Green/diagnostic 예산·새 근거가 있을 때만 원인/가설/계획을 반환한다. 승인된 architecture 안의 usable plan과 Green 예산이 있어야 새 worker가 구현한다. 새 architecture는 user gate, diagnostic 실패·unknown·no-progress는 STOP이다.

사용자 판단, 선행 미완료, 충돌, 보안 차단, 진전 없음, 예산/이슈 상한 소진, 중단 요청이면 사유·증거·재개 조건을 남기고 실행을 끝낸다. 외부 게시 권한이 없으면 로컬 초안까지만 만든다. 코드 통과를 E2E·CI·머지·배포 완료로 바꾸지 않는다.

## 결과

결과는 delivery의 JSON 계약을 사용해 다음을 보존한다: requested/observed model·effort, profile/reason/risk, context scope, verification depth/scope, reuse checks, role/context id, retry/diagnostic/rework, failure identity, outcome/next action, policy checkpoint, source revision·contract hashes·evidence validity, usage value/source/unit/coverage. 관찰하지 못한 값은 `unknown`, 실행하지 않은 값은 `not-run`이다.

보고에는 시도/완료/실패 이슈, 단계 증거, 승인된 실제 외부 행동, 정확한 STOP과 재개 조건을 포함한다. 유한 상한과 STOP은 자동 승인 장치가 아니다.
