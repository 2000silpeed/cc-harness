---
name: feature-planner
description: 새 기능의 아이디어를 인터뷰·디자인 연계·PRD/ADR·수직 이슈 계획으로 만들거나 기존 기획을 재개할 때 사용한다. 사용자 승인 후에만 다음 결정 단계로 넘어간다.
---

# 아이디어를 실행 가능한 이슈로

현재 게이트의 절만 읽는다. 절은 지정 제목부터 다음 같은/상위 수준 제목 직전까지 선택한다.

- G1: `docs/methods/requirements-interview.md`의 `## 결정의 원칙`, `## 인터뷰 실행`, `## 검증과 인계`; `docs/methods/planning.md`의 `## 단계 1: 요구사항 인터뷰 계약`.
- G2·G3: planning의 `## 단계 2: PRD와 기술 결정`.
- G4: planning의 `## 단계 3: 수직 슬라이스와 AC`.
- 외부 등록 요청이 있을 때만 planning의 `## GitHub·프로젝트 보드 등록 계약`.
- 작성할 때만 `docs/harness/templates.md`의 대응 제목(`## 원문·인터뷰·요구사항`, `## PRD와 ADR`, `## 이슈`).

다음 단계 자료를 미리 읽지 않는다. 이전 단계는 승인 버전·미결 항목만 전달한다.

## G1 요구사항

원본 요청을 `spec-original.md`에 보존하고 실제 코드·설정을 확인한다. 앱 소스가 없으면 없다고 밝힌다. 한 번에 미결 질문 하나만 하며 판단 질문에는 추천과 이유를 제시한다. 답을 반복해서 묻거나 기술 선택을 요구사항 승인으로 바꾸지 않는다. 결정·이유·용어를 `spec-fixed.md`에 기록한다. **G1 사용자 확정 전 설계로 넘어가지 않는다.**

UI가 필요하면 design-system으로 `design.md`와 공통 기준을 준비하고 제안과 관찰 결과를 구분해 검토받는다. UI가 없으면 이유와 함께 해당 없음으로 둔다.

## G2·G3 PRD와 ADR

승인된 spec, design, 실제 코드를 입력으로 사용한다. 데이터/API/상태/핵심 동작/컴포넌트/기존 패턴/테스트 용이성 기준으로 최소 세 안을 비교한다. 의미 없는 대안을 만들지 않는다. **G2 사용자 선택**을 ADR의 Context·Decision·Alternatives·Consequences로 기록하고 AI 추천을 사용자 결정으로 쓰지 않는다. 구체적인 Out of Scope를 제시해 **G3 사용자 확정**을 받은 뒤 이슈로 간다.

## G4 이슈

승인 PRD를 사용자에게 보이는 독립 TDD 수직 슬라이스로 나눈다. AC는 Given–When–Then의 관찰 결과로 쓰고 기반 준비와 사용자 기능, 의존 순서를 구분한다. **G4 목록·AC·의존성 승인 전 외부 등록하지 않는다.**

명시적 외부 등록 요청이 있으면 실제 repo/owner/project·인증·중복을 확인하고 결과 URL과 보드 상태를 재조회한다. 부분 실패를 보존하고 재시도에서 중복 생성하지 않는다. 권한/네트워크가 없으면 로컬 `issues.md`만 완료한다.

출력은 spec-original·interview·spec-fixed·prd·issues와 승인 근거다. 실제 생성했을 때만 외부 URL을 기록하고 test-scenarios 또는 tdd-loop로 인계한다.
