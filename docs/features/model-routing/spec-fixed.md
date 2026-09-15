# Model Routing / Escalation 확정 요구사항

- 상태: G1 확정.
- 승인 근거: 2026-09-15, 사용자가 B안과 포함·제외 범위 질문에 `승인해요`라고 답함.
- 원문: [spec-original.md](spec-original.md)

## 목적·주 사용자

cc-harness를 운영하는 main orchestrator가 작업 역할에 맞는 모델 capability를 요청하고, 실패를
분류해 유한한 retry·diagnostic·사용자 gate·STOP 중 하나로 보내며, 이후 독립 검증까지 추적한다.
신규 프로젝트뿐 아니라 기존 하네스 프로젝트의 RESUME과 legacy 프로젝트의 최소 ADOPT 뒤에도
같은 계약을 적용한다.

## 기본 사용 시나리오

1. 승인된 이슈를 default worker가 수행한다. 국소 구현 실패라면 남은 기존 Green 예산 안에서
   재시도하고, 성공하면 독립 verifier로 넘긴다.
2. architecture uncertainty, cross-module dependency 또는 unknown runtime behavior가 확인되면 이슈당
   최대 한 번 diagnostic에게 읽기 전용 진단을 요청한다. 진단 뒤 새 worker가 구현하며 verifier는
   구현자와 분리한다.
3. 기존 프로젝트를 RESUME하거나 legacy 프로젝트를 ADOPT할 때 실제 자산·승인·증거를 조사하고
   마지막 유효 checkpoint 또는 사용자 승인 baseline 이후부터 routing policy를 적용한다.

## 요구사항

