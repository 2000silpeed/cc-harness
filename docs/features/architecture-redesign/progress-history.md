# 아키텍처 재설계 진행 이력

이 문서는 단계별 관찰과 당시 미완료 상태를 원문대로 보존한다. 최신 상태와 최종 검사 결과는 [progress.md](progress.md)를 따른다.

## 2026-10-02 기획 착수

- source revision: `ae9ff54c33518b77fc0de18feb217660303ac739`.
- 착수 dirty: `?? docs/features/trusted-approval/`은 별도 소유. 이 폴더는 `docs/features/architecture-redesign/`만 변경한다.
- 원문·승인: `spec-original.md`에 전달된 사용자 문장과 원문 미제공 부분을 구분했다. “재설계 마무리 하고 구현 까지”와 “계속”으로 로컬 가역 구현·검증은 승인되었다. Git/외부 권한은 없다.
- G1: 목적·사용자 가치·성공 조건을 `spec-fixed.md` R1–R6으로 확정. R6는 현재 감사에서 확인한 저장 receipt 불일치의 좁은 보강이다. 별도 UI 없음.
- G2/G3: `prd.md` v1에서 B안을 `policy-delegated` 기술 선택으로 채택하고 구체적 제외 범위를 기록. 사용자 직접 B 선택으로 표시하지 않았다.
- G4/G5: `issues.md`, `tests/redesign-scenarios.md` v1 작성. 독립 검증자 `/root/redesign_contract_verify`의 계약 감사에서 조건부 PASS와 AR-01-AC4/SC-11 오류 인터페이스 정밀화 지적을 받았다. `decide`는 `STOP_MALFORMED`, `claim`·`receipt`는 기존 stderr/nonzero로 구분해 반영했다. 정정 후 최종 독립 판정은 G4/G5 PASS이며, 판정 대상은 `spec-fixed.md` SHA-256 `f6e10ff6…`, `issues.md` `1c9024a1…`, `tests/redesign-scenarios.md` `2a3ab05e…`이다. 이는 구현·AC 검증 결과가 아니다.

## 구현 인계와 STOP

- 순서: AR-01 → AR-02 → AR-03. 각 이슈는 관련 Red/Green, 독립 AC, 변경 해시·명령·종료 코드로 확인한다.
- AR-01은 새 순수 코어 추상화 하나와 기존 CLI/설치 호환성, 손상 receipt의 명령별 거부에 국한한다. AR-02는 로컬 오프라인 비교, AR-03은 실제 중복이 확인된 검사·문서·HTML 정렬이다.
- 현재 디자인 검사 체인은 이미 한 번 실행된다. 범용 앵커 검사는 검토한 16/16 링크가 유효해 보류한다. 훅 payload의 신뢰 가능한 쓰기 감지가 없으면 훅 구현은 바꾸지 않는다.
- STOP: 새 보안·외부 권한 필요, 기존 STOP/예산·schema·명령을 깨는 변경, 기준선/입력 해시의 불일치, 독립 감사 실패, 진전 없는 반복. 관련 근거와 복구 조건을 남긴다.
- 문서 자체는 작성 중이며 검사·독립 감사 결과가 아직 없다. 이전 HTML의 역사적 Green은 이번 구현 Green이 아니다.

## AR-03 문서·검사 기준선

