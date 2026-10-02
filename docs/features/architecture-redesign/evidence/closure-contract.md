# AR-04~06 계약·증거 경계 · 독립 감사 결과

## 기준선과 현재 산출물

- 기준 source: `228fea90465772bc737927f61fd3b560e4076d2a`. v1 AR-01~03의 독립 AC와 최종 `npm run check` 종료 0, Vitest 149/149, 오프라인 평가 14/14·변화 0은 **역사적 완료 증거**다. 이 문서의 초안이나 새 구현을 검사한 결과가 아니다.
- dirty 소유: `docs/features/trusted-approval/`과 `harness-map/`은 별도 작업 소유다. 이번 재설계는 규범·구조도, 앵커 검사기, 계약·보고서·측정 증거를 수정했다. 기존 v1 spec/PRD/issues/scenarios와 원본 로그 파일은 바이트를 보존한다.
- 사용자 원문/권한: [원문 기록](../spec-original.md)의 세 연속 지시를 대조한다. G2/G3의 AI 기술 선택을 사용자 직접 결정으로 표기하지 않는다. G4/G5 계약은 구현자와 분리된 검증에서 PASS를 받았다. CLI local success는 실제 사용자 승인·실행 권한이 아니다.

| 산출물                                                | 역할                      | 현재 상태                |
| ----------------------------------------------------- | ------------------------- | ------------------------ |
| [spec-fixed-v2.md](../spec-fixed-v2.md)               | R7–R9 목적·성공·STOP      | 최신 G4/G5 계약 PASS     |
| [prd-v2.md](../prd-v2.md)                             | 세 안·ADR·G2/G3 경계      | policy-delegated AI 판단 |
| [issues-closure.md](../issues-closure.md)             | AR-04~06 AC·의존성        | 최신 G4 계약 독립 PASS   |
| [closure-scenarios.md](../tests/closure-scenarios.md) | 정상·경계·실패 시나리오   | 최신 G5 계약 독립 PASS   |
| [progress.md](../progress.md)                         | 현재 checkpoint·다음 행동 | 최종 보고·검사 정리      |

첫 독립 G4/G5 감사가 PASS로 판정한 계약 snapshot의 SHA-256은 아래와 같다. PASS 범위는 요구사항·이슈/AC·시나리오의 추적성과 판정 가능성이다. 실험 뒤 운영 결정과 구현·최종 검사는 별도 판정이다.

| 파일                         | SHA-256                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `spec-fixed-v2.md`           | `b5fc141e978c4ebf7fe84576b1427b16a1145b932f98525a2a336382865ebe0b` |
| `prd-v2.md`                  | `b039fabd0e4e373ceb7b99e08eb0707b73f8f065aa07059d9a37585fd108756b` |
| `issues-closure.md`          | `0c168bc63741ea32dd4ee1aca1125f21ad6486cce503facb90325710673b6965` |
| `tests/closure-scenarios.md` | `68189fd05f4a04994198b6b2086cc2e783d51d0dde1f2645a2ca3e89fc8ece96` |

cache 후보의 W1/W2 측정 뒤 운영 불채택으로 수정한 계약은 다시 독립 G4/G5 PASS를 받았다. 아래 `검토 바이트` 열이 감사 대상이고, `현재 표시 바이트` 열은 판정 뒤 제목·말미의 상태 문구만 PASS로 정렬한 파일이다. 현재 표시 바이트의 지위는 감사 대상 바이트와 구분한다.

| 파일                         | 실험 후 독립 PASS 검토 바이트                                      | 현재 표시 바이트                                                   |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `spec-fixed-v2.md`           | `907b4de84e679fd51a4a6c7d019858fb0bfa1889f7672a0c4d920a6336b17efc` | `af3ab0e05b2aa703a062f420c7a3a62320fc36de9ebb4717dd315d9be4b68085` |
| `prd-v2.md`                  | `6b5ed97bb028351be47f40bdd57d4dfb76f51690db402708c5e2a3748cbdd2c6` | `6f76066e1f5087f83ca44e5d08005b97c35a1b083aaf5edae32d20136dde3c05` |
| `issues-closure.md`          | `09c71b73b860c24b0746d7e69bf5a85a40fa29211256cd8b6a2b4a7d74b2aaaa` | `0de5fdfe7d70405242ee3e713d6bd2ec809041750ac5d0c5db3b942892db46df` |
| `tests/closure-scenarios.md` | `393879d574aa57ca9bb529052ac56fae8a2a554bbffc431485fd97f71e2d2820` | `7dcf9e31df051d920cd08b8c555f400f2afc2169f3ae2990af7f4f9f0e41bb90` |

## 검증자가 대조할 사실

1. AR-04는 lifecycle §5를 규범으로 두고 delivery/planning/feature-planner/tdd-auto-loop/create-pr와 구조도에서 위임·독립 감사·외부 권한을 분리한다. 특히 매 단계 승인 오독과 Green `min(3,1+user_approved_retry)`, G2 envelope 안의 새 구조 판정을 확인한다.
2. AR-05는 `rawLink.split(/[?#]/)[0]`의 fragment 누락을 Red로 재현한다. Markdown GitHub slug·중복·markup·percent decode·코드 펜스, 명시적 앵커와 HTML `id`의 유효/깨진 링크를 검증한다. 외부 URL은 제외하고 지원하지 않는 로컬 fragment를 성공으로 위장하지 않는다.
3. 훅 cache 후보는 기본 대상 네 디자인 입력과 checker 바이트·root의 직전 full 성공에만 적용하는 실험이었다. 후보의 full 경로, 오류·손상·권한·원자 기록과 cold/warm 3회는 [측정](ar06-measurements.md)·[후보 증거](ar05-cache.md)로 확인한다. 운영 checker는 기준판으로 복원해 모든 기본·훅 호출이 full이다. native hook 발화는 미관찰이고 cache는 승인·필수 게이트가 아니다.
4. AR-06은 같은 입력·환경·명령·검사 범위의 시간·호출·재시도·독립 감사 비용을 기록한다. 관찰하지 않은 토큰/비용, native 발화, 제품 E2E·원격 CI는 `unknown` 또는 미실행이다.

## 증거 재사용과 다음 판정

독립 계약 검증자는 최초와 실험 후 수정된 두 snapshot의 원문·source/dirty·R7–R9 → AC → CL 시나리오, 후보 cache 실패 복구·운영 불채택과 외부 권한 경계를 검토해 G4/G5 PASS를 보고했다. AR-04 AC1–3, AR-05 AC1–5, AR-06 AC1/AC1b/AC2는 별도 독립 구현 판정을 받았다. 별도 검증자 `redesign_stage_verify`는 [검토 해시의 보고서·진행 기록·검사 경계](closure-final-review.md)에 대해 AR-06 AC3 PASS를 판정했다. 원래 5단계의 가역적 로컬 구현·검증은 완료됐고 Git 커밋·푸시는 아직 실행 전이다. 루트 `npm run check`는 다른 소유의 미추적 `harness-map/` HTML의 ESLint 오류로 종료 1이었고 나머지 단계를 실행하지 못했다. [격리 snapshot 검사](closure-snapshot-check.md)는 같은 의존성과 재설계 source 31개 해시를 확인했으며 `npm run check` 종료 0, Vitest 176/176, 인계 평가 실패 0이었다. 검사 후 보고서의 역사 라벨과 현재 상태 문구가 바뀌므로 이 후행 바이트는 별도 정적 검사로 확인한다. 보고서 새 바이트의 넓은/400px 실제 렌더는 브라우저 접근 정책으로 미검증이다.
