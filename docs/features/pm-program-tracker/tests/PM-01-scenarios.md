# PM-01 · 등록·저장 테스트 시나리오

상태: G5 승인 완료. 계약과 Red 진행 질문에 사용자가 “네 진행합시다”라고 답했다. Red 결과는 PM-01-red.md를 따른다. Green은 미착수다.

## 근거와 범위

- [승인 이슈 PM-01](../issues.md), [요구사항](../spec-fixed.md)의 D12–D33, [PRD](../prd.md), [디자인](../design.md)을 따른다.
- PM-00은 완료: src/App.tsx는 빈 장부와 등록 준비 메시지만 있으며 저장 모듈은 없다. Vitest와 fake-indexeddb, Playwright 기반을 재사용한다.
- 등록에서 노출하는 필드에도 승인된 날짜·상태 검증을 적용한다. 기존 행 수정·간트·검색·백업·삭제·Excel·탭 잠금·오프라인 실행은 구현하지 않는다.

## 함수·저장 계약 제안

아래 이름·경로는 향후 구현 계약이지 현재 존재하는 API가 아니다. 원격 HTTP API는 없다.

### 데이터 타입

- ProgramStatus: `개발 대기 | 개발 중 | 개발 완료 | 테스트 완료 | 이관 완료`.
- ProgramDraft: module, programName, changeType, owner, plannedStartDate, plannedEndDate, actualCompletionDate, transferDate, status. 폼 입력은 모두 문자열로 보관한다.
- ProgramInput: 식별 값은 trim 후 uppercase, 선택 텍스트는 입력 보존, 빈 날짜는 null이며 나머지 날짜는 YYYY-MM-DD. 상태는 ProgramStatus.
- ProgramRecord: ProgramInput + 내부 id. id는 저장 경계에서 생성한다. 정규화한 module/programName의 복합 unique index를 별도로 둔다. 문자열 단순 연결을 식별 키로 쓰지 않는다.
- ValidationResult: `{ ok: true, value: ProgramInput }` 또는 `{ ok: false, fieldErrors: Partial<Record<keyof ProgramDraft, string>> }`.
- ProgramStoreError: code=`duplicate | storage`, 사용자 표시용 message, 선택적 원인. 원시 오류·사용자 전체 입력을 로그에 노출하지 않는다.

### 순수 함수

제안 경로 `src/domain/program.ts`:

- `createProgramDraft(): ProgramDraft` — 동기. 식별/선택/날짜는 빈 문자열, 상태만 개발 대기. 부작용 없음.
- `validateProgramDraft(draft: ProgramDraft): ValidationResult` — 동기. 초안 불변, 필수·상태·달력 날짜·계획 순서 검증. 빈 상태는 오류이며 UI에서 기본값을 제공한다. 다른 날짜와 상태는 자동 변경하지 않는다.

### 저장 경계

제안 경로 `src/data/program-repository.ts`:

- `createProgramRepository(options?: { factory?: IDBFactory; databaseName?: string; createId?: () => string }): ProgramRepository` — 동기 factory. DB 열기는 최초 비동기 작업 시 수행한다. 테스트에는 별도 factory·이름·ID 생성기를 주입한다.
- `ProgramRepository.list(): Promise<ProgramRecord[]>` — 저장된 목록을 읽는다. 제품 정렬 기능은 없으며 테스트가 우연한 반환 순서에 의존하지 않는다. 읽기 실패를 빈 배열로 숨기지 않는다.
- `ProgramRepository.create(input: ProgramInput): Promise<ProgramRecord>` — 검증된 입력을 신규 추가하며 기존 행 갱신에는 사용하지 않는다. 트랜잭션 완료 후에만 resolve. 복합 키 충돌은 duplicate, DB 열기/쓰기/abort 실패는 storage로 reject한다.
- `ProgramRepository.close(): Promise<void>` — 테스트·종료에서 연결을 닫는다. 진행 중인 작업 처리 후 종료하며 데이터를 삭제하지 않는다.

DB 이름 `pm-program-tracker`, 초기 버전 1, object store `programs`, keyPath `id`, unique index `identity`=[module, programName]를 제안한다. 테스트는 프로덕션 DB 이름을 사용하지 않는다. 향후 스키마 변경은 별도 마이그레이션 검토를 거친다.

### UI 연결

- App의 저장 의존성을 주입 가능하게 둔다. 초기 목록 읽기와 폼 초안은 분리하고 성공한 create 결과만 목록에 반영한다.
- 초기 로드 실패는 오류·재시도 상태이며 신규 등록은 로드 성공 후 허용한다. 읽기 실패를 새 빈 DB로 오인하지 않는다.
- 저장 중 중복 제출 금지, 실패 시 초안/기존 목록 유지, 성공 시 폼을 닫고 목록 반영. `role=alert`와 필드 오류 연결, 포커스 진입·복귀·순환을 검사한다.
- 실패 주입은 테스트용 의존성 또는 테스트 전용 번들에서만 한다. production query parameter나 전역 실패 스위치를 추가하지 않는다.
- 미저장 초안을 브라우저 종료 후 복구하는 기능은 범위 밖이다. 등록 저장 후 재열기 지속성은 필수다.

