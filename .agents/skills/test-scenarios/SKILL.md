---
name: test-scenarios
description: 승인된 이슈 AC를 구현 전 함수/API 계약과 정상·경계·예외 테스트 시나리오로 변환할 때 사용한다.
---

# 계약과 시나리오

`docs/lessons/09-13-tdd.md`의 9강과 `docs/harness/templates.md`를 읽는다.

1. 대상 이슈·PRD·선행 이슈·기존 코드와 테스트 방식을 확인한다.
2. 입력/출력·동기/비동기·오류·부작용 계약을 구현 없이 명시한다.
3. 각 AC에 정상·경계·예외 시나리오를 연결한다. 빈 값·중복·min/max 전후·실패·동시성은 도메인에 필요한 것만 포함한다.
4. should [결과] when [조건] 이름과 Given–When–Then, 테스트 층, 통제할 외부 의존성을 기록한다.
5. AC 전체 대응을 확인하고 누락·미정을 드러낸다. 구현을 보고 기대값을 역으로 맞추지 않는다.
6. [GATE G5] 사용자 계약·시나리오 검토 또는 유효한 위임 근거를 progress에 기록한 후 tdd-red로 인계한다.

출력: `docs/features/{feature}/tests/{issue}-scenarios.md`. 구현 코드를 작성하지 않는다. 이미 승인된 동일 계약을 무의미하게 다시 승인받지 않는다.