- 문서 작업자 시작 HEAD `ae9ff54c33518b77fc0de18feb217660303ac739`; 시작 dirty는 미추적 `docs/features/architecture-redesign/`, `docs/features/trusted-approval/`였다. 후자는 다른 작업 소유로 보존했다.
- 변경 전 `package.json`의 `check`는 `lint → design:check → harness:check → format:check → test → typecheck`이며 `design:check`는 한 번뿐이다. 이 구성은 줄일 중복 호출이 없어 유지한다. AR-02의 `handoff:eval`은 `test` 뒤에 추가됐으며 기존 필수 단계와 순서는 보존했다.
- `.codex/hooks.json`은 `apply_patch|Bash`, `.claude/settings.json`은 `Edit|MultiEdit|Write|Bash`를 포괄한다. 쓰기 대상이 확정되는 payload 매핑이 확인되지 않아 훅을 변경하지 않는다. 훅 발화·속도 절감은 관찰하지 않았다.
- 검토한 구조도 앵커 16/16이 유효한 이전 감사 결과에 따라 범용 Markdown 앵커 파서를 보류했다. 새 오류가 재현되면 별도 범위에서 다룬다.
- `docs/harness/lifecycle.md`, README, HTML 보고서의 현재 구현 설명은 AR-01/02 작업자 결과와 독립 AC·통합 검사 이후 확정한다. 과거 감사의 통과 수치와 현재 구현의 검증 수치는 섞지 않는다.
- 문서 수정이 기본 4파일 예산을 넘는 이유는 AR-03-AC3의 규범 출처(`lifecycle.md`), 사용 명령(README), 시각 보고서(HTML), 현재 상태(`progress.md`)와 G4/G5 상태 머리말(`issues.md`, 시나리오 계약)을 함께 맞춰야 하기 때문이다. AC 문구와 승인 범위는 변경하지 않는다.
- HTML 브라우저 확인: 로컬 HTTP `127.0.0.1:8765`에서 Chrome 네이티브 창으로 넓은 화면과 DevTools Responsive 400×706을 열었다. 400px에서 헤더·배지·목차 줄바꿈·현재 구현 카드가 화면 안에 표시됐고, `#implementation` 목차 이동과 Tab 키의 `진행 기록` 링크 포커스 외곽선을 관찰했다. 문서 링크 대상의 내용 검증과 모든 표·그림 스크롤 검사는 이 관찰에 포함되지 않는다. in-app browser 연결은 신뢰 브리지 오류, CUA 탭 생성은 사용 불가여서 Chrome 창으로 확인했다.

## AR-01/02 구현과 관찰된 검사

- AR-01은 `scripts/handoff-core.mjs`와 타입 선언을 추가하고 기존 CLI가 이를 사용하도록 분리했다. 배포 등록과 설치 helper 회귀를 포함한다. `evidence/ar01-red.log`의 예상 Red 2개 뒤 `evidence/ar01-green.log`에서 관련 Vitest 132/132가 종료 0으로 통과했다. 변경 전 `ae9ff54` CLI와의 원시 비교는 13개 중 12개가 일치하며, 나머지 1개는 요청된 중복 안내 출력 제거다. 이를 정규화한 비교는 13/13이다. 원시 출력 차이를 무변경으로 표시하지 않는다.
- AR-02 기준선은 변경 전 `ae9ff54` CLI의 동일 입력 14개를 직접 실행해 고정했다. 첫 독립 AC 감사에서 잘못된 기준선 schema·출처·corpus가 전역 실패인데도 일부 row의 `pass`/`comparable`이 true로 남는 결함을 발견했다. 평가기를 수정해 이 경우 모든 row가 `pass: false`, `comparable: false`가 되도록 하고 관련 Vitest 4/4와 ESLint 종료 0을 확인했다. 수정 후 `evidence/evaluation-run.md`의 `npm run handoff:eval -- --output docs/features/architecture-redesign/evidence/evaluation-current.json`은 종료 0, 비교 가능·기대 판정 일치 14/14, 기준선 대비 변경 0, 실패 0이다. 각 row의 승인 출처는 `not_checked`다.
- 위 결과는 구현자 검사와 로컬 corpus 평가다. 독립 구현 AC 판정 및 AR-03 최종 `npm run check` 결과는 아직 별도 기록이 필요하다.

## AR-03 관련 검사

- 문서 수정 뒤 `npm run design:check` → 종료 0, `docs/architecture/index.html`의 디자인 선언 84개 통과. 이 정적 검사는 새 보고서의 브라우저 표시나 인수 조건 의미를 판정하지 않는다.

## 2026-10-02 AR-01~03 완료와 잔여 작업 재개