| ID    | 동작·제약                                                                                                                                                                                                                    | 결정 근거                       | 확인 방법                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------- |
| MR-01 | 모델 capability와 harness capability를 분리한다. 하네스가 모델 자체 능력을 바꾼다고 주장하지 않는다.                                                                                                                         | 최초 요청                       | 문서 계약 검토                  |
| MR-02 | 역할은 `default_worker`, `diagnostic`, `verifier`로 정의하며 초기 요청값은 각각 Sol/medium, Astra/high, Sol/high다. 역할은 미래 모델로 교체 가능해야 한다.                                                                   | 승인된 B안                      | 역할 표와 결과 증거 검토        |
| MR-03 | 현재 Codex의 기존 subagent 도구로 역할별 model/effort를 요청한다. 독립 실행 엔진·YAML·전역 config를 추가하지 않는다.                                                                                                         | 승인된 B안과 최소 추상화 원칙   | 변경 파일과 설치 자산 검토      |
| MR-04 | 요청한 model/effort와 실행에서 관찰한 model/effort를 별도로 기록하고 metadata가 없으면 `unknown`으로 둔다.                                                                                                                   | 거짓 기록 금지                  | 결과 JSON/progress fixture      |
| MR-05 | Green 총 시도 예산은 `min(3, 1 + 사용자가 승인한 retry 수)`다. diagnostic 실패도 이슈당 1회 예산을 소비한다.                                                                                                                 | 기존 최대 3회와 승인된 B안      | 예산 경계 fixture               |
| MR-06 | 새 context, model 변경, resume으로 retry·diagnostic counter를 초기화하지 않는다.                                                                                                                                             | 유한 retry·무한 escalation 금지 | 연속 실행 fixture               |
| MR-07 | diagnostic은 읽기 전용으로 원인·근거·권고 계획만 반환한다. 진단 뒤 구현은 새 default worker가 수행한다.                                                                                                                      | 승인된 B안                      | 역할별 허용 변경 검토           |
| MR-08 | STOP과 user gate를 routing보다 먼저 판정한다. no-progress 또는 Green 3회 실패 후에는 escalation하지 않는다.                                                                                                                  | 기존 계약 보존                  | 우선순위 fixture                |
| MR-09 | 분류는 `LOCAL_IMPLEMENTATION_ERROR`, `ARCHITECTURE_UNCERTAINTY`, `CROSS_MODULE_DEPENDENCY`, `UNKNOWN_RUNTIME_BEHAVIOR`, `REQUIREMENT_AMBIGUITY`, `BROKEN_ENVIRONMENT`, `EXTERNAL_TOOL_FAILURE`, `SECURITY_BLOCK`을 사용한다. | 최초 요청과 B안                 | 각 분류 fixture                 |
| MR-10 | 요구사항·아키텍처·범위·비용·파괴적/production 변경·새 외부 권한은 user gate로 보낸다.                                                                                                                                        | 최초 요청                       | gate fixture                    |
| MR-11 | failure identity는 failure class만이 아니라 명령·실패 signature·tool version·scope를 포함한다. 같은 정체성의 무진전 반복을 모델 교체로 우회하지 않는다.                                                                      | 승인된 최소 ratchet 원칙        | no-progress fixture             |
| MR-12 | verifier는 구현자와 분리하고 승인 AC와 실제 증거를 검토한다. 모델 지정 성공만으로 독립성을 주장하지 않는다.                                                                                                                  | 기존 필수 역할 분리             | 결과 JSON과 agent evidence 검토 |
| MR-13 | `harness-cycle`은 NEW·ADOPT·RESUME을 구분하되 새 CLI를 만들지 않는다.                                                                                                                                                        | 승인된 B안                      | lifecycle/skill 계약 검토       |
| MR-14 | RESUME은 기존 승인·spec·PRD/ADR·issue·progress·제품 코드·project-owned 설정/AGENTS·유효 증거를 보존한다.                                                                                                                     | 추가 요청                       | reconcile fixture               |
| MR-15 | registry에 등록되었다는 이유만으로 설치 자산을 managed로 단정하지 않는다. source revision과 contract hashes로 동일성을 확인하고 customized 충돌은 diff와 user gate로 보낸다.                                                 | 승인된 최소 upgrade 경계        | 설치 충돌 회귀 fixture          |
| MR-16 | 현재 installer의 충돌 시 전체 쓰기 중단을 유지한다. `--upgrade`, manifest, 3-way 자동 병합은 이번에 구현하지 않는다.                                                                                                         | 승인된 G3 범위                  | 이식 회귀 검사                  |
| MR-17 | progress/결과 증거에 source revision, contract hashes, `policy_effective_checkpoint`, 유효·무효 evidence와 이유를 기록한다.                                                                                                  | 추가 요청                       | 템플릿과 fixture                |
| MR-18 | 과거 routing 필드가 없는 증거는 그 이유만으로 무효가 아니다. routing policy는 유효 checkpoint 이후 단계부터 적용한다.                                                                                                        | backward compatibility          | legacy evidence fixture         |
| MR-19 | ADOPT discovery는 runtime·구조·경계·검사·CI/CD·Git·문서·기존 결정·현재 작업·기술부채를 `CONFIRMED/DOCUMENTED/INFERRED/UNKNOWN`으로 기록한다.                                                                                 | 추가 요청                       | discovery fixture               |
| MR-20 | Adoption Baseline은 사용자 승인을 받아야 하며 AI 추론을 과거 승인/ADR로 기록하지 않는다.                                                                                                                                     | 추가 요청                       | baseline gate fixture           |
| MR-21 | 과거 부채 자체는 adoption blocker가 아니다. security/data-loss/broken-environment STOP은 그대로 적용한다.                                                                                                                    | 추가 요청                       | debt/STOP fixture               |
| MR-22 | ratchet는 단순 개수뿐 아니라 failure identity·명령·tool version·scope를 비교한다. 필수 gate 실패를 baseline으로 pass 처리하지 않는다.                                                                                        | 승인된 최소 adoption 경계       | ratchet fixture                 |
| MR-23 | 진행 중 legacy 작업의 AC 재구성은 제안 → 사용자 승인 → 독립 검증 순서를 지킨다.                                                                                                                                              | 추가 요청                       | current-work fixture            |
| MR-24 | auto-loop의 uncommitted STOP과 Refactor 전체 테스트 실패 STOP을 완화하지 않는다. dirty 상태에서는 discovery/계획만 가능하고 자동 실행은 STOP한다.                                                                            | 기존 절대 계약                  | 기존 회귀+fixture               |
| MR-25 | 범용 discovery 자동수집, 기존 실패 허용 자동실행 프로필, 자동 upgrade는 후속 ADR 후보로 남긴다.                                                                                                                              | 승인된 G3 범위                  | Out of Scope 대조               |

## 용어 정의