## 시나리오

각 항목의 문장은 Given(사전 조건) → When(동작) → Then(기대 결과)을 명시한다. 아래 ID는 테스트 코드의 이름/메타데이터와 연결한다.

### S01 · should normalize identifiers when surrounding whitespace and lowercase exist

- AC: PM-01-AC1 / PM-01-AC2; 층: 순수 함수.
- Given / When / Then: 모듈 `le`, 프로그램명 `zgwlej10000`를 검증하면 `LE`, `ZGWLEJ10000`이 되고 원본 초안은 바뀌지 않는다.

### S02 · should reject required fields when blank after trimming

- AC: PM-01-AC2; 층: 순수 함수.
- Given / When / Then: 빈 문자열·공백만 있는 모듈 또는 프로그램명을 검증하면 해당 필드 오류를 반환하고 저장을 호출하지 않는다.

### S03 · should preserve optional blanks when only required fields exist

- AC: PM-01-AC1; 층: 순수 함수.
- Given / When / Then: 기본 초안에서 식별 값만 입력하면 개발 대기이며 나머지 텍스트는 빈 문자열, 날짜는 null이다. 실제 날짜를 추정하지 않는다.

### S04 · should accept manual status when one of five valid values is selected

- AC: PM-01-AC1; 층: 순수 함수.
- Given / When / Then: 다섯 상태 각각으로 신규 등록을 검증하면 입력한 상태를 유지한다. 개발 완료를 선택해도 실제 완료일은 자동 생성하지 않는다.

### S05 · should reject status when missing or outside the allowed set

- AC: PM-01-AC2; 층: 순수 함수.
- Given / When / Then: 명시적으로 빈 상태 또는 알 수 없는 상태를 검증하면 status 필드 오류다. UI 기본값 제공과 잘못된 입력 묵인을 구분한다.

### S06 · should preserve optional text when Korean and markup-like text exist

- AC: PM-01-AC1; 층: 순수 함수·브라우저.
- Given / When / Then: 담당자·변경 유형에 한글 및 HTML처럼 보이는 문자를 입력하면 문자열로 저장·표시하고 실행하지 않는다. 식별 값 외에는 대문자 변환하지 않는다.

### S07 · should validate calendar dates when leap days or impossible dates exist

- AC: PM-01-AC2; 층: 순수 함수.
- Given / When / Then: 2028-02-29는 허용하고 2027-02-29·2026-02-30·잘못된 형식은 필드 오류다. 날짜를 UTC 시각으로 변환해 하루 이동시키지 않는다.

### S08 · should accept same-day plans and reject reversed plans when both dates exist

- AC: PM-01-AC1 / PM-01-AC2; 층: 순수 함수.
- Given / When / Then: 시작=완료는 허용, 시작<완료는 허용, 시작>완료는 오류다. 한쪽만 비어 있으면 등록 허용이며 일정 미정이다.

### S09 · should preserve actual completion when it differs from the plan

- AC: PM-01-AC1; 층: 순수 함수.
- Given / When / Then: 유효한 실제 완료일이 계획보다 빠르거나 늦어도 허용하고 계획 값을 변경하지 않는다.

### S10 · should persist a new program when the transaction commits

- AC: PM-01-AC1; 층: 저장 통합.
- Given / When / Then: 격리된 IndexedDB에서 검증된 입력을 create한 뒤 연결을 닫고 다시 list하면 모든 필드와 안정적인 id가 유지된다.

### S11 · should reject duplicate identifiers when normalized keys match

- AC: PM-01-AC2; 층: 저장 통합·브라우저.
- Given / When / Then: 기존 LE/ZGWLEJ10000에 공백·소문자 변형으로 등록하면 duplicate 오류이며 기존 행 값·개수는 그대로다.

### S12 · should allow distinct identities when either key component differs

- AC: PM-01-AC1 / PM-01-AC2; 층: 저장 통합.
- Given / When / Then: 같은 프로그램명·다른 모듈과 같은 모듈·다른 프로그램명은 서로 다른 행으로 추가된다. 두 필드를 모호하게 이어붙여 키 충돌을 만들지 않는다.

### S13 · should reject one concurrent duplicate when two creates race

- AC: PM-01-AC2; 층: 저장 통합.
- Given / When / Then: 동일 식별 값 create 두 개를 동시에 요청하면 정확히 하나만 성공하고 하나는 duplicate다. 한 행만 저장된다. 전체 탭 잠금 기능은 PM-09 대상이다.

### S14 · should report storage failure when opening or committing fails

- AC: PM-01-AC3; 층: 저장 통합·주입 경계.
- Given / When / Then: DB 열기 실패 또는 트랜잭션 abort를 유발하면 storage 오류이며 기존 행이 보존된다. 요청 성공 이벤트만으로 저장 성공 처리하지 않는다.

### S15 · should show a load error rather than empty data when list fails

