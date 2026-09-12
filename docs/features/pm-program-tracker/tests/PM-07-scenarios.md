# PM-07 · Excel 시나리오와 Red 계약

## 근거와 위임

- issues.md PM-07 AC1–AC4, spec-fixed.md D33, 실제 program.ts 계약을 기준으로 한다.
- auto-run.md의 기술 계약·시나리오 위임 범위에서 메인 에이전트가 분리한 scenario+Red 작업이다. 이번 작업 지시를 사용자 자동 실행 원문으로 인용하지 않는다. G5 위임 검토 근거는 auto-run.md이며 progress 기록은 메인 소유다.
- 소유: 이 문서, program-excel 단위/브라우저 테스트, xlsx-zip 단위 테스트, 두 도메인 최소 stub뿐. App·저장소 구현·PM-08 적용은 제외한다.

## 정확한 계약

- `excelHeaders`: 순서 고정 9열 `['모듈','프로그램명','담당자','변경 유형','진행 상태','개발 시작 예정일','개발 완료 예정일','실제 개발 완료일','이관 예정일']`.
- `createExcelTemplate(): Uint8Array`: 실제 .xlsx, 한 시트, 헤더만 포함.
- `previewExcel(data: Uint8Array, existing: readonly ProgramRecord[]): Promise<{rows: ProgramInput[], errors: {row: number, field: string, message: string}[]}>`: 입력·기존 목록 불변. 오류를 모두 수집하며 오류 하나라도 있으면 rows는 빈 배열. 파싱 실패도 반환 오류로 안내한다.
- `validateXlsxZip(data: Uint8Array): Promise<void>`: 정상 resolve, 구조·용량 위반은 Error reject. preview에서 파일 오류로 변환한다.
- 행 번호는 워크시트 기준 1부터, 헤더 1행. 파일 오류는 `{row:0, field:'파일'}`, 헤더 오류는 `{row:1, field:'열'}`. 값·수식·중복 오류 field는 해당 한글 헤더이며 중복 식별 키는 프로그램명에 표시한다. message는 비어 있지 않은 이유다.
- 날짜는 ISO 텍스트 또는 날짜 서식 숫자 셀. SSF 날짜 구성요소로 1900/1904 체계를 처리하며 시간대 Date 변환 금지. serial 60·음수·소수는 거부. 일반 숫자는 텍스트 필드와 날짜 필드에서 암묵 문자열/날짜 변환하지 않는다. 빈 상태는 개발 대기, 기타 선택 문자열은 빈 문자열, 빈 날짜는 null.
- 수식은 normal/shared/array 및 cached value가 있어도 거부하며 실행하지 않는다. 수식 오류 이유에는 `수식`을 포함한다. 키는 앞뒤 공백만 제거·대문자화 후 파일 내부/기존 목록 중복을 검사한다. 내부 공백과 연속 공백은 보존한다.

## 기술 선택 및 제한

- 메인이 설치한 공식 SheetJS 0.20.3을 사용한다. 추가 의존성 없음. 로컬 tmp/pm-07-parser-probe.json을 확인했으며 실제 100행 xlsx 18,337바이트 파싱 18.278ms 기록이다. 단일 프로브이지 성능 보장이 아니다. audit0은 메인 제공 결과이며 여기서 재실행하지 않았다.
- 기술 템플릿 프로필: 한 시트·정확히 9개 헤더, 다중 시트 거부, 업로드 최대 1,000행. 셀 문자열 최대 2,000자는 파서 기술 안전장치이며 전역 프로그램 목록 수나 수동 입력 상한이 아니다.
- ZIP: 파일 2MiB, 실제 총 해제량 20MiB, 엔트리당 10MiB, 최대 100개. stored/deflate만 허용. 메타데이터를 믿지 않고 실제 해제량을 제한한다. 중복 경로·상위/절대/역슬래시 경로·암호화·ZIP64·불일치·손상은 거부한다. CRC 검증은 이 단계의 필수 계약이 아니다.
- 합성 ZIP fixture는 node:zlib와 로컬/중앙 디렉터리 헤더로 작성한다. 압축 폭탄과 실제 크기 위조는 네트워크·사용자 파일 없이 테스트한다. 정상 파일 fixture는 SheetJS read/write로 생성한다.

