# 아키텍처 재설계 잔여 로컬 이슈 · 최신 G4 계약 PASS

- 기준: [요구사항 v2](spec-fixed-v2.md) R7–R9와 [PRD v2](prd-v2.md). AR-01~03은 커밋 `228fea9`의 역사적 완료 범위이며 이 목록에서 재구현하지 않는다.
- 사용자에게 보이는 완료 단위: 규범·구조도를 읽어 권한 경계를 알 수 있음 → 실제 도구 중복/오류에 대한 근거 있는 조치 → 같은 작업량의 효과와 한계를 읽을 수 있음.
- 각 이슈의 코드·문서 수정은 해당 범위에서만 한다. 기본 4파일 변경 예산을 넘는 AR-04는 하나의 규범 출처와 여러 파생 진입점의 모순을 함께 닫기 위해 필요하다. 이유와 실제 변경 파일은 진행 기록에 남기고 새 의존성은 0개다.

| 순서 | ID    | 수직 결과                                                      | 선행                                             | 핵심 요구 |
| ---- | ----- | -------------------------------------------------------------- | ------------------------------------------------ | --------- |
| 4    | AR-04 | 승인·STOP·인계의 동일 규칙을 문서·구조도에서 읽는다            | 공통 G4/G5 계약 감사                             | R7        |
| 5    | AR-05 | 앵커 결함을 고치고 훅 cache 후보를 측정해 채택 여부를 결정한다 | 공통 G4/G5 계약 감사                             | R8        |
| 6    | AR-06 | 같은 workload의 관찰 수치와 미측정 범위를 보고서에서 읽는다    | AR-04 AC1–3·AR-05 AC1–4 독립 판정; AC5는 측정 뒤 | R9        |

AR-04의 규범 문서·구조도와 AR-05의 검사기·집중 회귀는 파일 소유가 분리돼 공통 계약 감사 뒤 병렬 구현할 수 있다. AR-06 측정은 AR-04 AC1–3 및 AR-05 AC1–4의 독립 판정 뒤 진행한다. AR-05 AC5는 그 동일 workload 측정과 함께 판정하고 AR-06 최종 보고서는 두 결과의 실제 증거를 받는다.

## AR-04: 규범 출처와 파생 뷰 정렬

- 포함: `docs/harness/lifecycle.md` §5의 기존 권한 계약을 규범으로 참조한다. `delivery-automation.md` 게이트·단계 입력표, `planning.md`, `feature-planner`, `test-scenarios`, `tdd-auto-loop`, `create-pr`의 중복 표현을 실행 요약과 규범 절 링크로 정리한다. 실제 중복이 없는 단계 계약은 보존한다. `docs/architecture/index.html`의 사람 게이트 표기를 G1 목적·가치, 승인 범위 안 G2/G3, 독립 감사 G4/G5, 별도 외부 권한으로 구분한다.
- 제한: G1의 중요한 목적·가치 충돌은 사용자 결정이며, G2/G3의 위임은 승인 결과 범위 안에서만, G4/G5는 분리된 감사 후에만 가능하다. `tdd-auto-loop`의 일반 구현 승인과 유한 자동 반복 위임을 혼동하지 않는다.

### Acceptance Criteria

- AR-04-AC1: Given 규범 절과 각 실행 진입 문서, When 승인·외부 권한·STOP 문구를 대조하면, Then 파생 문서는 `lifecycle.md` §5를 가리키고 서로 다른 권한이나 매 단계 재승인을 요구하지 않는다. `delivery-automation.md`의 단계 입력표는 자료 요건과 승인 행동을 구분한다.
- AR-04-AC2: Given `tdd-auto-loop`의 유효한 사용자 재시도 상한과 승인된 G2 범위, When 예산·아키텍처 전환을 설명하면, Then Green 상한은 `min(3, 1 + user_approved_retry)`이며 예산 초기화가 없고 새 구조가 유효한 G2 envelope 안인지 먼저 판정한다. 범위 밖 구조는 사용자 게이트로 상향한다.
- AR-04-AC3: Given 넓은 화면과 400px 구조도, When 단계·목차·포커스를 확인하면, Then G1/G2·G3/G4·G5/별도 외부 권한과 checkpoint/RESUME/CLI 로컬 검사 경계가 읽히고 기존 15개 스킬·단계 링크가 유지된다. 정적 디자인 통과와 실제 렌더를 구분한다.

### 검증 계획

문구·링크 정적 대조, `npm run design:check`, 실제 브라우저의 넓은/400px·키보드 포커스, 독립 계약/AC 검토. 다른 앱 디자인을 바꾸지 않는다.

## AR-05: 도구 결함·중복의 재현 기반 정리

