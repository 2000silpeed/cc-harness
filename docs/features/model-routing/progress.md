# Model Routing / Adaptive Execution 진행 기록

- 대상 프로젝트 절대 경로: `/Users/sungwoon/ai-projects/cc-harness`
- feature·현재 이슈·현재 단계: `model-routing` · `MR-IMP-01` · 완료
- 구현/외부 작업 승인 범위: 기존 B안·검증 정책 C안·NOW 범위의 8개 승인 파일, README 문서 동기화, feature 기록. README는 검사 설명의 고정 개수를 제거한 9번째 동기화 파일이며 commit/push/branch/외부 작업은 제외.
- 대상 변경 식별자: 시작 HEAD `fc0b234bfbc14656d9d3f97728f0467ab4179cab`; 시작 dirty는 `docs/features/` 미추적이며 원본 4파일 SHA-256은 아래 manifest에 기록.

| 게이트    | 대상 문서·버전                              | 상태                    | 사용자 승인·위임 근거                                                          |
| --------- | ------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| G1–G3     | `spec-fixed.md`, `prd.md`                   | 기존 승인               | 기존 B안 및 포함·제외 범위 승인                                                |
| 구현 범위 | `approval-implementation-original.md`       | 승인됨                  | 최신 명시 구현 승인. 이슈/시나리오 문서를 읽었다는 사용자 승인은 주장하지 않음 |
| G4/G5     | `issues.md`, `tests/MR-IMP-01-scenarios.md` | 구현 위임 근거로만 기록 | 동일 승인된 AC·경계의 bookkeeping; 새 사용자 승인으로 표기하지 않음            |

| 단계           | 명령·cwd                                                | 결과·종료 코드                                                          | 증거 경로                                                                                 | 다음 행동           |
| -------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- |
| 사전 점검      | `git status`, `git rev-parse`, SHA-256                  | 통과·0                                                                  | `evidence/manifest.md`                                                                    | 기존 변경 보존      |
| Red            | `npx vitest run tests/unit/harness-portability.test.ts` | 실패·1, canonical Adaptive Execution JSON 부재                          | `evidence/red-green.md`                                                                   | 최소 문서 계약 작성 |
| Green          | `npx vitest run tests/unit/harness-portability.test.ts` | 통과·0, 46/46                                                           | `evidence/red-green.md`                                                                   | 독립 AC 검토        |
| 정합 Red/Green | `npx vitest run tests/unit/harness-portability.test.ts` | Red 1, Green 0·47/47; verifier 46/47 실패 후 fourth Green 47/47         | `evidence/shape-{red,green}.stdout-stderr.log`, `evidence/fourth-green.stdout-stderr.log` | 독립 AC 재검토      |
| 독립 AC 검증   | `/root/adaptive_independent_verifier`                   | PASS, 3회 검토 완료                                                     | `evidence/verifier-final-recheck.md`                                                      | 완료                |
| 최종 통합 검사 | `npm run check`                                         | 통과·0; lint, design 84, harness 15/32, format, Vitest 47/47, typecheck | `evidence/final-check.stdout-stderr.log`                                                  | 완료                |

## 남은 문제·미실행 검사

`npm run check`는 독립 verifier 재검토 뒤 main이 배정한 작업자가 한 번 실행했고 exit 0으로 통과했다. actual backend model/effort/usage와 live process-routing behavior는 이 협업 실행에서 관찰되지 않았으므로 `unknown`이다.

## Dogfooding execution metadata

- process profile: `intensive`; reason: shared approval/STOP/resume/routing contracts and downstream portability are affected.
- implementer: `/root/adaptive_implementation`; requested model/effort `gpt-5.6-terra`/high with `fork_turns="none"`.
- verifier: `/root/adaptive_independent_verifier`; requested model/effort `gpt-5.6-terra`/high with `fork_turns="none"`; two independent reviews have occurred.
- observed worker/verifier model and usage: `unknown`; this collaboration surface did not expose backend metadata.
- intended Red failures are not Green attempts. This is a user-authorized finite manual tdd-loop maintenance, not auto-loop: 3 completed Green passes, verifier portability 46/47 exposed a distributed-link regression, and the fourth corrective Green passed 47/47 at `evidence/fourth-green.stdout-stderr.log`. No automatic three-attempt limit is being applied; manual Green count is 4, retry count is 3, rework count is 3, diagnostic count is 0.
- prior Sol quota and thread limit: planning/runtime preparation failures, not diagnostic escalation.
- rework definition: post-independent-verification correction cycles; final count is 3 by independent verifier review.

## 재개 조건

MR-IMP-01은 완료됐다. 새 변경은 새 이슈·승인·검증으로 시작한다.