- AR-01~~03은 최종 커밋 `228fea90465772bc737927f61fd3b560e4076d2a`에 들어갔다. 당시 최종 `npm run check`는 종료 코드 0, Vitest 149/149와 오프라인 평가 14/14·기준선 대비 변화 0이었다. 이는 새 AR-04~~06 검사가 아니다. 원본 로그와 입력 해시는 [final-check.md](evidence/final-check.md) 및 [evaluation-run.md](evidence/evaluation-run.md)에 보존한다.
- 사용자 연속 요청 원문은 “남은거 끝까지 해줘 멈추지마 전문가처럼 빡세게 일해”다. 이전 대화의 목적·로컬 구현 승인을 이어받아 AR-04~06 계약을 작성한다. Git 커밋·푸시 권한 인계는 메인이 원문·대상·범위를 실제 확인한다. 별도 PR·병합·배포·유료·보안 권한으로 넓히지 않는다.
- 새 작업 시작 source `228fea90465772bc737927f61fd3b560e4076d2a`, dirty `?? docs/features/trusted-approval/`은 타 작업 소유다. 문서 작성자는 `docs/features/architecture-redesign/`의 v2 계약·진행 파일만 소유하며 타인의 변경을 되돌리지 않는다.
- AR-04는 lifecycle §5를 승인·외부 권한의 규범 출처로 두고 delivery/planning/skill 문구와 구조도 파생 뷰를 맞춘다. 상충하는 여러 진입 문서를 함께 닫아야 해 기본 4파일 예산을 넘는 최소 7파일 변경이 예상된다. 새 의존성은 추가하지 않는다.
- AR-05 조사: `check-harness.mjs`가 fragment를 버리는 결함을 확인했다. 현재 검토한 상대 Markdown 16개 링크의 유효성은 깨진 fragment 검출 증거가 아니다. `npm run check`의 디자인 검사 1회와 portability의 설치본 `--apply` 대상 검사기는 이미 존재해 새 중복 트리거를 넣지 않는다.
- AR-05 훅: 직접 `--hook` benign Bash 호출에서 84개 선언 scan 자체 약 0.03초를 관찰했으나 native hook trust/dispatch는 미확인이다. 메인은 기본 대상 네 디자인 입력·checker SHA·root identity의 직전 full 성공 snapshot으로만 cache hit를 허용하는 기술안을 선택했다. 기본 `design:check`/`npm run check`는 full이고 Bash 문자열/JSON stdin으로 쓰기를 추정하지 않는다. cache 오류·입력 변화·실패는 full 또는 안전 실패다. 이 기술안의 구현·효과는 아직 미검증이다.
- AR-06은 동일 workload의 실제 시간·호출 수·재시도/감사 범위를 비교한다. 토큰·비용이 관찰되지 않으면 `unknown`으로 남기고 속도 향상은 측정 전 주장하지 않는다.

## 2026-10-02 AR-04~06 구현·검사 결과

- AR-04 규범·구조도 AC1–3, AR-05 앵커 수정과 cache 후보 평가 AC1–5, AR-06 측정·운영 판정 AC1/AC1b/AC2는 각각 독립 PASS를 받았다. 뒤이어 별도 검증자 `redesign_stage_verify`가 보고서·진행 기록·검사 경계의 AR-06 AC3도 PASS로 판정했다. [최종 판정 기록](evidence/closure-final-review.md)에 검토 해시를 남긴다. 이로써 원래 5단계의 가역적 로컬 구현·검증은 완료됐다. 앞 절의 cache 채택안은 **당시 실험 가설**이며, W1/W2 29행 측정 뒤 운영 불채택했다. 운영 디자인 검사는 항상 full이고 native hook 발화·토큰·비용은 unknown이다. Git 커밋·푸시는 이 시점에 아직 실행 전이다.
- 루트 `npm run check`는 타 작업 소유 미추적 `harness-map/`의 ESLint 28개 오류로 종료 1, 후속 단계 미실행이다. 같은 의존성과 재설계 source를 복사한 [격리 snapshot](evidence/closure-snapshot-check.md)의 복구 검사에서는 `npm run check` 종료 0, 디자인 84개·하네스 15개 스킬/62개 등록 파일·Vitest 4개 파일 176/176·인계 평가 실패 0·타입 검사 PASS였다. 검사 후 보고서 역사 라벨·상태 문구를 고쳐 후행 HTML의 정적 검사와 실제 화면 검증은 별도로 구분한다.