- AC: PM-01-AC3; 층: UI 주입 경계.
- Given / When / Then: 초기 list가 실패하면 빈 목록이라고 오인시키지 않고 로드 오류·재시도 안내를 표시한다. 읽기 실패를 이유로 저장소를 비우지 않는다.

### S16 · should open registration from the empty ledger when the entry is activated

- AC: PM-01-AC1; 층: 브라우저.
- Given / When / Then: 빈 장부에서 등록 버튼을 키보드로 누르면 이름 있는 폼/대화상자가 열리고 모듈 입력으로 포커스가 이동한다. 기본 상태는 개발 대기다.

### S17 · should show committed program and retain it after reload when save succeeds

- AC: PM-01-AC1; 층: 브라우저.
- Given / When / Then: 입력·저장 후 목록에 정규화된 식별 값·담당자·변경 유형·상태·날짜가 표시되고 새로고침 후 유지된다. 날짜가 없으면 일정 미정이다. 간트 막대는 PM-03에서 구현한다.

### S18 · should retain draft and existing list when save fails then retry

- AC: PM-01-AC3; 층: UI 주입 경계·브라우저.
- Given / When / Then: 기존 목록과 초안이 있는 상태에서 create를 실패시키면 폼은 유지되고 오류와 재시도가 표시된다. 다시 시도해 성공하면 한 번만 추가된다. 재시도 전 성공 안내는 없다.

### S19 · should prevent double submission while saving

- AC: PM-01-AC1 / PM-01-AC3; 층: UI 주입 경계.
- Given / When / Then: 지연시킨 create 중 저장 버튼을 반복 조작하면 추가 호출을 만들지 않는다. 완료 후 상태가 복구된다.

### S20 · should preserve data and return focus when registration is cancelled

- AC: PM-01-AC1 / PM-01-AC3; 층: 브라우저.
- Given / When / Then: 빈 초안은 취소 시 닫히고 등록 버튼으로 포커스가 돌아온다. 변경된 초안은 폐기 확인을 거치며 거절하면 초안을 유지하고 저장은 호출하지 않는다.

## 커버리지와 통제할 의존성

| 이슈 AC                               | 시나리오                                        |
| ------------------------------------- | ----------------------------------------------- |
| PM-01-AC1 등록·정규화·재열기          | S01·S03·S04·S06·S08·S09·S10·S12·S16·S17·S19·S20 |
| PM-01-AC2 빈 값·중복·기존 데이터 보존 | S01·S02·S05·S07·S08·S11·S12·S13                 |
| PM-01-AC3 저장 실패·초안 보존·재시도  | S14·S15·S18·S19·S20                             |

- IndexedDB: 각 테스트마다 새 IDBFactory 또는 격리된 브라우저 context. 동시 create의 unique 충돌과 transaction abort는 실제 fake-indexeddb 경계로 확인한다.
- 시각/시간: 오늘 날짜를 자동 입력하지 않으므로 현재 시각 mock에 의존하지 않는다. 날짜 전용 문자열은 서로 다른 시간대에서도 동일 값을 유지하도록 검증한다.
- 비동기: 지연 저장 promise로 pending·중복 제출·실패 후 재시도를 통제한다. 실패시 기존 레코드의 필드와 개수까지 비교한다.
- UI: 390/768/1440px, 키보드·긴 한글·식별자와 오류 상태를 확인한다. 저장 기능 데이터 테스트와 시각 승인은 분리한다.
- 규모: 약 100개 저장·읽기는 대표 데이터 회귀에 포함하되 최대 제한·응답 시간 수치를 임의로 확정하지 않는다. 최소 입력은 식별 두 값+기본 상태, 날짜 경계는 같은 날/전후/윤일로 검증한다.

## Red 인계와 기존 테스트 변경

- 승인 후 `tests/unit/program.test.ts`, `tests/unit/program-repository.test.ts`, `tests/browser/program-registration.spec.ts`에 해당 시나리오를 배치한다. UI 실패 주입 테스트 방식은 기존 러너 재사용을 우선한다.
- PM-00의 “등록은 다음 단계에서 연결” 안내 assertion은 PM-01에서 실제 폼 진입 assertion으로 교체한다. 단순히 기존 assertion을 삭제하거나 skip하지 않고, 빈 상태·포커스·폭 검사를 유지한다.
- 최소 stub을 만들고 미구현 동작 때문에 실패하는 Red를 확인한다. import·문법·DB 환경 오류는 Broken이며 Red 증거로 쓰지 않는다.
- 이 문서는 테스트 설계만 작성한 것이다. 새 테스트가 실행·통과한 것은 아니다.

## G5

- [x] 계약과 시나리오 검토 완료: 사용자 “네 진행합시다”
- [x] Red 수행 범위 승인: 계약으로 실패 테스트 작성 진행 질문에 동의

기존 기본 요구사항은 다시 묻지 않는다. 새 내부 저장 계약·시나리오 검토 후 PM-01 Red로 인계한다. 실제 사용자 데이터 삭제·초기화는 수행하지 않는다.
