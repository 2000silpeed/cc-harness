# Model Routing / Adaptive Execution 구현 이슈

- PRD·범위 승인 근거: [prd.md](prd.md), [구현 승인 원문](approval-implementation-original.md)
- 상태: 사용자 명시 범위 안의 하네스 유지보수. 이 문서는 이슈를 새로 승인받았다고 주장하지 않는다.

| ID        | 사용자에게 보이는 결과                                                                             | 선행 이슈 | 크기 판단                   | 상태 | 외부 URL |
| --------- | -------------------------------------------------------------------------------------------------- | --------- | --------------------------- | ---- | -------- |
| MR-IMP-01 | 기존 하네스가 Adaptive Execution과 Model Routing의 증거·재개·이식 계약을 문서로 일관되게 제공한다. | 없음      | 승인된 8파일 문서 계약 변경 | 완료 | 없음     |

## MR-IMP-01 — 최소 Adaptive Execution 계약을 기존 하네스에 연결

### 목적·범위·PRD 요구사항

MR-01~MR-25에 필요한 Process Routing, role-based Model Routing, MSC, JIT, Evidence Reuse, NEW/ADOPT/RESUME 및 metadata 계약을 기존 문서와 스킬에 기록한다. 새 router/config/collector/learning/upgrade runtime은 제외한다.

### Acceptance Criteria

- [x] AC-01: Given 승인된 작업이 있을 때, When profile을 고르면, Then Process Routing은 `compact`/`standard`/`intensive`를 기록하고 Model Routing은 그 안의 역할 요청으로 기록한다.
- [x] AC-02: Given 한 줄 권한 변경 또는 영향이 불명확한 변경이 있을 때, When profile을 고르면, Then file count/diff size와 무관하게 compact를 거부하고 standard 이상 또는 user gate로 올린다.
- [x] AC-03: Given Green 3회 실패 또는 no-progress가 있을 때, When escalation을 검토하면, Then STOP이 먼저이고 독립 verifier, 유한 Green/diagnostic 예산, requested/observed 분리는 유지된다.
- [x] AC-04: Given 이전 verification evidence가 있을 때, When version/hash/command/checkpoint로 relevant code·contract/AC·test·command·environment 모두 일치하면, Then 추가 탐색·테스트 없이 재사용한다; 하나라도 불명확하거나 environment만 바뀌면 영향 검사만 재검증한다.
- [x] AC-05: Given ADOPT/RESUME에 routing field 없는 과거 evidence나 customized asset이 있을 때, When reconcile하면, Then legacy evidence와 project-owned 자산은 보존하고 effective checkpoint 이후만 새 policy를 적용하며 customized 충돌과 필수 STOP을 완화하지 않는다.
- [x] AC-06: Given execution metadata가 없거나 profile별 결과를 비교해야 할 때, When result example을 읽으면, Then requested/observed model·effort, profile, retry/escalation, verification, rework, outcome, usage value/source/unit/coverage가 valid JSON으로 존재하고 미관찰 값은 `unknown`이다.
- [x] AC-07: Given target에 project-owned 파일 또는 customized registered file이 있을 때, When installer를 apply하면, Then 전자는 보존하고 후자는 아무 registered file도 쓰지 않고 충돌한다.

### 의존성

기존 registry, installer와 harness portability regression.

### 테스트 접근·예상 변경 범위

`tests/unit/harness-portability.test.ts`에 project-owned 보존과 canonical JSON example 파싱을 추가한다. profile 의미·blast radius·STOP은 정적 문구만으로 실제 agent 행동을 증명하지 않으며, 별도 orchestration trace에서 관찰한다.

### 제외 범위·위험

runtime router, 자동 model upgrade, usage 수집·집계, learning, installer upgrade, PR/commit/push는 범위 밖이다.
