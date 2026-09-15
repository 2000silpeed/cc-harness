---
name: harness-cycle
description: 전체 프로젝트 진행·재개를 요청하면 현재 단계와 승인 근거에 맞는 하네스 스킬로 연결한다.
---

# 전체 사이클 진행

하네스 루트의 `docs/harness/lifecycle.md`에서 실행 지도·위치·승인·재개 기준(1·3–5절)을 확인하고 현재 단계의 절만 추가로 읽는다. 대상 프로젝트와 하네스 위치를 분리하고 실제 파일·Git 탐색은 작업자에게 배정한다. `docs/harness/templates.md`는 산출물을 작성할 때 해당 템플릿만 참조한다.

[필수 오케스트레이션 정책](../../../docs/methods/delivery-automation.md#필수-오케스트레이션-정책)을 먼저 적용한다. 메인은 상태·승인·라우팅·증거 통합·사용자 대화를 맡고, 아래 단계의 실제 탐색·산출물·검사는 작업자가 수행한다. 작업자는 받은 단계만 직접 수행하고 재귀 위임하지 않는다.

## 실행

1. 시작 mode를 NEW, ADOPT, RESUME으로 기록한다. NEW는 새 프로젝트, ADOPT는 기존 프로젝트에 하네스를 처음 적용하는 경우, RESUME은 기존 하네스 기록의 재개/호환 갱신이다. 새 CLI를 만들지 않는다.
2. 새 아이디어는 사용자 요청을 보존하고 목적·사용자·성공 조건을 확인한다. ADOPT/RESUME은 기존 승인·spec·ADR·issue·progress·code·config·AGENTS·evidence를 보존하고, 기존 결정과 인터뷰를 요청 없이 다시 만들지 않는다.
3. `progress.md`와 실제 산출물을 대조해 가장 먼저 미완료이거나 무효가 된 단계에서 재개한다. source revision·contract hash·effective checkpoint와 evidence 유효/무효 이유를 기록한다. routing field가 없는 과거 evidence는 `legacy-unknown`으로 보존하고 새 policy를 소급 적용하지 않는다.
4. ADOPT discovery는 runtime, 구조, 경계, 검사, CI/CD, Git, 문서, 기존 결정, 현재 작업, 기술부채를 `CONFIRMED`/`DOCUMENTED`/`INFERRED`/`UNKNOWN`으로 구분한다. registry path만으로 managed라고 단정하지 않는다. known previous hash 일치만 managed로 보고 customized/unknown source는 diff와 user gate로 보낸다. baseline은 사용자 승인 뒤에만 효력이 있으며 security/data/Broken STOP, dirty auto-loop STOP, Refactor 전체 회귀 STOP을 완화하지 않는다.
5. 준비 시 작업자가 대상 `AGENTS.md`에 공통 정책 링크와 메인/작업자 역할·새 최소 컨텍스트·독립 검증·도구 부재 시 중단 의무를 간결하게 병합한다. 기존 지침과 승인을 보존하고 적용 여부를 확인한다. 준비에는 project-bootstrap, 기획에는 feature-planner, UI에는 design-system을 사용한다. 각 SKILL.md를 읽고 수행하며 이름을 셸 명령으로 실행하지 않는다.
6. 준비된 이슈는 기본 tdd-loop로 처리한다. tdd-auto-loop는 사용자가 명시적으로 유한 이슈 집합과 상한을 승인한 경우만 사용한다.
7. 이슈 통합 뒤 e2e-write, create-pr로 인계한다. 배포·운영은 별도 계획·승인·실제 확인 단계로 둔다.
8. 수행한 단계·승인·로그·미검증·다음 행동을 progress에 기록하고 README와 흐름 화면을 갱신한다.

## 경계

스킬 등록이나 계획 요청을 앱 구현·원격 작업 허가로 해석하지 않는다. 요구사항·기술안·범위·이슈·시나리오 게이트를 자동 승인하지 않는다. 기존 프로젝트의 실행 가능한 단계를 불필요하게 처음부터 반복하지 않는다. 근거가 없는 완료 상태를 만들지 않는다.