| 용어                        | 의미                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| model capability            | 선택된 모델 자체가 제공하는 추론·생성 능력                          |
| harness capability          | 승인·역할 분리·검증·예산·STOP·증거를 조직하는 실행 계약             |
| requested model/effort      | orchestrator가 subagent 생성 때 요청한 값                           |
| observed model/effort       | 실행 metadata에서 직접 확인된 값. 없으면 `unknown`                  |
| failure identity            | failure class, 명령, 실패 signature, tool version, scope의 조합     |
| policy effective checkpoint | 새 routing 정책을 처음 적용하는 유효한 단계 경계                    |
| NEW                         | 새 프로젝트의 하네스 진입                                           |
| ADOPT                       | 하네스를 처음 적용하는 기존 프로젝트의 baseline 진입                |
| RESUME                      | 하네스를 이미 쓰는 프로젝트의 재개 또는 호환 업데이트               |
| Harness-managed             | source revision과 contract hash로 원본과 동일함이 확인된 배포 자산  |
| Project-owned               | 제품 코드·기능 문서·설정·AGENTS 등 프로젝트가 소유하는 자산         |
| Shared/customized           | 배포 자산 경로에 있으나 원본과 hash가 달라 자동 덮어쓸 수 없는 자산 |

## 오류·경계·저장·성능

- 상태는 기존 `progress.md`와 단계 결과 JSON에 기록한다. 별도 DB/config를 추가하지 않는다.
- 결과 JSON 파싱 실패, metadata 부재, 증거 누락은 성공으로 간주하지 않는다.
- failure class가 불명확하면 증거를 `UNKNOWN_RUNTIME_BEHAVIOR` 또는 해당 STOP으로 보수적으로 기록하며,
  새로운 요구사항 결정을 diagnostic이 대신하지 않는다.
- 응답 시간·토큰 절감 수치는 보장하지 않는다. 실제 backend model과 model token 사용량을 관찰하지
  못하면 `unknown`으로 남긴다.

## 미정·제외 범위

- G4 이슈 목록·AC와 G5 테스트 계약·시나리오는 검토 대기다.
- 실제 auto-loop 실행 권한, 구현, 커밋·push·PR·외부 작업은 승인되지 않았다.
- 상세 제외 범위와 후속 ADR 후보는 [prd.md](prd.md)에 둔다.

## Adaptive Execution NOW 구현 범위

- 승인 근거: [구현 승인 원문](approval-implementation-original.md). 이번 정책은 total project cost의 절감이나 성능 향상을 주장하지 않고, 이후 비교 가능한 evidence를 남기는 첫 계약이다.
- Process Routing은 `compact`/`standard`/`intensive`의 절차 깊이를 고르고, Model Routing은 그 안의 `default_worker`/`diagnostic`/`verifier` 역할 요청을 고른다.
- compact는 관련 호출·계약·의존성으로 local blast radius가 확인된 경우에만 가능하다. 파일 수와 diff 크기는 주 기준이 아니며 영향 불명확·security·data·authority·STOP 계약은 standard 이상 또는 user gate다.
- profile은 worker, 독립 verifier, 필수 검사, Green/diagnostic 예산을 생략하지 않는다. diagnostic은 읽기 전용이고, 진단 뒤 새 worker가 구현한다.
- MSC는 승인 목표, 허용 범위, revision/dirty hash, 관련 contract/file, 검사·STOP·예산, checkpoint, evidence와 반환 형식이다. JIT는 얕은 구조→현재 변경→직접 dependency/test/interface/doc 순서다.
- Evidence Reuse는 low-cost metadata/version/hash/command/checkpoint로 relevant code·contract/AC·test·command·environment가 모두 같은지 먼저 확인한다. 불확실한 부분만 재탐색 또는 재검증하며 관련 변경만 무효화한다.
- NEW/ADOPT/RESUME은 source revision·contract hash·policy effective checkpoint와 evidence validity를 기록한다. 과거 routing field가 없는 evidence는 `legacy-unknown`으로 보존한다.
- execution metadata는 requested/observed model·effort, profile, retry/diagnostic/rework, verification, outcome, usage value/source/unit/coverage를 남긴다. metadata가 없는 값은 `unknown`이고 이번에는 collector·router·learning·upgrade를 추가하지 않는다.
