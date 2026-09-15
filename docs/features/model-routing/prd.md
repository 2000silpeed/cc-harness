# Model Routing / Escalation PRD

- 상태: G1 요구사항, G2 B안, G3 포함·제외 범위와 NOW 구현 위임 승인. G4/G5의 문서 자체를 사용자가 읽고 승인했다고 주장하지 않는다.
- 승인 근거: 2026-09-15 사용자 답변 `승인해요`와 [최신 구현 승인 원문](approval-implementation-original.md).
- 확정 요구사항: [spec-fixed.md](spec-fixed.md)
- 디자인 참조: UI 변경 없음. 디자인 시스템 해당 없음.

## 개요

기존 cc-harness의 subagent 오케스트레이션 계약에 역할별 model/effort 요청, 실패 분류, 유한
diagnostic, 실행 증거를 추가한다. NEW·RESUME·최소 ADOPT 진입을 문서와 스킬로 연결하되 별도 실행
엔진이나 자동 업그레이더를 만들지 않는다.

현재 확인한 기반은 `delivery-automation.md`의 main/worker 분리와 결과 JSON,
`tdd-auto-loop`의 Green 최대 3회와 객관 STOP, `harness-cycle`의 재개 절차,
installer의 same/충돌 전체 중단, Vitest 이식 회귀다. 로컬 CLI는 `codex-cli 0.154.0`이며 현재 세션의
subagent 생성 인터페이스는 model·reasoning effort·fork 범위를 받을 수 있다. 실제 실행 backend
metadata는 제공되지 않아 observed model/effort는 `unknown`이다.

## 사용자 스토리와 요구사항 ID

- 하네스 운영자는 승인된 이슈를 저비용 default worker에 맡기고 필요한 때만 bounded diagnostic을
  호출해 비용·속도와 복잡한 판단을 조정한다. (MR-01~MR-12)
- 기존 하네스 프로젝트 운영자는 유효 승인·증거를 보존하면서 마지막 checkpoint 이후부터 새
  routing 계약을 적용한다. (MR-13~MR-18)
- legacy 프로젝트 운영자는 실제 현황을 baseline으로 승인하고 이후 변경부터 하네스와 routing을
  적용한다. (MR-19~MR-25)

## 기술 대안 비교

| 기준              | 안 A: 문서 설명만 추가                     | 안 B: 기존 문서·스킬·템플릿 계약 확장                                             | 안 C: 새 router/config/upgrade 엔진                                     |
| ----------------- | ------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 데이터 구조       | 서술만 추가, 결과 필드 표준 없음           | 기존 progress/결과 JSON에 routing·revision·checkpoint 필드 추가                   | 새 YAML/manifest와 실행 상태 저장소 추가                                |
| API 레이어 변경점 | 없음                                       | 기존 subagent 호출 입력과 결과 JSON 계약만 확장                                   | 별도 router CLI/API와 config parser 필요                                |
| 상태관리 변경점   | 현재 상태 필드 유지                        | 기존 progress 원장에 누적 counter·evidence validity 기록                          | 별도 routing/upgrade state machine 필요                                 |
| 핵심 동작         | 사람이 임의로 모델 선택                    | main이 STOP/user gate 우선 판정 후 기존 도구로 역할 요청; diagnostic 뒤 새 worker | 엔진이 분류·spawn·upgrade·reconcile 자동 실행                           |
| 컴포넌트 구조     | 설명 문단만 변경                           | delivery/lifecycle/reuse/templates와 두 스킬, portability test·verification 갱신  | 신규 config, parser, router, installer upgrade, manifest, 테스트 다수   |
| 기존 패턴 일관성  | 계약·증거가 부족해 기존 JSON 흐름과 느슨함 | 기존 문서 중심 하네스, 격리 subagent, STOP, installer fail-closed 패턴과 일치     | 제품 앱 없는 하네스에 독립 런타임 도입                                  |
| 테스트 용이성     | 문서 정적 검사만 가능                      | 기존 Vitest 이식 fixture와 contract/agent evidence를 분리해 검증 가능             | parser·state machine 단위 검사는 쉽지만 실제 backend 관찰은 여전히 별도 |

## 기술 결정: 기존 오케스트레이션 계약에 역할·증거를 확장한다

### Context

