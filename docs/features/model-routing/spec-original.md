# Model Routing / Escalation 최초 요청

추가 Adaptive Execution 원문은 [spec-adaptive-original.md](spec-adaptive-original.md)에 보존한다.

## 최초 요청 1

# cc-harness Model Routing / Escalation 기능 구현

현재 저장소는 cc-harness 자체다.

먼저 `AGENTS.md`, `README.md`, `docs/harness/lifecycle.md`, `docs/methods/delivery-automation.md`, `.agents/skills/tdd-auto-loop/SKILL.md` 및 관련 스킬/테스트를 읽고 현재 하네스의 철학과 실행 계약을 파악하라.

이번 목표는 단순히 모델 이름을 설정 파일에 추가하는 것이 아니다.

## 목표

cc-harness에 **Model Routing / Escalation Contract**를 설계하고 구현한다.

핵심 아이디어는:

> 강한 모델을 모든 작업에 사용하는 대신, 기본 개발 작업은 비용·속도 효율적인 모델이 수행하고 복잡한 판단이 필요한 순간에만 상위 reasoning 모델로 escalation한다.

예상 기본 구조:

```text
Main Orchestrator
        │
        ▼
Default Worker
(GPT-5.6 Sol)
        │
        ├─ success ───────────────→ verification
        │
        └─ failure
             │
             ▼
       failure classifier
             │
     ┌───────┼─────────┬──────────┐
     ▼       ▼         ▼          ▼
 local    architecture cross-    requirement
 error    uncertainty  module     ambiguity
     │       │         │          │
     ▼       └────┬────┘          ▼
 retry            ▼             USER GATE
 5.6          Astra diagnostic
                  │
                  ▼
             diagnosis/plan
                  │
                  ▼
             5.6 worker
                  │
                  ▼
          independent verifier
```

단, 위 구조를 그대로 구현하라는 뜻은 아니다.

**현재 cc-harness의 기존 계약과 실제 Codex 기능을 조사한 뒤 가장 단순하고 재사용 가능한 구조로 설계하라.**

## 중요한 설계 원칙

모델 라우팅은 기존 하네스의 다음 원칙을 절대 약화시키면 안 된다.

- 요구사항 승인
- 아키텍처 승인
- 범위 승인
- 이슈 승인
- 독립 검증
- 유한 retry
- 객관적 STOP
- 사용자 gate
- 외부 작업 권한
- 증거 기반 검증

특히 escalation을 **STOP 조건을 우회하는 방법**으로 사용하면 안 된다.

## 조사할 것

구현 전에 현재 Codex에서 실제로 가능한 다음 기능을 확인하라.

1. main agent가 worker/subagent별 모델을 명시적으로 선택할 수 있는가
2. reasoning effort를 역할별로 선택할 수 있는가
3. subagent 생성 시 model inheritance가 어떻게 동작하는가
4. 현재 Codex CLI/App에서 지원하는 모델 선택 방법
5. skill/AGENTS/config 중 어느 계층에서 routing policy를 정의하는 것이 적절한가
6. 런타임에서 실제 model routing이 불가능하다면 어떤 부분까지 contract/policy로 구현해야 하는가

지원 여부를 추측하지 말고 실제 사용 가능한 기능과 저장소 상태를 근거로 판단하라.

## Escalation 후보

다음은 초기 가설이다.

### Default worker

일반 구현은 GPT-5.6 Sol 수준의 모델을 기본으로 한다.

예:

- feature implementation
- test 작성
- 작은 bug fix
- refactor
- documentation
- 일반적인 AC verification

### Retry

local implementation error라면 동일 worker가 제한된 횟수 안에서 수정한다.

예:

```text
implementation failure
→ classify
→ local implementation error
→ retry
```

retry 횟수는 기존 `tdd-auto-loop`의 유한 retry 계약과 통합해야 한다.

새로운 무제한 retry 시스템을 만들지 않는다.

### Escalation

다음과 같은 상황에서는 상위 reasoning 모델의 진단을 고려한다.

- architecture uncertainty
- cross-module dependency
- 반복 실패
- 원인이 불명확한 runtime behavior
- 복잡한 integration failure
- 현재 접근법 자체의 재검토가 필요한 경우

중요:

상위 모델은 가능하면 **전체 구현을 대신하는 worker가 아니라 diagnostic/reasoning 역할**을 한다.

예:

```text
5.6 worker
   ↓
failure
   ↓
Astra diagnostic
   ↓
diagnosis + recommended plan
   ↓
5.6 worker implementation
```

