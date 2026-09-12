# PM-03 · 시나리오와 Red

## 승인·진행 경계

- 근거: issues.md PM-03-AC1–AC4, PRD F03/AC03–AC05, design.md 최신 compact 9열 결정 및 메인의 단계별 기술 계약.
- G5: 실제 사용자 승인 원문은 ../auto-run.md에 보존한다. 메인이 PM-03–PM-10 8개·Green 3회 상한 안에서 이 에이전트에 PM-03 시나리오+Red만 위임했다. 이는 전체 실행 범위가 아닌 하위 에이전트의 단계 제한이다.
- 메인의 하위 에이전트 지시: “구현금지. 기존tests수정금지. 타입검사 후 대상unit Red실행 허용, 브라우저빌드/실행 메인만.” 사용자 발언으로 인용하지 않는다.
- PM-02 기준점은 메인이 검증한다. Red 에이전트 시작 시 git status --short 출력은 비어 있었다. PM-02 완료·기준점 커밋을 대신 확정하지 않는다.
- progress.md는 편집 허용 목록 밖이므로 G5/진행 근거를 이 문서에 기록하고 메인이 progress로 인계한다.
- 허용 변경: 이 문서, tests/unit/schedule.test.ts, tests/browser/schedule.spec.ts, src/domain/schedule.ts. 신규 의존성 없음, 단일 schedule 도메인 모듈만 추가.

## 동기 도메인 계약

- `getMonth(today: Date): string`: 주입된 Date의 로컬 달력 기준 YYYY-MM. 시스템 시계 직접 접근 없음.
- `shiftMonth(month: string, offset: number): string`: 정수 월 이동, 연도 경계 처리, 0은 같은 월. 입력 월은 0001–9999년의 YYYY-MM이며 잘못된 형식/월은 RangeError.
- `ScheduleDates`: 기존 ProgramInput의 plannedStartDate/plannedEndDate/transferDate만 Pick한 읽기 전용 입력. null은 미정, 비어 있는 문자열을 대신 받지 않는다. 저장 단계에서 검증된 유효 날짜와 시작≤끝을 전제한다.
- `getScheduleGeometry(dates: Readonly<ScheduleDates>, month: string): ScheduleGeometry`: `{ days, unscheduled, bar: { x, width } | null, marker: { x } | null }`. 잘못된 월은 RangeError.
- 단위는 일. 월초 x=0, N일의 막대 시작 x=N-1. 양 끝 inclusive, 당일 width=1. 월 경계를 잘라내고 전부 월 밖이면 null. 윤년/세기년을 달력으로 계산한다.
- 이관 marker는 날짜 중심 x=N-0.5, 월 밖/미입력이면 null. 개발 양 끝 중 하나라도 없으면 unscheduled=true, bar=null; 이관은 독립적이다. 계획이 온전하지만 월 밖인 경우 unscheduled=false.
- 순수 함수이며 입력 수정·저장·상태 추정·실제 완료일 대체·네트워크·타이머 부작용 없음. 범위 밖 연도 이동 및 비정수 offset은 호출 전제 밖이며 UI의 일반 월 이동과 구분한다.

## UI 계약

- 접근성 이름 “간트 보기” checkbox 기본 off. 기존 9열·순서 보존. on일 때 같은 table의 각 프로그램 tr 마지막에 SVG 일정 td 하나와 대응 열 제목을 추가한다. 별도 테이블/세로 스크롤 없음.
- 이전달/다음달/오늘 버튼과 YYYY-MM 표시. 오늘은 현재 로컬 월 복귀. 날짜/상태/등록 레코드는 월 탐색으로 변경하지 않는다.
- SVG viewBox는 `0 0 days height`, 개발 rect x/width와 표식 위치는 SVG 속성으로 표현하며 동적 style 금지. 이관 표식 접근성 이름은 “이관 예정일 YYYY-MM-DD”. 계획이 없으면 같은 일정 셀에 “일정 미정”.
- compact 결정에 따라 긴 값은 말줄임+접근 가능한 전체 값이며 인위적 줄바꿈으로 제품 CSS를 바꾸지 않는다. 공유 tr의 상단/높이 및 좁은 화면 가로 스크롤 후 대응을 검사한다.

## Given–When–Then 대응

각 테스트 이름은 `should 결과 when 조건`이며 아래 ID를 포함한다. 단위는 외부 의존성 없는 순수 함수, 브라우저는 실제 UI 등록과 격리된 저장소를 사용한다.

