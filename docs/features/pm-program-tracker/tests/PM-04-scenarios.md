# PM-04 · 시나리오와 Red

## 근거·승인 경계

- 근거: spec-fixed.md D33, issues.md PM-04-AC1–AC3 (D32·D33 / AC14·AC15), 기존 ProgramRecord 및 PM-03 동일 tr/SVG 구조.
- G5 위임: 실제 사용자 원문은 ../auto-run.md를 따른다. 메인이 승인 범위 안에서 이 에이전트에 PM-04 scenarios+Red만 위임했으며, 에이전트는 Green을 수행하지 않는다.
- 선행 PM-03 unit76/browser63/exit0은 메인 제공 검증 결과이며 이 Red 에이전트가 재실행한 것은 아니다. 기존 PM-03 작업 파일은 보존한다.
- STOP: “기존tests수정금지,UI구현금지,unitRed+typecheck만실행(browser메인).” progress.md는 허용 파일 밖이므로 G5 근거를 여기에 보존하여 메인에 인계한다.
- 지정 네 파일과 tmp/pm-04-red-unit.json 로그만 작성한다. 새 의존성 없음.

## 동기 함수 계약

- `filterPrograms(records: readonly Readonly<ProgramRecord>[], conditions: Readonly<ProgramFilter>): readonly Readonly<ProgramRecord>[]`.
- 조건은 선택적 query/module/owner/status. 생략한 필터는 전체, owner 빈 문자열은 미지정 담당자만 선택한다. status는 기존 ProgramStatus다. 모듈·담당자는 저장된 값과 정확히 일치하는 단일 선택이다.
- query는 trim 후 대소문자 무시. 전체 입력을 하나의 literal substring으로 module/programName/owner/changeType 중 하나에서 찾는다(OR). 토큰 분리·정규식 해석·필드 간 문자열 합성 없음. 빈 검색은 전체다.
- 검색·세 필터는 AND. 결과는 입력 상대 순서와 모든 필드를 유지하며 새 정렬을 하지 않는다. 배열 객체 동일성이나 복사는 요구하지 않는다.
- 빈 입력·불일치·존재하지 않는 필터 값은 빈 배열이며 예외를 던지지 않는다. 타입 밖 입력의 런타임 검증은 범위 밖이다.
- 입력 배열·레코드·조건은 불변. 저장·네트워크·시계 부작용 없음. stub은 입력 반환만 하며 실제 필터 구현은 하지 않는다.

## UI 가정 (기존 구현 사실이 아님)

- 검색 textbox 접근성 label “프로그램 검색”, 단일 select label “모듈 필터”, “담당자 필터”, “진행 상태 필터”, button “조건 초기화”. 옵션 표시명 “전체”, 담당자 빈 값 표시명 “미지정”.
- 결과 수는 “결과 N건” 또는 “검색 결과 N건”으로 표시한다고 가정한다. 0건 안내와 행 없음, 초기화 시 검색·세 선택 모두 기본값 및 원본 전체 복원을 검증한다.
- 옵션은 현재 결과가 아닌 전체 records 기반으로 유지한다. 상태 옵션에 고정 상태 전체를 포함하는 것은 허용한다.
- 기존 단일 table의 같은 tr 안에 프로그램과 SVG가 대응한다. 결과 순서는 최초 UI 목록의 상대 순서를 유지한다.
- Playwright 테스트마다 독립 context/storageState, UI 등록만 사용. 저장소 직접 주입 없음. 검색 이후 reload 및 초기화로 저장 데이터 전체 필드 보존을 확인한다. 조건 자체의 reload 영속성은 요구하지 않는다.

## Given–When–Then

| ID  | AC  | 분류      | Given                         | When                         | Then                                    | 층·격리                    |
| --- | --- | --------- | ----------------------------- | ---------------------------- | --------------------------------------- | -------------------------- |
| S01 | AC1 | 정상      | 네 필드가 다른 레코드         | 공백·대소문자 섞인 부분 검색 | 필드별 OR 일치만 원래 순서              | unit/B01, 외부 의존성 없음 |
| S02 | AC1 | 경계      | 전체 레코드                   | 빈 문자열·공백 검색          | 원본 전체                               | unit/B01                   |
| S03 | AC1 | 예외·경계 | 공백 및 특수문자 이름         | 전체 구절·.*·[ 검색          | literal 일치, 토큰 분리 없음, 예외 없음 | unit/B01                   |
| S04 | AC2 | 정상      | 각 조건 하나만 다른 제외 후보 | 검색·세 필터 선택            | AND 결과 2행, 목록과 SVG 순서 동일      | unit/B02                   |
| S05 | AC2 | 경계      | 빈 담당자 및 비슷한 필드      | 개별 필터·미지정 선택        | 정확히 일치한 결과만                    | unit/B03                   |
| S06 | AC3 | 예외      | 빈 입력 또는 불일치           | 검색·없는 값 필터            | 빈 배열/UI 0건 안내                     | unit/B04                   |
| S07 | AC3 | 정상·경계 | frozen 입력과 등록 데이터     | 검색 후 초기화·reload        | 입력 불변, 전체 필드 및 순서 복원       | unit/B04, UI 격리 저장     |
| S08 | AC2 | 경계      | 전체 records 옵션             | 필터와 0건 검색              | 전체 옵션 유지                          | B05, UI 격리 저장          |

## 실행·인계

- 대상 단위 Red: `npx vitest run tests/unit/program-filter.test.ts --reporter=json --outputFile=tmp/pm-04-red-unit.json`.
- 타입 검사: `npm run typecheck`.
- 브라우저 실행은 메인 담당: `npx playwright test tests/browser/program-filter.spec.ts`. 이번에는 실행하지 않는다.
- 전체 CI·Green·UI 구현·기존 테스트 수정·progress 수정은 하지 않는다. 실제 실행 결과는 JSON 응답과 위 로그로 인계한다.
