# PM-02 · Red 증거

## 승인·변경 범위

계약·시나리오와 Red 진행 질문에 사용자 “진행”. PM-02 단위·브라우저 테스트 및 import를 위한 createProgramEditDraft/update 최소 stub을 추가했다. 오류 타입에 not-found를 추가했지만 실제 저장 동작은 구현하지 않았다. 기존 App·등록 기능·등록 테스트는 변경하지 않았다.

## 단위 결과

- 작업 위치: /Users/sungwoon/ai-projects/cc-harness.
- npx vitest run tests/unit/program-editing.test.ts --reporter=json --outputFile=tmp/pm-02-red-unit.json: exit 1, 8개 수집·8개 실패.
- S01은 createProgramEditDraft 미구현, S02/S03/S19는 update 미구현, S04/S05/S13은 일반 미구현 오류가 duplicate/not-found/storage 계약을 충족하지 않아 실패했다.
- 100개 격리 레코드 생성은 성공했고 update에서 실패한다. 입력 보존·재열기·후속 재시도 assertion은 선행 미구현 때문에 아직 도달하지 못한 경우가 있다.
- 기존 날짜·상태 순수 검증은 PM-01 회귀다. 이미 동작하는 검증기를 비워 억지 실패시키지 않는다.

## 검증 경계

## 브라우저·회귀 실행 결과

- npx playwright test --reporter=json: exit 1. 기존 14개 통과, 신규 44개 실패, skip/flaky 0. 로그 tmp/pm-02-red-browser.json.
- 신규 44개 모두 실제 프로그램명 클릭 이후 ‘프로그램 수정’ dialog가 없다는 toBeVisible assertion에서 실패했다. 현재 전체 보기 dialog만 열리므로 계약의 수정 진입이 미구현이다. 전역 실행 오류 0개, 100건 UI 등록까지 성공한 S19도 수정 진입에서 실패했다.
- S04–S19의 후속 날짜·상태·저장 실패·대상 이동·취소 assertion은 코드로 작성했지만 수정창 부재로 아직 실행되지 않았다. 모든 분기가 검증됐다고 보고하지 않는다. 경우의 수별 파라미터화로 시나리오 수와 테스트 수가 다르다.
- npm run check: exit 1. 정적·디자인·하네스·서식 검사 통과 후 단위 44개 중 기존 36 통과·신규 8 실패로 종료했다. 로그 tmp/pm-02-red-check.log. 뒤의 빌드/브라우저는 이 명령에서 실행되지 않았다.
- 별도 npm run build 및 npm run typecheck: exit 0. 후속 추가 브라우저 파일의 ESLint·Prettier·타입 검사 통과. 브라우저 실행은 메인이 단독 수행해 포트·trace 충돌을 피했다.
- 파일 작성 분담: 메인은 domain/repository stub·단위 테스트·판정 기록, Lovelace는 신규 브라우저 테스트만 작성했다. 제품 UI·기존 사용자 DB는 변경하지 않았다.

판정: PM-02 Red 확인. Green 미착수. 신규 실패를 포함한 통합 검사는 현재 의도적으로 실패 상태다.

신규 오류의 원인은 미구현 동작이어야 하며 import·타입·서버 실행 오류는 Red로 인정하지 않는다. 브라우저 실패는 초기 수정 dialog 부재와 이후 미도달 assertion을 구분한다. 실제 사용자 DB를 지우거나 실패 플래그를 제품에 추가하지 않는다.

Green에서는 테스트 기대값을 완화하거나 skip하지 않고 승인된 계약을 구현한다. 기존 프로그램명 전체 보기 테스트의 수정 진입 계약 이행은 Green에서 수행한다. 지금은 기존 화면과 동작을 보존한다.
