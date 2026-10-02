# R10–R12 품질 보완 검사 · 작업자 통합 완료

## 기준과 소유

- 시작 HEAD `0c96b805f345b4d8fadcb6c7079bab69f4fa392f`, branch `master`. 시작 dirty의 미추적 `docs/features/trusted-approval/`, `harness-map/`은 다른 작업 소유로 유지한다.
- 2026-10-02 `git ls-remote origin refs/heads/master`는 `0c96b805f345b4d8fadcb6c7079bab69f4fa392f`를 반환했다. 이는 이전 재설계 전달 확인이며 이번 보완의 커밋·푸시 증거가 아니다. 후행 전달 상태는 실행 시점의 `HEAD`와 원격 SHA를 다시 대조해 적는다.
- 현재 문서 변경: `quality-hardening.md`, `progress.md`, `evidence/closure-contract.md`, `docs/harness/coverage.md`, `docs/architecture/redesign-review-2026-09-30.html`. 평가 코드·fixture는 별도 작업자 소유다. 계약·실제 코드·명령·환경이 바뀌면 검사 유효 범위를 다시 판단한다.

## 독립 계약 감사

- `hardening_verify`가 동결 [R10–R12 계약](../quality-hardening.md) SHA-256 `ec481f53df0703042c52c6a14bebe9661e33668dd3d9530dc6daf8a780b4ad03`와 [AR-07 G5 시나리오](../tests/AR-07-scenarios.md) 최초 SHA-256 `7d4c17a56a4bdb3dfe53cbaef2bc5249572b0957b8bbde7cae0f248753bc8437`를 독립 G4/G5 **PASS**로 판정했다. `HEAD=0c96b805f345b4d8fadcb6c7079bab69f4fa392f`에서 원본 CLI source SHA 재확인 종료 0, corpus 14개 입력과 P/C/R/L 전후값 대조, 관련 tracked 문서 `git diff --check` 종료 0을 확인했다.
- Green의 역사 CLI 관찰에서 `prepare-idempotent`의 안정적 `result.handoff_id`가 추가로 확인됐다. QH-12 기대를 완화하지 않고 보강한 시나리오 새 SHA-256은 `b7d62643fadc70dfe3c64c0f7d76edc08cc7da979c9019f99968ee39a57cfa5d`이며 `hardening_verify`가 해당 델타를 독립 재감사해 **PASS**했다. 기존 G4/G5 PASS는 유지된다. 구현·baseline 캡처·실행 AC는 이 계약 판정의 범위 밖이다.

## 문서 관련 검사

| 명령                                                                     | 종료 | 관찰                                          |
| ------------------------------------------------------------------------ | ---: | --------------------------------------------- |
| `npx prettier --check` 대상 문서 5개                                     |    1 | HTML 보고서 서식 오류                         |
| `npx prettier --write docs/architecture/redesign-review-2026-09-30.html` |    0 | 해당 파일 서식 수정                           |
| `npx prettier --check` 대상 문서 5개                                     |    0 | 대상 문서 서식 통과                           |
| `npx eslint docs/architecture/redesign-review-2026-09-30.html`           |    0 | HTML 정적 규칙 통과                           |
| `npm run harness:check`                                                  |    0 | 스킬 15개·등록 파일 62개, 링크·등록 구조 통과 |

이 증거 파일 자체의 첫 `npx prettier --check`는 종료 1이었다. `npx prettier --write` 뒤 다시 `--check`해 종료 0을 확인했다.

## AR-07 평가 구현과 STOP drift 보완

