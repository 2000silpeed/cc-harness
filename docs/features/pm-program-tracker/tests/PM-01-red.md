# PM-01 · Red 증거

## 범위

G5 승인 근거: 계약·시나리오를 제시하고 Red 진행 여부를 물었으며 사용자가 “네 진행합시다”라고 답했다. 기능 구현 없이 타입·함수·repository 최소 stub과 테스트만 추가했다. 기존 App과 정상 테스트는 수정하지 않았다.

## 실제 실행

작업 디렉터리: /Users/sungwoon/ai-projects/cc-harness

| 검사                                                                           | 결과                                      | 근거                            |
| ------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------- |
| npm run typecheck                                                              | exit 0                                    | import·타입 수집 가능           |
| npm test -- --reporter=json --outputFile=tmp/pm-01-red-unit.json               | exit 1, 36개 중 기존 10 통과·신규 26 실패 | domain 19, repository 7         |
| npm run build                                                                  | exit 0                                    | 기존 화면 production build 정상 |
| npx playwright test tests/browser/program-registration.spec.ts --reporter=json | exit 1, 신규 8 실패                       | tmp/pm-01-red-browser.json      |
| lint·design:check·harness:check·format:check                                   | 모두 exit 0                               | 정적 오류 없음                  |

## 실패 분류

- S01–S09: 계약의 createProgramDraft·validateProgramDraft가 미구현임을 명시한 stub에서 실패한다. 테스트 자체가 임의로 throw하는 방식이 아니며 정상 입력·필드 오류·불변성을 assertion으로 요구한다.
- S10–S15: repository create/list가 미구현이다. 동시 생성은 성공 1건을 기대하지만 0건이고, 저장 오류는 code=storage를 기대하지만 일반 미구현 오류여서 실패한다. 일반 오류가 발생했다고 오류 테스트를 통과시키지 않는다.
- 브라우저 7개: 실제 앱에 등록 dialog가 없어서 첫 진입 assertion에서 실패한다. 1개(S15)는 초기 로드 오류 안내가 없어서 실패한다. 서버·브라우저 실행·페이지 진입은 성공했다.
- 이후 저장·재시도·취소·pending assertion은 작성돼 있지만 선행 UI 부재 때문에 아직 도달하지 못했다. 개별 후속 분기가 이미 검증됐다고 주장하지 않는다.

## 테스트 상세와 경계

- 테스트 S01–S20을 순수 함수·저장·브라우저에 분배했다. 파라미터화로 테스트 수와 시나리오 수는 다르다.
- 저장 테스트는 격리 IDBFactory를 주입한다. 브라우저 테스트는 Playwright의 격리 context를 사용한다. 실제 사용자 DB를 삭제하지 않는다.
- S18은 브라우저 테스트 안에서만 다음 add 트랜잭션을 abort시켜 기존 행 보존·초안 보존·재시도를 요구한다. production 실패 플래그는 없다.
- S19는 테스트에서 트랜잭션을 잠시 유지해 저장 중 disabled 상태를 요구한다. 같은 키 중복 경쟁은 S13이 별도 검증한다.
- S20의 폐기 확인은 테스트 계약상 native confirm을 사용한다. 닫기 거절과 포커스 복귀를 검사한다.
- 생성되는 로컬 로그와 trace는 tmp/ 및 test-results/에 있고 Git 제외다. 재실행하면 갱신될 수 있다.

## 인계

판정: Red 확인. import/타입/빌드 실패인 Broken으로 분류하지 않는다. Green에서는 테스트를 skip하거나 기대값을 완화하지 않고 계약대로 구현한다. 등록이 구현되면 PM-00의 준비 안내 assertion을 실제 폼 진입으로 이행하되 기존 빈 화면·반응형·포커스 검사는 유지한다.

PM-01 통과·기능 완료·배포를 의미하지 않는다. 현재 통합 검사는 의도적으로 신규 단위 테스트에서 실패하므로 CI가 녹색이라고 보고하지 않는다.