cc-harness는 실행 엔진이 아니라 재사용 가능한 스킬·방법론·검사 자산이다. 이미 main이 subagent를
배정하고 결과 JSON을 검증하며 Green 3회, 독립 AC, STOP과 사용자 gate를 보존한다. 진행 중 프로젝트와
legacy 프로젝트도 과거 상태를 파괴하지 않고 새 정책을 이후 단계에 적용해야 한다.

### Decision

사용자가 안 B를 승인했다. 기존 `harness-cycle`에 NEW/ADOPT/RESUME 진입을 추가하고,
`delivery-automation.md`와 `tdd-auto-loop`에 역할 기반 model/effort 요청, 실패 분류, 총 Green 예산,
diagnostic 1회, counter·evidence 계약을 추가한다. `templates.md`의 progress/JSON 필드와
`lifecycle.md`·`reuse.md`의 최소 reconcile 계약을 갱신한다. 기존 Codex subagent 도구를 사용하고 새
config·CLI·독립 실행 엔진은 만들지 않는다.

### Alternatives

- 안 A는 변경이 가장 작지만 요청값/관찰값, failure identity, counter, checkpoint 증거가 표준화되지
  않아 재사용 가능한 계약과 backward-compatible 적용을 검증하기 어렵다.
- 안 C는 자동화 범위가 넓지만 현재 installer의 fail-closed 충돌 보존과 문서 중심 하네스 성격을
  크게 바꾸며 `--upgrade`, manifest, 3-way merge, state engine까지 한 번에 요구한다.

### Consequences

- 장점: 기존 구조와 STOP을 유지하며 모델 역할을 교체할 수 있고, routing이 실제로 실행되지 않았거나
  metadata가 없을 때도 정직한 증거를 남긴다.
- 장점: 과거 routing 필드가 없는 증거를 보존하고 policy effective checkpoint 이후만 새 계약을 적용한다.
- 단점: 자동 분류기·자동 업그레이더가 없으므로 main orchestrator의 계약 준수와 독립 검증 evidence가
  필요하다.
- 단점: 문서·fixture 검사는 실제 backend 모델, 추론 품질, 비용 절감을 증명하지 않는다.
- 유지보수: 역할 기본값, 실패 taxonomy, 결과 JSON, lifecycle 문서가 함께 변할 때 계약 hash와 회귀
  검사를 갱신해야 한다.

## Out of Scope

- 별도 model router 실행 엔진, routing policy parser, YAML/config, 전역 Codex 설정 변경.
- installer `--upgrade`, 설치 manifest, 자동 managed 판정, 3-way 자동 병합, 강제 덮어쓰기.
- 범용 discovery 자동 수집기와 모든 framework/CI를 해석하는 adoption 엔진.
- 기존 실패를 자동 허용하는 auto-loop 프로필. baseline은 필수 STOP을 pass로 만들 수 없다.
- 모든 legacy 요구사항·PRD·ADR·테스트·코드의 소급 재작성 또는 전면 refactor.
- 모델 제공자 API 호출, 비용 집계, backend model metadata 생성·추정.
- 새 UI, 앱, 원격 CI, 커밋·push·PR·배포·외부 등록.

## 후속 ADR 후보

1. source revision·contract hash manifest와 안전한 `--upgrade`/3-way merge.
2. 범용 ADOPT discovery 자동 수집과 framework adapter 경계.
3. 기존 실패 baseline을 다루는 별도 실행 프로필과 failure identity 저장 형식.

## 용어 정의

[spec-fixed.md](spec-fixed.md)의 용어를 기준으로 한다. 모델명은 초기 역할 연결이며 capability role과
동일한 영구 식별자가 아니다.

## 검증·위험·미정

- 구현 예정 변경은 승인 제안에 명시된 8개 파일로 제한한다:
  `docs/methods/delivery-automation.md`, `.agents/skills/tdd-auto-loop/SKILL.md`,
  `.agents/skills/harness-cycle/SKILL.md`, `docs/harness/lifecycle.md`, `docs/harness/reuse.md`,
  `docs/harness/templates.md`, `tests/unit/harness-portability.test.ts`,
  `docs/harness/verification.md`.
- G4 승인 전 구현하지 않는다. G5 승인 전 Red/TDD를 시작하지 않는다.
- 시나리오는 executable repository test와 실제 agent behavior evidence를 구분해야 한다.
- 실제 backend model/effort, token/cost/quality 개선은 현재 `unknown`이며 별도 관찰 없이는 주장하지 않는다.
