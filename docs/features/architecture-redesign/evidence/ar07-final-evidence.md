# AR-07 최종 작업자 증거 · 2026-10-02

## 컨텍스트와 후보

- 기준 revision: `0c96b805f345b4d8fadcb6c7079bab69f4fa392f` (`master`). 이번 작업에서 commit·push·PR은 실행하지 않았다.
- 상위 실행기가 보고한 첫 fresh session `01a0fc13-0952-70d2-8032-4c65df97b04e`은 기본 `gpt-6.1-sol` 미지원 HTTP 400으로 종료 1이었고 실제 작업을 수행하지 않았다. 이번 작업은 `gpt-5.6-sol/medium`을 요청했다는 입력만 있으며 실제 관찰 model/effort는 `unknown`이다. 전역 설정은 바꾸지 않았다.
- [후보 manifest](ar07-final-candidate-manifest.json) SHA-256 `eb6c077a1ce8319118ec63b81df195a1ee64c480bb2452f82630601769c8ee38`는 source·계약·corpus·baseline·test·문서·증거 33개 파일의 전체 SHA-256을 고정한다. manifest 자체는 self-hash cycle을 피하려고 파일 목록 해시에서 제외했다.

## QH-15 STOP drift 보완

- `tests/unit/handoff-evaluation.test.ts` SHA-256 `521fefc0c997791e10fdf524f87b28f4ea290b6cfaf1c0b90ce7b889803f75c2`에 `STOP_ACTIVE` 결정은 유지하고 `result.reason`만 `wrong`으로 바꾸는 negative를 추가했다.
- 관련 명령 `npx vitest run tests/unit/handoff-evaluation.test.ts`: 서식 수정 전 종료 0·1 file·6/6, 서식 복구 뒤 같은 명령 종료 0·1 file·6/6. 최종 바이트의 근거는 [복구 후 로그](ar07-final-related-formatted.log)다.
- 실제 변조 evaluator 실행은 종료 1, `reason=candidate_mismatch`, `field_path=result.reason`, `actual_decision=STOP_ACTIVE`였다. [원본 JSON](ar07-final-stop-negative.json) SHA-256은 `019ea1d61dc587b5587ce137dd87a789be82ae68adfc58baa4db339e03776111`이다.
- 평가기 `scripts/evaluate-handoff.mjs`는 기존 SHA-256 `1e6449fa760d7ea5631aeb26c048dfc59d6ed550d6ad068afe36495caa981211` 그대로다. 이미 일반 필드 비교가 검출하므로 runtime 구현을 추가하거나 기대값을 완화하지 않았다.

## 격리 통합 검사

- 실행 후보: `git archive HEAD` + manifest의 33개 소유 파일 + manifest 자체. root `node_modules`를 symlink했다. snapshot `/var/folders/bc/dgnqfptd3g980z9ybm8kw5fh0000gn/T/cc-harness-ar07-final.xQ7bZR`에는 `.git`, `docs/features/trusted-approval/`, `harness-map/`이 없고 manifest mismatch는 0이었다.
- 명령: `(cd "$snapshot_dir" && npm run check)`, 종료 0. lint, 디자인 84개 선언, 하네스 15개 스킬·62개 등록 파일, Prettier, Vitest 4 files·178/178, handoff 평가 14/14·변화 0·failure 0, typecheck가 통과했다.
- [전체 로그](ar07-final-isolated-check.log) SHA-256 `b1faf25c5ff66692522fae8045f826c1d40b89b6e99d486bc08aa4c000ae4071`, [환경 로그](ar07-final-isolated-environment.log) SHA-256 `301d06c7b0b08159f8437f53c934ada937db8c6e5ef12fe1054ff8024ed37ae1`.
- 이 결과는 `.git` 없는 격리 후보의 통합 검사다. 현재 원본 root 전체 `npm run check`는 실행하지 않았고, 다른 소유 미추적 영역을 포함한 root PASS로 해석하지 않는다. 완료 결과를 반영한 이 문서·진행 기록·HTML delta는 별도 정적 검사만 수행한다.

## 보존과 미검증

- runtime 불변 SHA-256: `scripts/handoff-core.mjs` `824c40fa8c7a677125945f8188a1e3bb8d57f9c110286ce607f80b2e82e8e283`; `scripts/session-handoff.mjs` `b9c64fb48edf85a94eb42a2cc5698f8854431c596db485fd087bc79f7dab031b`; `scripts/check-harness.mjs` `34ca184868d06819f47824043646e98ffeccec6e437aedda425d8f5f0fa4b026`; `scripts/check-design-system.mjs` `683a499c26a91f97918e2187543cb13415b45992a0f2456424beb291a14cb417`.
- 다른 소유 영역 tree SHA-256은 작업 전후 동일하다: `docs/features/trusted-approval/` `4cd17dce507dc923a5db8c218e8eea6365d640e96245292a1457546a20176a29`; `harness-map/` `fcdee9390949902b5b1c24c51284042431b3979c71c2e973ef89b5a2b48f77ef`.
- 실제 넓은/400px 브라우저 렌더, native 세션·훅 발화, 시간·토큰·비용 절감은 이번 보완으로 검증하지 않았다. 구현 독립 AC는 메인의 기존 독립 검증자 판정 전까지 `pending`이다.