- 확인된 결함: `scripts/check-harness.mjs`는 `rawLink.split(/[?#]/)[0]`으로 fragment를 버린다. 상대 Markdown 제목/명시적 앵커와 로컬 HTML `id`를 확인하는 최소 검사를 추가한다. 외부 URL은 기존 범위 밖이다.
- 중복 조사: `npm run check`의 디자인 검사는 1회다. portability Vitest는 설치본에 `--apply`한 뒤 대상 검사기를 이미 자동 실행한다. 중복 트리거를 추가하지 않는다.
- 실험한 훅 후보: `check-design-system`의 기본 대상 네 입력(`docs/design-system/colors.md`, `typography.md`, `spacing.md`, `docs/architecture/index.html`)과 checker 자신의 SHA 및 root identity로 성공 snapshot을 만들었다. 후보 `--hook`은 동일 성공 snapshot에서만 cache hit로 처리했고 기본 `design:check`/`npm run check`는 항상 full이었다. 사용자 전용 OS 임시 디렉터리(0700)·파일(0600)에 full 성공 후 원자 기록하는 코드는 [후보 원문](evidence/ar05-cache-candidate.mjs.txt)에 보존한다.
- 운영 결정: [W1/W2 측정](evidence/ar06-measurements.md)에서 후보의 full 파싱 감소와 오류 복구는 확인했지만 wall 개선은 입증되지 않았고 유지 비용에 비해 출력 절감이 작았다. AI 기술 판단으로 cache를 운영 불채택하고 운영 checker를 기준판 SHA로 복원했다. 기본·`--hook` 모두 full 검사다. 직접 `--hook` 측정과 native hook trust/dispatch는 구분한다.

### Acceptance Criteria

- AR-05-AC1: Given 변경 전 검사 호출 그래프와 동일 명령, When 중복 후보를 확인하면, Then 각 후보의 호출 수·근거가 기록되고 디자인 1회와 설치본 회귀에 중복 트리거를 추가하지 않는다.
- AR-05-AC2: Given 상대 Markdown 링크의 유효/깨진 제목·명시적 앵커·중복 제목·markup·percent encoding·fenced fake heading과 로컬 HTML `id`, When 등록 검사를 실행하면, Then 실제 대상만 통과하고 깨진 fragment는 nonzero로 실패한다. 외부 URL은 현행대로 제외하며 지원하지 않는 로컬 fragment는 성공으로 위장하지 않는다.
- AR-05-AC3: Given 보존한 후보 checker의 기본 target·알려진 인자 `--hook`과 네 입력·checker·root의 동일 SHA snapshot 및 직전 full 성공, When 같은 호출을 반복하면, Then 후보는 동일 상태에서만 full 파싱을 생략하고 cache hit로 구분한다. 후보의 일반 `design:check`와 `npm run check`는 항상 full이며, 이 실험 성공을 운영 채택으로 취급하지 않는다.
- AR-05-AC4: Given 후보 checker의 입력/스크립트/root 변경, 명시적 target·알 수 없는 인자, cache 누락·손상·symlink·읽기/쓰기 오류·지원 불가 플랫폼, When 후보 `--hook`을 호출하면, Then cache hit를 금지하고 실제 대상 full 검사를 실행한다. 유효 입력은 full 성공 코드 0, 무효 입력은 기존 오류 진단과 nonzero다. 실패는 직전 성공 cache의 서명·바이트를 덮어쓰지 않는다. cache 자체의 오류가 필수 검사를 false pass로 만들지 않는다. Bash 명령·stdin의 쓰기 추정은 판정 근거가 아니다. 운영 checker에는 후보 cache가 남지 않는다.
- AR-05-AC5: Given 동일 workload의 cold/warm 최소 3회와 기본 full 실행, When 시간·scan 횟수·종료 코드·실패 감지와 유지 비용을 비교하면, Then raw log·측정 범위·운영 채택/기각 이유를 남기고 채택하지 않으면 운영 checker가 기준 SHA의 full 경로인지 확인한다. native hook trust/dispatch는 실제 관찰 전 `unknown`이며 직접 entry 측정을 native 증거로 부르지 않는다.

### 검증 계획

앵커 Red를 먼저 보존하고 Green·기존 링크 회귀를 확인한다. cache 후보는 새 의존성 없이 격리해 임시 파일 모드·원자적 기록·오류 복구와 cold/warm 3회를 직접 entry로 검증했다. 불채택 결정 뒤 운영 checker의 기준 SHA·full 경로를 별도로 확인한다. native hook 실제 발화가 관찰되지 않았다면 `unknown`으로 남긴다. 독립 검증자는 후보 cache를 권한 발급이나 필수 검사 생략으로 오인하지 않는다.

## AR-06: 동일 workload 측정과 보고서 정리

- 포함: 아래 W1/W2의 고정 fixture·source revision·명령·환경에서 기준 checker와 후보 checker의 직접 진입을 비교한다. scan·출력 바이트·시간·실행 횟수를 기록한다. 프로젝트 전체의 재시도·diagnostic·독립 감사 범위는 별도 관찰로 기록하고 작은 checker 측정을 전체 하네스 효과로 외삽하지 않는다. 관찰되지 않은 토큰·비용은 `unknown`으로 남긴다. HTML과 진행 기록은 현재 실행과 역사적 결과를 분리한다.