- 평가 schema v2와 14개 corpus·역사 CLI 고정 baseline의 구현·관련 검사는 [평가 증거](ar07-evaluation.md)에 분리했다. 원본 runtime `scripts/handoff-core.mjs`, `scripts/session-handoff.mjs`, `scripts/check-harness.mjs`와 디자인 checker는 바꾸지 않았다.
- QH-15 추가 보완으로 같은 `STOP_ACTIVE` 결정을 유지한 채 `result.reason`만 변조하는 negative를 `tests/unit/handoff-evaluation.test.ts`에 추가했다. 관련 Vitest 첫 실행은 종료 0·6/6이었다. 별도 실제 negative는 종료 1, `candidate_mismatch`, `field_path=result.reason`, `actual_decision=STOP_ACTIVE`를 반환했다. [관련 로그](ar07-final-related.log)와 [negative 원본](ar07-final-stop-negative.json)을 보존한다. 현재 평가기가 이미 일반 필드 비교로 검출했으므로 새 runtime 추상화나 가짜 Red는 만들지 않았다.
- 테스트 변경 전 Prettier 검사는 내용상 통과했지만 결과 수집 래퍼가 zsh 읽기 전용 변수 `status`에 대입해 명령 전체는 종료 1이었다. 검사 자체 통과 출력은 [동결 로그](ar07-final-prettier-freeze.log)에 보존하고 반복하지 않았다.
- AR-07 구현 AC1·AC2·AC3는 `hardening_verify`의 독립 **PASS**다. [최종 독립 검토](ar07-independent-final-review.md)는 대상 SHA와 확인한 원시 결과를 기록한다. 이전 176/176과 평가 14/14는 역사적 검사다.
- 위 정적 검사는 새 HTML의 실제 넓은/400px 렌더나 native 훅 발화, 토큰·비용을 증명하지 않는다. 기존 역사 보고서의 검토 문구와 원시 로그는 보존한다.

## 최종 격리 통합 검사

- 현재 루트 작업 트리 전체 `npm run check`의 결과는 **없다**. 이전 루트 28개 ESLint 오류는 [AR-04~06 당시 검사](closure-final-check.md)이며 이번 시도의 결과가 아니다. 다른 소유의 `harness-map/`과 `docs/features/trusted-approval/`을 바꾸거나 격리 검사에 넣지 않는다.
- 스냅샷 원형은 정확한 `HEAD`의 `git archive HEAD`다. 여기에 AR-07 실행 직전 [후보 manifest](ar07-final-candidate-manifest.json)의 소유 파일 33개와 manifest 자체만 경로를 유지해 복사했다. source·동결 계약·corpus·baseline·test·문서·증거를 포함하고 다른 소유의 두 미추적 영역은 제외했다. manifest SHA mismatch는 0이었다.
- 기존 `node_modules`만 읽기용으로 연결해 같은 설치 의존성을 사용했다. `.git` 없는 스냅샷에서도 evaluator가 정상 실행돼 추가 Git 제공은 필요하지 않았다. 별도 환경의 역사 CLI 실제 캡처와 이번 `npm run check`의 evaluator 결과는 서로 다른 증거로 보존했다. 입력 해시를 동결한 스냅샷에서 최종 `npm run check`를 한 번 실행했고 종료 코드·원시 로그·대상 해시를 기록했다.

- snapshot `/var/folders/bc/dgnqfptd3g980z9ybm8kw5fh0000gn/T/cc-harness-ar07-final.xQ7bZR`에서 `(cd "$snapshot_dir" && npm run check)`를 한 번 실행해 종료 0을 확인했다. lint, 디자인 84개 선언, 하네스 15개·등록 파일 62개, Prettier, Vitest 4 files·178/178, 평가 14/14·변화 0·failure 0, typecheck가 통과했다. [최종 작업자 증거](ar07-final-evidence.md)와 [전체 로그](ar07-final-isolated-check.log)를 따른다.
- 이 결과는 `.git` 없는 격리 후보에 한정한다. root 전체 PASS, 브라우저 렌더, native 훅, model/effort 관찰, 시간·토큰·비용 절감을 주장하지 않는다. 검사 결과를 반영해 바뀐 완료 문서 delta는 통합 검사를 반복하지 않고 별도 정적 검사로 확인한다. 구현 AC1–3의 독립 PASS와 후행 국소 문서 검사를 별도로 기록한다.
