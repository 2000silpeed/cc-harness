# PM-05 scenarios · scenario + Red only

## 근거와 승인 범위

- issues.md PM-05 AC1–AC3, prd.md F04, spec-fixed.md D18–D20·D33 / AC12·AC13·AC20.
- 실제 사용자 승인 원문은 ../auto-run.md에 있다. 메인은 그 범위에서 이 에이전트에 scenario+Red만 위임했다. noGreen은 하위 에이전트 단계 제한이며 전체 실행 중단 요청이 아니다.
- progress.md는 소유 범위 밖이므로 수정하지 않는다. G5 위임 근거는 여기 보존하고 메인에 인계한다.
- 기존 작업·테스트를 보존한다. 요청된 5개 파일만 작성하며 새 의존성은 없다.

## 계약

- snapshot: `{ version: 1, exportedAt: ISO timestamp, programs: ProgramRecord[] }`.
- `createProgramBackup(records: readonly ProgramRecord[], exportedAt: string): string`: 호출자가 제공한 유효한 시각과 전체 저장 레코드의 9개 업무 필드 및 id를 보존한다. 필터 결과를 입력으로 쓰지 않는다. 입력 불변.
- `parseProgramBackup(text: string): ProgramRecord[]`: 동기 함수. JSON과 unknown 객체·배열·각 필드 타입·필수 필드·버전·ISO 시각을 검사한다. 실패는 Error이며 부분 결과를 반환하지 않는다.
- id는 비어 있지 않은 문자열이며 그대로 보존한다. 모듈·프로그램명은 기존 validateProgramDraft의 trim+대문자 정규화를 재사용한다. 중복 id 및 정규화된 복합 키는 전체 거부한다. 구분자 결합으로 복합 키 충돌을 만들지 않는다.
- nullable 날짜 및 상태는 기존 validator 계약을 재사용한다. 실제 완료일이 예정일보다 이르거나 늦어도 허용하고 날짜/상태를 추론하지 않는다.
- `replaceAll(records: readonly ProgramRecord[]): Promise<void>`: Green에서 모든 레코드 검증 후 동일 readwrite 트랜잭션의 clear+write로 전체 교체한다. 검증 실패는 Error, 저장 실패는 code=storage. 실패 시 원본 전부 유지, 큐는 재시도 가능. 기존 list/create/update/close는 변경하지 않는다.
- UI: 전체 백업 버튼, 백업 복원 접근성 이름의 file input. 검증 후 native confirm에 전체 교체/덮어쓰기 경고와 복원 건수를 미리 보여준다. 취소는 무변경. 완료는 status, 실패는 alert. 빈 정상 백업도 0건 경고와 명시적 확인 이후에만 전체 삭제.
- 파일 선택 취소, 병합 복원, 새 UI 구현, Green, commit 및 다른 이슈 수행은 이번 범위 밖이다.

## Given–When–Then

| ID  | AC  | should / when                                        | Given                                    | When                                    | Then                                           | 층 / 통제 의존성                               |
| --- | --- | ---------------------------------------------------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| S01 | AC1 | should export whole backup when filtered             | 전체 두 행·필터 한 행                    | 다운로드                                | 버전·ISO·전체 9필드+id 보존                    | unit / browser download·독립 context           |
| S02 | AC2 | should normalize keys when parsing                   | 유효한 nullable 날짜·별도 실적·소문자 키 | parse                                   | id/업무 값 보존, 키 정규화, 복합키 구분        | unit / 고정 시각                               |
| S03 | AC2 | should clear only when confirmed                     | 기존 목록·빈 정상 백업                   | 취소 후 재선택 확인                     | 취소 보존, 확인 후 0건·재열기 유지             | unit / browser native confirm                  |
| S04 | AC3 | should reject all when any value invalid             | 손상/미지원/unknown shape/중복/날짜 오류 | parse 또는 파일 선택                    | Error/안내·무교체·확인창 없음·정상 파일 재시도 | parameterized unit / browser                   |
| S05 | AC2 | should replace persistently when accepted            | 기존 두 행·새 한 행                      | 미리보기 취소 후 확인                   | 전체 교체·성공 안내·reload 유지                | fake IDB / browser native confirm              |
| S06 | AC3 | should preserve all when repository validation fails | 기존 목록·잘못된 상태/중복 id/정규화 키  | replaceAll                              | 거부·원본 보존                                 | fake IDB                                       |
| S07 | AC3 | should rollback and retry when storage aborts        | 기존 두 행                               | clear 성공 및 새 행 write 성공 후 abort | storage 오류·원본 전부 보존·재시도 성공        | fake IDB prototype fault / browser clear abort |

## Red 증거와 인계

- 실제 실행 cwd: `/Users/sungwoon/ai-projects/cc-harness`.
- unit 57개 수집, 57 failed, 0 passed (exit 1). 빈 export 결과의 JSON 해석 실패, 빈 parse 결과/검증 미수행, replaceAll 무동작에 따른 assertion 실패다. 소스 문법/import 오류가 아니다.
- browser 8개 수집, 8 failed (exit 1), `tmp/pm-05-red-browser.json`. UI 등록과 기존 필터는 실행됐고 전체 백업 버튼/백업 복원 file input 미구현에서 실패했다. 이후 확인·롤백 assertion은 아직 도달하지 못했다.
- typecheck·build·lint exit 0, 소유 5개 파일 Prettier 적용 완료.
- 전체 `npm run check` exit 1: 단위 95 passed + 신규 57 failed에서 중단. 증거 `tmp/pm-05-red-check.log`. 뒤의 통합 build/browser 단계는 미실행이며 위 별도 실행과 구분한다.
- Green 구현, 실제 복원 성공, 원자성 충족은 미완료다. 기존 테스트는 수정하지 않았다.

- unit: `npx vitest run tests/unit/program-backup.test.ts --reporter=json --outputFile=tmp/pm-05-red-unit.json`.
- 타입: `npm run typecheck`.
- 브라우저: `npm run build && npx playwright test tests/browser/program-backup.spec.ts`.
- 인계 전 소유한 파일만 Prettier 적용 및 lint 수행. 전체 check는 의도적인 Red 단위 테스트에서 중단될 수 있다.
- stub은 빈 문자열/빈 배열/무동작 Promise만 반환한다. import·타입 수집을 해결하며 실제 백업·복원 기능은 구현하지 않는다.
- 빈 parse 배열 기대 등 이미 stub과 같은 assertion은 단독 Red 증거로 취급하지 않는다. 정상 roundtrip, unknown 입력 거부, 교체·롤백 검증이 실제 미구현 실패를 증명한다.
