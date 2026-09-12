---
name: tdd-loop
description: 승인된 이슈 하나에 시나리오·Red·Green·AC 검증·Refactor·보안 사이클을 순서대로 수행하고 PR 인계까지 정리할 때 사용한다.
---

# 한 이슈의 TDD 사이클

`docs/harness/lifecycle.md`와 `docs/lessons/14-17-delivery-automation.md`의 16강을 읽는다.

1. 이슈·선행 의존성·기획 승인·대상 경로·실행 범위를 확인한다. 미완료 선행 작업을 건너뛰지 않는다.
2. 해당 SKILL.md를 순서대로 읽어 test-scenarios → tdd-red → tdd-green → ac-verifier → tdd-refactor → security-review를 수행한다.
3. G5 계약·시나리오와 구현 결과·PR 초안의 단계별 사용자 검토를 보존한다. 원문 16강은 순서만 자동화하며 승인을 생략하지 않는다. 이미 유효한 승인·단계 증거가 있으면 그 다음부터 재개한다.
4. AC 누락은 시나리오/Red로 돌아가고, Refactor 회귀는 자신의 마지막 변경부터 복구한다.
5. Broken 환경·새 요구사항·승인 부재·차단 발견·진전 없는 반복은 정지 이유와 다음 결정을 기록한다.
6. 단계별 결과와 최종 이슈 통과를 구분한다. 커밋/PR 요청이 없다면 create-pr의 인계 문서까지만 준비한다.
7. progress에 증거·실제 외부 작업·다음 이슈를 남긴다. 기능 전체 E2E와 main 머지는 별도 게이트다.

루프라는 이름은 무한 재시도나 사람 판단 생략 허가가 아니다. 이 스킬이 별도 에이전트를 자동 생성한다고 주장하지 않는다.
