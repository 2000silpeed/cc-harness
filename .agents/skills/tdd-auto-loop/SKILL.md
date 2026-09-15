---
name: tdd-auto-loop
description: 승인된 이슈를 명시적 위임·유한 상한 안에서 자동 반복해 PR 준비까지 진행하도록 요청할 때 사용한다.
---

# 범위가 정해진 반복 자동화

진입 전에 `docs/harness/lifecycle.md`의 승인·이슈 루프(5–7절), [필수 오케스트레이션 정책](../../../docs/methods/delivery-automation.md#필수-오케스트레이션-정책), [자동 승인·STOP·결과 JSON 계약](../../../docs/methods/delivery-automation.md#tdd-auto-loop의-자체-승인과-객관-stop)을 읽는다. E2E·PR 상세는 해당 단계에서만 읽는다.

## 진입 계약

사용자가 자동 반복을 요청했는지 확인한다. 대상 repo/feature, 이슈 목록과 의존 순서, 최대 이슈 수, 이슈별 수정 재시도 상한, 외부 작업 허용 범위를 먼저 기록한다. 이미 확인된 객관 STOP 조건이 있으면 진입 질문보다 중단이 우선이다. 그렇지 않고 상한이 없으면 한 번 질문하고 자동 모드를 시작하지 않는다. 승인 게이트를 건너뛰는 허가로 해석하지 않는다.

Adaptive Execution을 적용하면 process profile(`compact`/`standard`/`intensive`)과 risk evidence를 먼저 기록하고, Model Routing은 그 profile 안의 worker/diagnostic/verifier 요청으로만 쓴다. profile은 worker·독립 verifier·필수 검사·Green/diagnostic 예산을 생략하지 않는다. 확인된 관련 호출·계약·의존성으로 blast radius가 국소적인 경우만 compact이며, 영향 불명확 또는 security/data/authority/STOP 계약은 standard 이상이나 user gate다. 파일 수나 diff 크기는 판단 기준이 아니다.

## 실행

자동 모드는 격리된 단계별 subagent, 결과 JSON, Green 직후 독립 AC 검증, 객관 STOP, 사람의 PR 리뷰를 사용한다. 실제 위임 도구와 독립 검증자를 사용할 수 있는지 확인한다. 사용할 수 없으면 자동 모드 준비 불가로 보고하고 tdd-loop의 단계별 진행으로 전환할지 확인한다. 스킬 파일로 격리 런타임이 설치됐다고 주장하지 않는다.

각 단계의 결과는 docs/methods/delivery-automation.md의 JSON 계약으로 받는다. 메인은 상태·변경 버전·증거·STOP 조건을 대조한다. 결과의 passed 표기만 믿지 않는다. 명시된 자율 위임 안의 기술 판단은 매번 사용자에게 묻지 않되, 요구사항·아키텍처·범위·이슈 승인은 바꾸지 않는다.

MSC에는 승인 목표·허용 범위·revision/dirty hash, 직접 관련 파일/contract, 검사·STOP·남은 예산, checkpoint와 evidence만 전달한다. JIT 탐색은 얕은 구조 → current change area → 직접 dependency/test/interface/doc 순서이며 확대 근거가 필요하다. Evidence Reuse는 version/hash/command/checkpoint로 same relevant code + contract/AC + test + command + environment를 먼저 확인한다. 확인하지 못한 부분만 재탐색하거나 재검증하며 global HEAD 차이만으로 전체 증거를 폐기하지 않는다.

## STOP 프로필

위 자동 승인·STOP 계약의 조건 전체를 실행 전에 확인하고 각 단계 전후에 적용한다. Green은 최대 3회이며 사용자 상한이 더 낮으면 그 값을 따른다. Refactor는 대상 프로젝트의 전체 회귀 테스트 명령이 미통과이면 STOP이며 관련 테스트 일부 통과로 대체하지 않는다. 필수 STOP은 국소 복구보다 우선하고, 외부 게시 권한이 없으면 로컬 초안까지만 준비한다.

STOP은 계속할지 반복해서 묻는 대기가 아니라 로그·재개 조건을 남기고 해당 실행을 끝내는 상태다. 이슈 코멘트도 승인된 경우만 게시한다. 재실행은 입력 보강과 사전 점검부터 한다.

## 반복과 인계

1. 준비된 이슈만 선택하고 tdd-loop의 단계 순서와 증거를 유지한다. 자동 모드의 기술 검토는 유효한 자율 위임과 객관 조건으로 처리한다.
2. 각 단계가 실패하면 Broken/구현 결함/요구사항 불명확/외부 도구 실패를 분류한다.
3. 객관 STOP 조건이 복구 반복보다 우선이다. STOP 이전 허용 구간에서만 승인된 범위의 국소 결함을 남은 재시도 안에서 고친다. 재시작으로 실패 횟수를 초기화해 우회하지 않는다. 테스트·AC를 완화하거나 원격 작업을 중복 생성하지 않는다.
4. 한 이슈 완료 후 progress·review·PR 결과를 기록하고 명시된 다음 이슈로 간다.
5. 사용자 판단 필요, 선행 미완료, 충돌, 차단 보안 발견, 진전 없음, 재시도 소진, 이슈 상한, 사용자 중단 요청이면 즉시 안전하게 인계한다.
6. 모든 이슈 코드가 통과해도 E2E·CI·머지·배포를 자동 완료로 바꾸지 않는다.

보고: 시도/완료/실패 이슈, 단계 증거, 승인된 실제 외부 행동, 정확한 정지 이유와 재개 조건. 유한 상한과 정지 조건은 재사용 안전성을 위한 보강이며 자동 승인 장치가 아니다.

결과에는 requested/observed model·effort, profile/reason/risk flags, context scope, verification depth/scope, reuse checks, role/context id, retry/diagnostic/rework, failure identity, outcome/next action, policy checkpoint, usage value/source/unit/coverage를 남긴다. 관찰되지 않은 model/usage는 `unknown`이며 새 context·model·RESUME으로 counter를 초기화하지 않는다. diagnostic은 이슈당 1회까지 읽기 전용 원인·가설·계획만 반환하고 성공·실패 모두 예산을 소비한다. 승인된 architecture 안의 usable plan과 남은 Green 시도가 있을 때만 새 worker가 구현을 재개한다. diagnostic 실패·unknown·no-progress는 STOP이고, 새 architecture 결정은 user gate다.