즉 비싼 reasoning 모델의 토큰을 최소화하면서 판단 능력을 활용한다.

### User Gate

다음은 모델 escalation으로 해결하지 않는다.

- requirement ambiguity
- scope expansion
- architecture decision requiring user approval
- 비용 발생
- destructive operation
- production 변경
- 새로운 외부 권한 필요

이 경우 기존 사용자 승인 gate로 돌아간다.

## Failure Classification

기존 `tdd-auto-loop`의 실패 분류를 조사하고 필요하다면 다음 개념으로 확장한다.

```text
LOCAL_IMPLEMENTATION_ERROR
ARCHITECTURE_UNCERTAINTY
CROSS_MODULE_DEPENDENCY
UNKNOWN_RUNTIME_BEHAVIOR
REQUIREMENT_AMBIGUITY
BROKEN_ENVIRONMENT
EXTERNAL_TOOL_FAILURE
SECURITY_BLOCK
```

단, enum을 반드시 코드로 만들라는 의미는 아니다.

현재 구조에서 가장 단순한 표현을 선택한다.

## Escalation Budget

상위 모델 호출 역시 유한해야 한다.

예:

```text
worker retry <= N
diagnostic escalation <= M
```

동일 실패를 반복하면서 모델만 바꾸는 무한 escalation을 금지한다.

progress/evidence에 최소한 다음을 남길 수 있어야 한다.

```text
worker_model
reasoning_level
failure_class
retry_count
escalation_count
escalation_reason
diagnostic_result
next_action
```

실제 Codex가 모델 정보를 제공하지 않는다면 거짓으로 기록하지 말고 unknown/unavailable로 처리한다.

## Routing Policy

가능하다면 재사용 가능한 policy를 설계한다.

개념 예:

```yaml
model_policy:
  default_worker:
    model: gpt-5.6
    reasoning: medium

  diagnostic:
    model: gpt-6-astra
    reasoning: high

  verifier:
    model: gpt-5.6
    reasoning: high

  escalation:
    max_worker_retries: 2
    max_diagnostic_escalations: 1
```

이 YAML은 예시일 뿐이다.

현재 cc-harness 구조상 config 파일이 필요 없다면 만들지 않는다.

**새 추상화와 설정을 최소화하라.**

## 중요한 요구사항

이번 기능 때문에 Astra에 종속된 하네스가 되어서는 안 된다.

개념적으로:

```text
default_model
reasoning_model
verification_model
```

역할을 정의하고 실제 모델 이름은 환경/사용자 설정에 따라 변경 가능해야 한다.

예를 들어 미래에는:

```text
default → GPT-X
reasoning → GPT-Y
```

로 교체할 수 있어야 한다.

즉 **모델 이름이 아니라 capability/role 중심 설계**를 우선한다.

## 검증

기존 하네스의 테스트 철학을 그대로 따른다.

필요하다면 다음을 검증한다.

- routing policy parsing
- failure classification
- retry budget
- escalation budget
- STOP 우선순위
- user gate 우선순위
- escalation 이후 worker 복귀
- verifier 독립성
- 기존 tdd-auto-loop regression

기존 테스트를 약화시키거나 삭제해서 통과시키지 않는다.

## 문서

사용자가 이해할 수 있도록 최소한 다음 흐름을 문서화한다.

```text
Cheap execution
      ↓
bounded retry
      ↓
expensive reasoning
      ↓
cheap execution
      ↓
independent verification
```

그리고 다음 두 가지를 명확하게 구분한다.

```text
Model capability
vs
Harness capability
```

하네스가 약한 모델을 강한 모델과 동일하게 만든다고 주장하면 안 된다.

대신 하네스가 planning, verification, retry, escalation을 통해 **최종 개발 결과의 variance와 실패율을 줄이는 구조**라고 설명한다.

## 작업 방식

이 저장소의 `AGENTS.md`를 반드시 따른다.

특히:

- main은 상태/승인/라우팅/증거 통합 담당
- 실제 탐색/수정/테스트는 worker에게 위임
- 구현자와 verifier 분리
- worker의 recursive delegation 금지
- 변경 전 현재 HEAD/dirty state 확인
- 기존 사용자 변경 보존
- 테스트 완화 금지
- STOP 조건 우회 금지

이번 작업 자체가 **cc-harness의 orchestration 기능을 검증하는 dogfooding 작업**이 되도록 하라.

## 진행 방식

바로 구현하지 마라.