## Given–When–Then

| ID  | AC      | 분류   | Given                                        | When                                 | Then                         | 층/격리                    |
| --- | ------- | ------ | -------------------------------------------- | ------------------------------------ | ---------------------------- | -------------------------- |
| S01 | AC1     | 정상   | 다운로드 요청                                | 템플릿 생성                          | 실제 xlsx·1시트·고정9열      | 단위/브라우저, 메모리 파일 |
| S02 | AC1     | 정상   | 정상9필드·기존 목록                          | 미리보기                             | 정규화값·신규 수·기존 불변   | 단위/브라우저              |
| S03 | AC3     | 경계   | 빈 선택 필드                                 | 미리보기                             | 개발 대기·빈 문자열·null     | 단위/브라우저              |
| S04 | AC2     | 예외   | 누락/추가/중복/순서변경 헤더·다중 시트       | 파싱                                 | 헤더/파일 위치 오류          | 단위                       |
| S05 | AC2     | 예외   | 필수·상태·불가능/역전 날짜                   | 전체 검증                            | 모든 오류와 빈 rows          | 단위/브라우저              |
| S06 | AC2     | 경계   | 정규화 중복 또는 구분자 충돌                 | 키 검사                              | 진짜 중복만 위치와 함께 거부 | 단위/브라우저              |
| S07 | AC2     | 예외   | cached normal/shared/array 수식              | 파싱                                 | 헤더별 오류·실행 없음        | 단위                       |
| S08 | AC3     | 경계   | ISO/1900/1904 날짜·serial60/음수/소수        | 세 시간대에서 파싱                   | 날짜 보존 또는 명시 오류     | 단위, TZ 복원              |
| S09 | AC2     | 예외   | 일반 숫자                                    | 문자열/날짜 필드 파싱                | 암묵 변환 거부               | 단위                       |
| S10 | AC4     | 예외   | 헤더만/빈 행/빈 바이트/CSV/손상 ZIP          | 업로드 후 정상 재선택                | 파일 오류·기존 불변·재시도   | 단위/브라우저              |
| S11 | AC1 AC4 | 경계   | 999/1000/1001행·1999/2000/2001자             | 파싱                                 | 정확한 기술 상한             | 단위                       |
| S12 | AC4     | 경계   | 실제 xlsx·stored/deflate·파일/엔트리 수 경계 | ZIP 검사                             | 상한 포함 허용·초과 거부     | 단위                       |
| S13 | AC4     | 보안   | 실제 해제량 경계·위조 크기·압축 폭탄         | ZIP 검사                             | 메타데이터와 무관하게 제한   | 단위, zlib                 |
| S14 | AC4     | 보안   | 중복/경로/암호/ZIP64/불일치/손상             | ZIP 검사                             | Error 거부                   | 단위                       |
| B02 | AC1 AC4 | 부작용 | UI로 격리 등록한 기존 행                     | 적용하지 않고 미리보기·취소·새로고침 | 백업의 실제 저장 목록 불변   | 브라우저, 새 context       |

테스트 이름은 should 결과 when 조건이며 각 ID로 이 표에 연결한다. UI 계약은 `Excel 템플릿` 버튼, `Excel 업로드` 입력, `Excel 미리보기` region, `신규 N건`, 행/필드별 오류, `미리보기 취소`. 적용 구현은 PM-08 범위이며 B02는 적용 버튼의 영구 부재를 요구하지 않는다.

## Red 검증

