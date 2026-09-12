# PM-06 · 시나리오와 Red 계약

- 근거: issues.md PM-06-AC1–AC3, spec-fixed.md D20·D33·AC16, auto-run.md.
- G5 위임 근거: 실제 사용자 원문은 ../auto-run.md에 보존한다. 메인은 승인 범위에서 이 에이전트에 PM-06 scenario/Red만 위임했으며 이 에이전트는 Green을 실행하지 않는다.
- 파일 소유 제한으로 progress.md는 수정하지 않는다. 메인 에이전트가 이 위임과 실행 결과를 통합한다.
- 선행 PM-05 완료 수치는 메인 제공 검증 정보이며 이 Red 에이전트가 재실행한 것은 아니다.

## 계약

- `ProgramRepository.delete(id: string): Promise<void>`: 호출 시 저장된 id를 캡처한다. 같은 readwrite 트랜잭션에서 존재 확인과 삭제를 수행하고 complete 이후에만 resolve한다. 없는 id는 `code: "not-found"`, abort/저장 실패는 `code: "storage"`로 reject한다. 실패는 레코드를 보존하며 다음 재시도를 막지 않는다.
- 기존 수정 다이얼로그에 `프로그램 삭제` 버튼을 둔다. 테이블 9열을 보존하며 삭제 열을 추가하지 않는다. 등록 다이얼로그에서는 삭제하지 않는다.
- native confirm은 저장된 모듈·프로그램명, 백업 없이는 복구 불가 안내, 미저장 변경 폐기 주의를 포함한다. 취소는 초안과 모든 레코드를 유지한다.
- 확인은 초안 식별 값이 아닌 saved editing id 하나만 삭제한다. 커밋 뒤 다이얼로그를 닫고 등록 버튼에 포커스를 돌린다. reload 후에도 삭제가 유지된다.
- 실패는 alert와 재시도 안내, 초안·기존 행 보존, 거짓 성공 금지. pending 중 대상 변경·중복 삭제를 막고 성공 전 행을 제거하지 않는다. 전체 백업은 계속 사용 가능하다.
- Red stub은 interface와 async noop method만 추가한다. 기존 메서드 동작과 App/UI는 변경하지 않는다.

| ID  | AC      | Given                               | When                           | Then                                             | 층·격리                          |
| --- | ------- | ----------------------------------- | ------------------------------ | ------------------------------------------------ | -------------------------------- |
| S01 | AC2     | 저장된 두 행                        | A 삭제 후 재연결               | A만 제거, B 전체 값 유지                         | unit, 새 fake IDBFactory         |
| S02 | AC3     | 두 행과 없는 id                     | 삭제 요청 후 유효 id 재시도    | not-found, 두 행 보존, 재시도 가능               | unit, 새 fake IDBFactory         |
| S03 | AC3     | 두 행, delete success 후 abort 주입 | A 삭제                         | storage reject, 두 행 rollback, 재시도 성공      | unit, prototype spy 복원         |
| S04 | AC2     | delete request 이벤트 관찰          | A 삭제                         | request success → complete → resolve             | unit, fake IndexedDB             |
| S05 | AC2     | 조회가 대기 중이고 선택 id=A        | delete 호출 뒤 선택 id=B       | 호출 시 A만 삭제                                 | unit, primitive id snapshot      |
| S06 | AC1·AC2 | UI 등록 두 행과 수정 초안           | native confirm 취소            | 저장 식별·경고 표시, 초안과 행 유지, 9열         | browser, 격리 context/UI seed    |
| S07 | AC1·AC2 | A 초안 이름을 B로 변경              | 키보드 삭제 확인, reload, 백업 | 저장된 A만 삭제, 등록 포커스, B 백업 가능        | browser, 격리 context/UI seed    |
| S08 | AC3     | delete success 후 abort             | 확인, 실패, 재시도             | alert, 초안·행 보존, 거짓 성공 없음, 재시도 성공 | browser, 격리 context/일회 주입  |
| S09 | AC2·AC3 | 실제 삭제 트랜잭션 pending          | 재클릭·Escape                  | 한 번만 삭제, 대상 잠금, complete 전 행 보존     | browser, count pump/finally 해제 |

## 실행·인계

- 먼저 새 시나리오·테스트에 Prettier를 적용한다.
- `npx vitest run tests/unit/program-deletion.test.ts --reporter=json --outputFile=tmp/pm-06-red-unit.json`
- `npm run typecheck`
- `npx eslint tests/unit/program-deletion.test.ts tests/browser/program-deletion.spec.ts src/data/program-repository.ts`
- 브라우저 테스트와 전체 check는 메인의 단계 소유 지시에 따라 메인만 실행한다. 이 Red 에이전트는 브라우저 assertion을 실행하지 않았다.
- 실제 데이터베이스는 사용하지 않는다. 브라우저는 신규 context에서 UI로만 seed하며 read-only 조회는 해당 테스트 context 안에서 수행한다.
- 휴지통·일괄 삭제·추가 UI 구현은 제외한다. Red 결과 및 종료 코드는 최종 JSON으로 인계한다.