먼저 현재 구조와 Codex의 실제 model/subagent 기능을 조사한 뒤 다음을 나에게 제시하라.

1. 현재 구조 분석
2. Codex에서 실제 가능한 model routing 범위
3. 최소 변경 설계안
4. 변경할 파일
5. 기존 계약과 충돌 가능성
6. 테스트 전략
7. 추천안

그 시점에서 멈추고 내 승인을 받아라.

승인 후 cc-harness의 기존 lifecycle/TDD/독립 검증 절차를 사용해 구현한다.

최종적으로:

```text
5.6 default worker
        ↓
bounded retry
        ↓
Astra reasoning escalation
        ↓
5.6 implementation
        ↓
independent verification
```

이라는 패턴을 cc-harness에서 재사용 가능한 **Model Routing / Escalation Contract**로 만드는 것이 목표다.

## 최초 요청 2

## 추가 요구사항: 진행 중 프로젝트에 대한 Harness Upgrade

Model Routing / Escalation 기능은 신규 프로젝트에만 적용되는 기능으로 만들지 않는다.

이미 cc-harness를 사용하여 개발 중인 프로젝트에도 **중간 도입 가능한 backward-compatible upgrade**여야 한다.

다음 상황을 지원해야 한다.

```text
기존 프로젝트
→ 요구사항 승인 완료
→ PRD/ADR 완료
→ 일부 Issue 완료
→ 특정 Issue 작업 중
→ cc-harness 새 버전 적용
→ 기존 상태 reconcile
→ 마지막 유효 checkpoint 탐색
→ 새로운 routing policy를 이후 단계부터 적용
```

업그레이드 과정에서 기본적으로 다음을 보존한다.

- 기존 사용자 승인
- spec-original / spec-fixed
- PRD / ADR
- issue 상태
- progress 기록
- 기존 제품 코드
- 프로젝트 고유 설정
- 프로젝트 고유 AGENTS 지침
- 유효한 테스트/검증 증거

단, 이전 검증 이후 관련 코드나 계약이 변경되어 증거가 더 이상 유효하지 않다면 해당 검증만 다시 수행한다.

과거 lifecycle 전체를 무조건 다시 실행하지 않는다.

### Harness-managed와 Project-owned 자산 분리

현재 install/reuse 구조를 조사하여 다음 자산을 구분할 수 있는지 검토한다.

```text
Harness-managed
Project-owned
Shared / customized
```

하네스 업데이트 시 project-owned 파일을 덮어쓰지 않아야 한다.

충돌이 발생하면 자동 overwrite하지 말고 diff/충돌 내용을 제시하고 사용자 gate로 보낸다.

### Upgrade/Reconcile 동작

가능하다면 다음과 같은 개념을 지원한다.

```text
Harness Update
      ↓
compatibility check
      ↓
managed asset update
      ↓
project state reconciliation
      ↓
last valid checkpoint
      ↓
continue
```

새 model-routing contract는 마지막 유효 checkpoint 이후부터 적용한다.

현재 진행 단계가 Green, AC verification, Refactor, E2E 등 중간 단계라면 실제 증거를 확인하여 가능한 가장 가까운 단계부터 이어간다.

### Version 추적

하네스 버전 또는 설치된 contract 버전을 식별할 최소한의 방법이 필요한지 검토한다.

목적은 단순 버전 표시가 아니라:

- 어떤 하네스 정책으로 작업했는지
- 어떤 시점에 upgrade되었는지
- 이전 증거가 현재 contract에서도 유효한지

판단하기 위한 것이다.

불필요한 package/version 시스템을 만들지 말고 현재 구조에 맞는 가장 작은 방법을 선택한다.

### 중요

이번 Model Routing 구현을 단일 기능 추가로만 보지 말고,

> cc-harness 자체가 발전해도 이미 진행 중인 프로젝트가 안전하게 새로운 capability를 받아들일 수 있는 구조

가 필요한지 함께 검토하라.

단, Harness Upgrade 시스템이 이번 작업의 범위를 과도하게 키운다면 별도 후속 issue/ADR로 분리하고, 이번에는 Model Routing을 중간 적용할 수 있는 최소 compatibility contract까지만 구현하는 안도 제시하라.

기존 설계 분석 결과와 함께 이 요구사항의 구현 범위도 제안하고 사용자 승인을 받은 뒤 진행하라.

## 추가 요구사항: Legacy Project Adoption

cc-harness를 사용하지 않고 이미 개발 중인 기존 프로젝트에도 중간 도입할 수 있어야 한다.