**W1 정상 workload**: 하나의 격리된 동일 absolute fixture root에 최종 규범 상태의 `colors.md`·`typography.md`·`spacing.md`·`index.html` 네 파일을 동일 바이트로 둔다. 기준 checker는 `git show 228fea9:scripts/check-design-system.mjs`의 원본 SHA, 후보는 보존된 실험 checker SHA다. 두 버전의 Node/OS/env/cwd/root/네 입력 해시/stdin은 같고 checker source SHA만 의도한 처리 변수다. stdin은 `{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"pwd"}}`. 버전별 3 round 이상, 각 round에서 fixture 전용 성공 cache를 초기화한 cold `--hook` 1회, warm `--hook` 2회, 인자 없는 default full 1회로 최소 12호출을 실행한다. 기준은 full 12회·비어 있지 않은 stdout 12회, 후보 기대는 full 6회·cache 재사용 6회·warm stdout 무출력이다. baseline/후보 `--hook` full 성공 stdout은 기존 `{}`, default full 성공은 같은 84개 디자인 선언 메시지다. 모든 종료 코드는 0이어야 한다. 네 입력/root/명령/환경/표본이 달라지면 비교 불가다. 시간은 각 행의 측정값과 중앙값·범위를 남기며 실감소가 관찰될 때만 속도 개선이라고 쓴다.

**W2 무효 workload**: 유효 입력의 성공 cache를 확보한 뒤 `index.html`의 `<style>` 색상 값을 미허용 `unknown-color`로 바꾼다. 기준·후보 `--hook`은 `디자인 기준 이탈` 진단과 종료 코드 2, 후보 default full은 같은 진단과 종료 코드 1이다. 후보 성공 cache SHA는 보존하며 같은 무효 입력 재호출도 full 파싱·종료 2다. 유효 바이트로 복원한 후 원래 성공 서명과 같다면 재사용은 허용하지만 실패가 새 성공 cache를 발급한 것으로 쓰지 않는다. 이는 파일 변경·스크립트 로딩 경합의 절대 보안 보증이 아니다.

### Acceptance Criteria

- AR-06-AC1: Given W1의 같은 absolute fixture root·네 입력 SHA·Node/env/stdin/명령과 의도한 기준/보존 후보 checker SHA 차이, When 버전별 cold 1/warm 2/default full 1을 3 round 이상 실행하면, Then 기준 full 12/출력 12와 후보 full 6/cache 재사용 6/warm 무출력, 모든 코드 0, default full 84개 선언의 동등성이 원본 로그에 연결된다. 다른 입력·환경·게이트를 섞지 않고 후보 관찰을 운영 동작으로 표시하지 않는다.
- AR-06-AC1b: Given W2의 직전 성공 cache와 `index.html`의 `unknown-color`, When 기준·후보 `--hook`과 후보 default full 및 같은 무효 입력 재호출을 실행하면, Then `--hook` 종료 2/default 종료 1과 `디자인 기준 이탈`, 무효 입력의 full 파싱, 후보 성공 cache SHA 불변이다. 유효 바이트 복원 뒤 이전 성공 서명과 일치한 재사용은 허용한다.
- AR-06-AC2: Given 반복·토큰·비용의 관찰 자료, When 차이를 계산하면, Then 측정 단위·분모·표본 수·증거 출처를 보이고 미관찰 항목은 `unknown`으로 표시한다. 시간 단축이나 토큰 절감을 가정값으로 발표하지 않는다.
- AR-06-AC3: Given AR-04/05 결과와 독립 판정, When 진행 기록·HTML을 열면, Then 구현 범위, 실제 검사, 남은 제한과 재개 조건이 일치하고 역사적 149/149·14/14를 새 실행의 수치로 재사용하지 않는다.

### 검증 계획

측정 원본·해시 대조, 필요시 관련 회귀 한 번, 마지막 전체 `npm run check` 한 번, HTML 화면·링크 검토, 구현자와 분리된 AC 판정. 측정용 추가 실행은 필수 게이트와 별도로 세어 보고한다.

## [GATE 4] 판정 상태

AI가 승인된 결과 안에서 이슈·AC·의존성을 분해했다. 최초 `auto-with-audit` 계약 snapshot과 cache 실험 뒤 운영 불채택을 반영한 AC3–5 snapshot은 각각 구현자와 분리된 G4 감사에서 PASS를 받았다. 두 검토 대상 해시는 [계약 증거](evidence/closure-contract.md)에 보존한다. AR-04/05 구현의 독립 AC와 AR-06 측정·최종 판정도 각각 기록하며, 외부 이슈 등록에는 별도 권한이 필요하다.