- 두 source 파일은 빈 결과/no-op 최소 stub이며 실제 기능 구현이 아니다.
- 실행 예정: `npx vitest run tests/unit/program-excel.test.ts tests/unit/xlsx-zip.test.ts --reporter=json --outputFile=tmp/pm-07-red-unit.json`, `npm run typecheck`, 지정 신규 파일 ESLint/Prettier.
- 브라우저 테스트와 전체 check는 메인 전용이므로 이 작업에서는 실행하지 않는다. 초기 ZIP 정상 허용 테스트 통과는 no-op 특성으로 기능 완료 증거가 아니다.

### 실제 결과

- cwd: `/Users/sungwoon/ai-projects/cc-harness`. 지정 두 단위 파일: 73개 수집, 61 실패, 12 통과, 종료 코드 1. 로그: `tmp/pm-07-red-unit.json`.
- 실패는 빈 템플릿/빈 미리보기/검증 no-op에 대한 기대값 불일치다. 12개 통과는 ZIP 정상 허용·상한 포함 사례가 no-op에서 통과한 것으로 실제 ZIP 구현 검증이 아니다.
- 초기 배열 매개변수 타입 오류 및 shared XML fixture 경로 오류를 수정한 후 재실행했다. 최종 타입 검사와 지정 소스/테스트 ESLint는 종료 코드 0. 최종 단위 실행의 shared 수식 사례도 fixture 오류가 아닌 오류 목록 assertion으로 Red다.
- 지정 신규 6개 파일에 Prettier 적용. 브라우저 5개 시나리오는 작성·타입 검사만 했으며 실행/화면 검증은 미실행이다. Green·App·저장소 구현은 하지 않았다.

## Pre-Green 독립 준비 검토에 따른 보정 · 2026-09-13

위 실제 결과는 이전 실행의 역사적 기록이다. 독립 preflight가 발견한 fixture 거짓 양성과 누락 계약을 이번 준비 보정에 반영한다. `PM-07-stop.md`의 최초 fixture 오류·무단 재시도 STOP을 지우거나 해제하지 않는다. 이전 Red 수치는 보정된 테스트의 baseline이 아니다. 메인의 독립 재검토와 새 baseline 이전에 Green으로 진행하지 않는다.

첫 검토자의 구체 증거 `tmp/pm07-resume-review-UjT0zM/fixture-probe.json`을 확인했다: 기존 범위 `A1:I2`, `hasC3:false`, `hasSharedFollower:false`. 이 파일은 이전 결함 증거로 보존하며 이번 보정 후 probe 결과와 혼동하지 않는다.

- 변경 범위는 program-excel 단위 테스트, 해당 브라우저 테스트, excel-preview-task 단위 테스트와 최소 stub, 이 문서의 5파일이다. 추가 의존성·Worker 런타임·파서·UI·저장 구현은 없다. 기존 데이터와 sample은 보존한다.
- S07은 정상 담당자 텍스트 `담당`을 cached value로 사용한다. shared fixture는 서로 다른 정상 식별 키의 두 행과 `A1:I3` 범위를 사용한다. 재직렬화한 ZIP을 다시 열어 C2 anchor와 C3 follower의 정확한 shared 속성·cache를 검사하고 SheetJS read-back의 양쪽 수식·cache도 확인한다. array 범위도 read-back으로 확인한다. 수식별 위치와 `수식` 이유를 assert하므로 숫자 타입 오류로 통과할 수 없다.
- S06은 앞뒤만 trim하고 내부 단일/연속 공백을 보존하는 사례를 추가했다. B02는 적용 동작 없이 미리보기·취소·재실행 시 저장 불변을 검증하며 PM-08 적용 버튼과 충돌하지 않는다.

### Worker client 준비 계약

`startExcelPreviewTask(data, existing, createWorker)`는 `{result: Promise<ExcelPreviewResult>, cancel(): void}`를 반환한다. 작업마다 주입된 Worker 하나를 생성하고 `{data, existing}`를 한 번 전송한다. 입력 버퍼를 transfer/detach하거나 기존 목록을 변경하지 않는다. Worker 응답 `event.data`는 previewExcel의 `{rows, errors}` 계약이다. 저장소 의존성은 없다.