| ID  | AC      | 분류      | Given                          | When                            | Then                                         | 층·통제           |
| --- | ------- | --------- | ------------------------------ | ------------------------------- | -------------------------------------------- | ----------------- |
| M01 | AC3     | 경계      | 로컬 월초 Date                 | 현재 월 계산                    | 날짜 이동 없이 YYYY-MM                       | unit·Date 주입    |
| M02 | AC3     | 경계      | 12월/1월/일반월                | +1/-1/0 이동                    | 연도 넘김/동일 월                            | unit              |
| M03 | AC1     | 경계      | 윤년·평년·2100·2000·30/31일 월 | 축 계산                         | 29/28/30/31일                                | unit              |
| M04 | AC3     | 예외      | 00/13월·미패딩·잘못된 문자열   | 월 이동/geometry                | RangeError                                   | unit              |
| S01 | AC1     | 정상      | 9/10–9/12 계획                 | 9월 geometry                    | x=9,width=3                                  | unit              |
| S02 | AC1     | 경계      | 월 첫날/말일 당일 계획         | geometry                        | width=1                                      | unit              |
| S03 | AC1     | 경계      | 좌/우/양쪽 초과·직전/직후 월   | geometry                        | clip 또는 null, 미정 아님                    | unit              |
| S04 | AC2     | 경계      | 시작/끝/둘 다 null, 이관 존재  | geometry                        | 미정+이관만                                  | unit              |
| S05 | AC2     | 경계      | 이관 월초/월말/직전/직후/null  | geometry                        | 중앙 좌표 또는 null                          | unit              |
| S06 | AC2     | 빈 값     | 모든 날짜 null                 | geometry                        | 미정, 막대/표식 없음                         | unit              |
| S07 | AC3     | 부작용    | frozen 입력과 다른 실제 완료일 | 두 월 조회                      | 계획 기준 막대, 입력 보존                    | unit              |
| B01 | AC1/AC3 | 정상·회귀 | UI로 1개 등록                  | 토글 on/off                     | 9열→공유행 10열→원래 9열, SVG 속성           | browser·고정 시계 |
| B02 | AC2     | 경계      | UI 등록 시 끝 또는 양 끝 없음  | 현재 월 간트                    | 미정+독립 이관, rect 없음                    | browser·고정 시계 |
| B03 | AC3     | 정상·보존 | UI 등록과 날짜 입력            | 이전/다음/오늘·reload·수정 열기 | 월 표시/월밖 누락, 모든 목록 값 및 날짜 보존 | browser·고정 시계 |
| B04 | AC4     | 경계      | 긴 값 1행·390px 화면           | 일정 셀까지 스크롤              | 같은 tr, 같은 상단/높이, 전체 이름 접근 가능 | browser·고정 시계 |

## 검증·인계

- cwd: `/Users/sungwoon/ai-projects/cc-harness`.
- 허용 실행 순서: `npm run typecheck` → `npm run test -- tests/unit/schedule.test.ts`.
- 브라우저는 page.clock.install을 goto 전에 실행하고 2026-09-13 정오 KST로 고정한다. 등록은 IndexedDB seed가 아니라 사용자 폼을 사용하며 토글 후 오늘을 눌러 입력 날짜와 표시 월을 일치시킨다.
- 브라우저 빌드/실행·전체 check·시각 검수는 메인 전용이며 이 단계에서는 수행하지 않는다. 브라우저 파일 작성/타입 통과는 실제 Red 증거가 아니다.
- src/domain/schedule.ts는 빈 문자열/빈 geometry를 반환하는 최소 stub이며 계산·검증·UI 구현은 없다. 실패 수를 맞추기 위한 throw/skip 없음.
- 실행 결과는 아래 기록 및 최종 JSON으로 인계한다. Red 확보 후 구현하지 않고 종료한다.

### attempt 1 실행 결과

- `npm run typecheck`: exit 0. 신규 unit/browser/stub 포함 타입 검사 통과.
- `npm run test -- tests/unit/schedule.test.ts`: exit 1. 1 파일, 32개 수집·32개 실패·0개 통과, 127ms. 수집/import/문법/환경 오류가 아닌 assertion 실패로 Red 확인.
- 대표 로그: M01 `expected '' to be '2026-09'`; S01 expected `{ days: 30, bar: { x: 9, width: 3 }, marker: { x: 29.5 } }`와 달리 stub은 days=0/bar=null/marker=null; M04 `expected function to throw an error, but it didn't`.
- 실패 원인: 월 포맷/이동, 달력 일수, inclusive 막대·clip·marker·미정 처리 및 월 검증이 미구현이다. 후속 assertion까지 모두 도달했다는 뜻은 아니며 Green 단계에서 전체 계약을 다시 검증해야 한다.
- Red 에이전트 기준 브라우저 5개 테스트 작성, 실행 0회. 메인의 단계 소유 제한에 따라 실행하지 않았다. 이후 실제 실행 결과는 PM-03-result.json을 따른다.
- STOP: 요청한 시나리오+단위 Red 확보. 메인에 인계하며 구현·기존 테스트 수정·커밋은 하지 않는다.
