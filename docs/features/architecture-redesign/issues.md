# 아키텍처 재설계 로컬 이슈 v1

- 기준: `prd.md` v1, `spec-fixed.md` R1–R6.
- 상태: 명령별 오류 인터페이스 정정 후 G4 독립 감사 PASS. 로컬 이슈이며 외부 등록 없음.
- 크기: 각 이슈는 독립 시연 단위다. 변경이 기본 4파일 예산을 넘으면 이유·최소 범위를 진행 기록에 남긴다.

| 순서 | ID    | 완료 시 보이는 동작                                            | 선행  | 범위                       |
| ---- | ----- | -------------------------------------------------------------- | ----- | -------------------------- |
| 1    | AR-01 | 기존 handoff 명령이 같은 입력에서 같은 결정·저장 결과를 낸다   | 없음  | 순수 코어 추출과 설치 회귀 |
| 2    | AR-02 | 로컬 대표 입력의 판정과 동일 corpus 기준선 차이를 읽을 수 있다 | AR-01 | 오프라인 평가              |
| 3    | AR-03 | 중복이 입증된 검사만 줄고 문서·HTML이 실제 결과를 설명한다     | AR-02 | 검사·문서 정렬             |

## AR-01: 기존 인계 동작을 보존하며 순수 판정 경계 만들기

- PRD 근거: R1, R2, R6. 사용자 가치: 기존 `prepare|decide|claim|receipt`를 그대로 쓸 수 있고 같은 STOP을 얻으며 손상된 저장 receipt는 거부한다.
- 포함: 새 내부 추상화 하나 `scripts/handoff-core.mjs`; 순수 `validateSemantic`/`validateRecord`/`canonical`/`digest`/`checkReferenceLineage`와 `decideHandoff(record,{currentProblem,sessionId})`, `prepareHandoff(prev,input)`, `claimHandoff`, `receiptHandoff`의 복제 기반 전환. CLI는 파일·Git·lock·notice·prompt I/O를 소유한다. `distributionTools` 등록과 설치된 helper 실행 회귀까지 포함한다.
- 제외: schema/명령/STOP/예산/계보 변경, 승인 issuer·`verified` 발급. 분리는 기존 동작에 맞춰 조정하되 새 클래스·의존성은 추가하지 않는다.

### Acceptance Criteria

- [ ] AR-01-AC1: Given 기존 정상·거부 handoff fixture와 같은 HEAD/dirty 입력, When 변경 전후 `prepare|decide|claim|receipt`를 실행하면, Then 결정 ID, 종료 코드, JSON schema, 지속 상태와 기존 STOP 우선순위가 각각 동일하다.
- [ ] AR-01-AC2: Given 활성 STOP·소진 예산·퇴역 참조 재활성화·자기 선언 승인 fixture, When 판정하면, Then 기존 STOP/거부가 유지되고 로컬 상태·해시만으로 실행 승인이나 `verified`가 발급되지 않는다.
- [ ] AR-01-AC3: Given 등록된 배포 목록으로 설치한 복사본, When 설치된 handoff helper를 실행하면, Then 내부 코어 import가 해결되고 원본과 같은 입력 판정이 나온다.
- [ ] AR-01-AC4: Given 저장 receipt의 session ID가 placeholder이거나 `receipt.executor_id`가 claim executor와 다른 기록, When `decide`가 읽으면, Then `STOP_MALFORMED`를 반환한다. When `claim` 또는 `receipt`가 읽으면, Then 기존 stderr와 nonzero 종료로 거부한다. 유효 receipt의 결과는 변경 전과 동일하다.

### 검증 계획

기존 `tests/unit/harness-portability.test.ts` 관련 회귀와 대표 CLI fixture, 설치 dry-run/apply helper 실행을 사용한다. Red에서 확인한 실패와 Green 및 독립 AC 판단을 분리한다. 예상 변경: core·CLI·registry·회귀 테스트의 최소 범위.

## AR-02: 대표 fixture를 같은 입력 기준선과 비교하기

- PRD 근거: R3. 사용자 가치: 실패 ID와 입력 해시를 보고 재현 가능한 평가 결과를 얻는다.
- 포함: 비밀 없는 기존 사례 중 정상·STOP·예산·계보·승인 자기 선언을 대표 corpus로 고정하고 로컬 실행 결과에 `case_id`, `input_sha256`, 기대/실제 decision, `pass`, `baseline_decision`, 변화 여부와 비교 가능성을 기계가 읽을 수 있게 남긴다. 기준선은 같은 corpus·입력 해시를 사용한다.
- 제외: 운영 trace, 외부 전송, SaaS, 유료 judge, AC 의미 자동 승인.

### Acceptance Criteria