작업 시작부터 5,000ms에 timeout 처리한다. 취소·timeout·Worker error는 reject 대신 `{rows:[], errors:[{row:0, field:'파일', message}]}`로 완료하며 각각 취소·시간 초과·오류/실패 이유를 표시한다. 정상 응답(파싱 오류 결과 포함)도 그대로 반환한다. 모든 종료 경로는 Worker terminate 1회, 타이머 해제, onmessage/onerror 해제를 수행한다. 취소 반복과 이미 큐에 들어간 늦은 응답·오류는 종료 결과를 변경하지 않는다. 현재 source는 빈 결과/no-op stub뿐이며 이 동작은 구현되지 않았다.

| ID  | AC      | Given                            | When                                        | Then                                                | 층/격리                             |
| --- | ------- | -------------------------------- | ------------------------------------------- | --------------------------------------------------- | ----------------------------------- |
| W01 | AC4     | 불변 입력                        | 작업 시작                                   | Worker 하나와 전송 한 번, 입력 보존                 | 단위/mock Worker                    |
| W02 | AC4     | 무응답 Worker                    | 4,999ms 후 1ms 진행                         | 경계 전 pending, 정확히 5초에 파일 timeout·종료     | 단위/fake timers                    |
| W03 | AC4     | 진행 중 작업                     | 취소 두 번                                  | 취소 오류, terminate 한 번, 타이머 없음             | 단위/mock Worker                    |
| W04 | AC4     | 진행 중 작업                     | Worker error                                | 파일 오류·종료·타이머 해제                          | 단위/mock Worker                    |
| W05 | AC1 AC4 | 파싱 결과 응답                   | message                                     | 결과 전달·종료·핸들러와 타이머 해제                 | 단위/mock Worker                    |
| W06 | AC4     | 취소/timeout/error/응답으로 종료 | 저장해 둔 handler로 늦은 message/error·취소 | 결과와 settle 횟수 불변, terminate 한 번, 정리 유지 | 단위/mock Worker·fake timers, 4사례 |

### 이번 준비 검사

- 허용: 타입 검사·단위 수집·fixture-only probe. fixture/type 실패 시 즉시 중단하고 자동 수정·재시도하지 않는다.
- 금지: Red 실행, 브라우저 실행, 전체 check, 커밋. 기존 result/STOP/progress 및 이전 로그를 덮어쓰지 않는다.
- 검사 결과는 아래에 별도 기록한다. 테스트 작성/수집은 동작 검증이나 G5 재승인·STOP 해제·Green 준비 승인과 다르다.

| 준비 검사     | 명령/방법                                                                                                                                                                          | 결과                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 타입          | `npm run typecheck`                                                                                                                                                                | exit 0, 재시도 없음                                                                  |
| fixture-only  | `node --input-type=module` stdin probe: 실제 단위 파일의 fixture helper와 S07의 `await invalid` 이전 assertion만 추출, TypeScript transpile 후 VM에서 SheetJS와 node:assert로 실행 | normal/shared/array 3종 통과, 제품 함수·Red 테스트 미호출, 재시도 없음               |
| 정적 목록     | `npx vitest list tests/unit/program-excel.test.ts tests/unit/excel-preview-task.test.ts`                                                                                           | exit 0; 기본 staticParse는 매개변수 사례를 펼치지 않으므로 아래 런타임 수집으로 보완 |
| 런타임 수집만 | `npx vitest list tests/unit/program-excel.test.ts tests/unit/excel-preview-task.test.ts --staticParse=false`                                                                       | exit 0, program-excel 40개 + Worker 9개 = 49개 수집; 테스트 본문 실행 없음           |

인계 상태: `preparation_corrected / independent_rereview_pending / new_red_baseline_not_run / green_not_started`. 브라우저·전체 검사·lint/format 검사는 이번 요청에 따라 실행하지 않았다. 이전 STOP과 로그는 그대로 보존했으며 이번 검사 출력은 대화 도구 기록에 있다.