이 경우를 기존 cc-harness 프로젝트의 Upgrade/Resume과 구분하여 **Legacy Adoption**으로 정의한다.

목표는 기존 프로젝트를 cc-harness 방식으로 처음부터 다시 만드는 것이 아니다.

> 현재 프로젝트 상태를 안전하게 baseline으로 확정하고, adoption 이후의 변경부터 cc-harness lifecycle과 model-routing contract를 적용한다.

### Adoption Discovery

도입 시 실제 repository를 조사하여 가능한 범위에서 다음을 파악한다.

- runtime / framework / dependencies
- source structure
- architecture/module boundaries
- tests
- build/lint/typecheck
- CI/CD
- Git 상태
- documentation
- existing ADR/spec/issues
- 현재 진행 중인 feature/branch
- known technical debt

모든 발견은 가능한 경우 다음과 같이 구분한다.

```text
CONFIRMED
DOCUMENTED
INFERRED
UNKNOWN
```

AI의 추론을 기존 사용자 승인이나 역사적 architecture decision으로 기록하지 않는다.

### Baseline

기존 프로젝트의 현재 상태를 Adoption Baseline으로 만들 수 있는 최소 구조를 설계한다.

Baseline 이전의 기술부채는 자동으로 adoption blocker가 되지 않는다.

예:

```text
existing lint warnings: 173
existing failing tests: 2
missing E2E: payment
architecture documentation: partial
```

이를 기존 부채로 기록한다.

새 변경은 가능한 한 baseline을 악화시키지 않는 **ratchet policy**를 적용한다.

예:

```text
baseline warnings = 173

new result <= 173 → 허용 가능
new result > 173  → 새 regression으로 판단
```

단, security blocker, 데이터 손상 위험, 실행 자체가 불가능한 broken environment 등은 기존 STOP 정책을 따른다.

### Adoption 이후

기존 기능 전체를 소급하여 다음 작업으로 변환하지 않는다.

- 모든 요구사항 재작성
- 모든 PRD 재작성
- 모든 ADR 재작성
- 전체 테스트 재작성
- 전체 코드 refactor

대신 adoption 시점 이후 새로 변경하는 feature/issue부터 cc-harness lifecycle을 적용한다.

기존 코드가 새 변경의 직접 dependency인 경우 필요한 범위만 조사하고 테스트/계약을 보강한다.

### Current Work Adoption

현재 feature가 이미 작업 중이라면 실제 상태를 조사하여 가능한 가장 가까운 checkpoint에서 cc-harness 관리로 전환한다.

예:

```text
legacy implementation already exists
        ↓
behavior/test discovery
        ↓
AC reconstruction proposal
        ↓
USER confirmation
        ↓
independent verification
        ↓
remaining lifecycle
```

AI가 기존 구현으로부터 추론한 AC는 사용자 승인 전까지 확정 요구사항으로 취급하지 않는다.

### Entry Modes

현재 lifecycle 구조에서 다음 세 진입 개념이 필요한지 검토한다.

```text
NEW
새 프로젝트

ADOPT
cc-harness를 처음 도입하는 기존 프로젝트

RESUME
이미 cc-harness를 사용하는 프로젝트 재개/업데이트
```

반드시 새로운 CLI 명령을 만들 필요는 없다.

기존 `harness-cycle`에서 상태를 탐지하여 처리하는 것이 더 단순하다면 그렇게 설계한다.

### Model Routing

Legacy Adoption 완료 이후에는 새로운 Model Routing / Escalation Contract를 동일하게 사용할 수 있어야 한다.

즉:

```text
Legacy Project
      ↓
Discovery
      ↓
Baseline
      ↓
User confirmation
      ↓
cc-harness adoption
      ↓
5.6 default worker
      ↓
bounded retry
      ↓
Astra diagnostic escalation
      ↓
5.6 implementation
      ↓
independent verification
```

구조를 지원한다.

### 범위 관리

Legacy Adoption 전체를 이번 Model Routing 작업에 억지로 구현하여 scope를 과도하게 확대하지 않는다.

현재 구조를 조사한 뒤:

1. Model Routing에 필요한 최소 adoption compatibility
2. 범용 Legacy Adoption 기능
3. 향후 Harness Upgrade 기능

으로 나눌 필요가 있다면 ADR/후속 issue로 제안한다.

먼저 설계와 변경 범위를 사용자에게 제시하고 승인받은 뒤 구현한다.
