---
name: harness-cycle
description: 전체 프로젝트 진행·재개를 요청하면 현재 단계와 승인 근거에 맞는 하네스 스킬로 연결한다.
---

# 전체 사이클 진행

[필수 오케스트레이션 정책](../../../docs/methods/delivery-automation.md#필수-오케스트레이션-정책)과 `docs/harness/lifecycle.md`의 `## 3. 대상과 하네스 위치`를 먼저 읽는다. 절은 지정 제목부터 다음 같은/상위 수준 제목 직전까지 선택한다. 실제 탐색·산출물·검사는 작업자에게 배정한다.

mode 판별에는 lifecycle의 `## 4. 재개 가능한 기록`만 추가한다. ADOPT/RESUME이면 delivery의 `## Adaptive Execution: process와 model의 분리`도 읽는다. checkpoint 확정 뒤 `## 1. 전체 실행 지도`에서 현재 단계 행을 찾고 그 단계 SKILL/절만 읽는다. 승인 판단 때만 `## 5. 승인과 외부 작업`, 작성 때만 templates의 해당 제목을 선택한다.

## 실행

1. NEW/ADOPT/RESUME과 하네스·대상 경로를 기록한다. 스킬 등록을 제품 실행으로 보거나 새 CLI를 만들지 않는다.
2. NEW는 원본 요청·목적·사용자·성공 조건을 보존한다. ADOPT/RESUME은 기존 승인·spec·ADR·issue·progress·code/config/AGENTS·evidence를 보존하고 인터뷰를 임의로 반복하지 않는다.
3. RESUME은 progress/manifest/snapshot 존재와 source revision·dirty hash·변경 소유·contract hash·effective checkpoint를 먼저 대조한다. 요약만 신뢰하지 않고 유효성 판정에 필요한 evidence의 version/hash/command와 실제 result를 읽어 확인한다. 그 뒤 불일치·UNKNOWN에 직접 연결된 본문만 추가로 읽는다. 장문 로그는 파일 경로와 요약으로 전달한다. 과거 로그를 전수 적재하거나 `legacy-unknown`에 새 policy를 소급하지 않는다.
4. ADOPT는 runtime/구조/경계/검사/CI/CD/Git/문서/결정/현재 작업/기술부채를 CONFIRMED/DOCUMENTED/INFERRED/UNKNOWN으로 구분한다. known previous hash만 managed로 보고 customized/unknown source는 diff와 user gate로 보낸다. 승인된 baseline도 security/data/Broken, dirty auto-loop, Refactor 전체 회귀 STOP을 완화하지 않는다.
5. 환경은 project-bootstrap, 기획은 feature-planner, UI는 design-system, 준비된 단일 이슈는 tdd-loop로 연결한다. tdd-auto-loop는 사용자가 유한 이슈와 상한을 명시적으로 위임했을 때만 쓴다.
6. 통합 뒤 e2e-write와 create-pr로 인계한다. 배포·운영은 별도 승인 단계다. 수행 단계·승인·증거·미검증·다음 행동은 progress에 기록하고, README/흐름 화면은 영향을 받을 때만 갱신한다.

요구사항·기술안·범위·이슈·시나리오 게이트를 자동 승인하거나 근거 없는 완료 상태를 만들지 않는다.