- [ ] AR-02-AC1: Given 동일 case ID·입력 해시의 baseline과 현재 판정, When 오프라인 평가를 실행하면, Then 각 case의 기대/실제 ID, pass/fail, baseline 변화 여부가 결정론적 JSON으로 기록된다.
- [ ] AR-02-AC2: Given case 누락·해시 불일치·중복 ID 또는 비교 불가능한 baseline, When 평가를 실행하면, Then 이를 pass로 계산하지 않고 해당 실패 ID와 이유가 기계 판독 가능한 결과에 남으며 명령은 실패한다.
- [ ] AR-02-AC3: Given 승인 파일에 `approved`와 올바른 해시만 쓴 자기 선언 사례, When 평가하면, Then 구조 검사 결과와 실제 승인 출처 미확인을 구분하고 실행 권한이 확인되었다고 표시하지 않는다.

### 검증 계획

로컬 runner의 정상·입력 변조·누락 기준선 사례와 현재 CLI 결과를 비교한다. baseline은 변경 전 같은 입력의 실제 관찰로 생성하고 버전/해시를 기록한다. Green slice의 fixture 통과를 제품 전체 수용으로 쓰지 않는다.

## AR-03: 검사 호출과 문서·시각 보고서 정렬하기

- PRD 근거: R4, R5. 사용자 가치: 실제로 필요한 검사와 현재 계약을 한 곳에서 확인한다.
- 포함: 실제 중복이 입증된 호출만 제거한다. `npm run check`의 lint·design·harness·format·test·typecheck 구성과 실패 동작 유지. 현 검사 체인에서 디자인 검사는 이미 한 번이므로 그대로 둔다. 훅 payload가 관련 쓰기를 신뢰성 있게 알려줄 때만 매 Bash CSS 재검사를 조건화하고, 불가능하면 현행 훅을 유지하며 이유를 기록한다. 문서·스킬·구조도·HTML 보고서에 구현/검증 상태와 역사적 증거 시점을 맞춘다.
- 제외: 범용 Markdown 앵커 파서 추가. 현재 검토한 16/16 링크가 유효하므로 문제 재현 전까지 보류한다. 훅 비활성화·필수 검사 완화·외부 게시도 제외한다.

### Acceptance Criteria

- [ ] AR-03-AC1: Given 변경 전후 검사 호출 목록, When 관련 검사와 최종 `npm run check`를 실행하면, Then 제거한 각 호출의 중복 근거가 기록되고 최종 체인·실패 감지는 유지된다. 디자인 검사 1회 구성이 보존된다.
- [ ] AR-03-AC2: Given 훅 payload에서 쓰기 판별이 가능한 경우, When 관련 파일 쓰기·무관한 읽기 명령을 각각 실행하면, Then 관련 쓰기에는 검사하고 읽기에는 중복 검사를 생략한다. 판별이 불가능하면 훅 동작을 바꾸지 않고 그 사실을 기록한다.
- [ ] AR-03-AC3: Given 새 구현·평가의 실제 로그, When 문서·구조도·HTML을 대조하면, Then 명령·권한·STOP·검증 상태가 일치하고 과거 결과와 이번 결과가 서로 다른 시점으로 표시된다.

### 검증 계획

관련 정적 검사 1회, 변경된 훅이 있다면 훅 smoke test, 마지막 전체 `npm run check` 1회. HTML 브라우저 렌더링은 실제 실행할 수 있을 때만 완료로 표기한다. 독립 검증자가 AC·승인 출처·범위와 로그를 감사한다.

## [GATE 4] 이슈 목록

- 대상/모드: v1, `auto-with-audit`.
- 구현 승인 근거: `spec-original.md`. AI가 수직 분해·AC·의존성을 작성했다.
- 독립 검증자: `/root/redesign_contract_verify`. 조건부 PASS에서 AR-01-AC4의 명령별 오류 인터페이스를 정밀화하라는 지적을 받아 위 AC에 반영했다.
- 상태: 지적 해소 후 G4 최종 독립 판정 PASS (`spec-fixed.md` `f6e10ff6…`, `issues.md` `1c9024a1…`). 구현·AC 검증은 별도다.
- 외부 이슈·보드 등록: 권한 없음, 미실행.

## 2026-10-02 구현 상태

- AR-01: 수정 후 독립 구현 AC PASS. 관련 Vitest 133/133이며 최종 통합 검사는 [현재 진행 기록](progress.md)에 분리해 기록한다.
- AR-02: 전역 기준선 오류의 행별 성공 표시를 수정한 뒤 독립 구현 AC PASS. 로컬 평가 14/14, 관련 Vitest 4/4이며 승인 출처는 확인하지 않는다.
- AR-03: 검사 중복 없음, 디자인 검사 한 번 유지, 앵커 16/16 유효, 훅 payload 쓰기 대상 미판별로 훅 유지. 문서·HTML 정렬과 최종 `npm run check` 종료 0을 확인했으며 독립 AC1/2/3 모두 PASS다.

이 상태 단락은 위 G4 계약 감사 후의 구현 관찰이다. 위 AC 문구와 당시 계약 감사 해시는 변경하지 않았다.
