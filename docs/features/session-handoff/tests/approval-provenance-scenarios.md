# 세션 인계의 로컬 검사와 승인 확인 경계

- 대상: `scripts/session-handoff.mjs`의 `prepare`, `decide`, `claim`, `receipt`와 v1/v2 인계 기록
- 상태: 현재 로컬 회귀 계약. 기존 문서의 포괄적 `STOP_APPROVAL_PROVENANCE_UNVERIFIED` 요구는 당시 차단 실험이며 현행 AC가 아니다.
- 권한 경계: CLI는 로컬 상태·해시·기존 STOP·증거·예산을 검사한다. 호출자는 실제 행동 전에 CLI 밖의 신뢰할 수 있는 사용자 결정 원문으로 승인 주체, 대상·범위, 시점과 후속 철회 여부를 확인한다. 성공 판정과 프롬프트는 실행 권한을 발급하지 않는다. 자체 `verified` 입력이나 원격 검증 서비스는 없다.

## AC와 호출 계약

| AC   | 관찰 가능한 계약                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AP-1 | `prepare`는 기존 schema, 계보, source/dirty 및 참조 해시를 검사하고 유효한 기록만 원자적으로 저장한다. `PREPARED` 출력은 로컬 검사 범위와 호출자의 승인 확인 책임을 밝힌다.                                                                 |
| AP-2 | `decide`는 기존 준비도와 구체적 STOP을 우선 적용한다. 안전 조건을 통과하면 `PHASE_READY`, `CONTINUE_CURRENT`, `ROLLOVER_READY`를 반환하며, 성공 출력과 진행 지시는 CLI 밖의 실제 사용자 승인 확인이 필요함을 명시한다.                      |
| AP-3 | `claim`은 `ROLLOVER_READY`인 기록에 한 번만 claim을 저장하고 시작 전용 요청문을 반환한다. 이 로컬 전환은 실제 세션을 만들지 않는다. 반복 또는 다른 executor의 claim은 기존 reconciliation/duplicate STOP을 반환한다.                        |
| AP-4 | `receipt`는 실제 세션 ID를 기록한다. 일치하는 세션의 후속 `decide`도 source/dirty, 참조, active STOP, 진행 중 활동, 승인 참조, 증거·단계·해당 예산을 검사한 뒤에만 `CONTINUE_CURRENT`를 반환한다. 다른 세션은 `STOP_ALREADY_TRANSFERRED`다. |
| AP-5 | v1/v2에 동일한 로컬 검사와 출력 경계를 적용한다. `verified` 같은 자체 인증 표시는 schema/인자 검사에서 거부한다.                                                                                                                            |

`decide`는 read-only JSON 판정이다. `claim`과 `receipt`는 인계 기록만 전환하며 사용자 승인 진위를 판단하지 않는다. 외부 발급 서비스나 무인 자동 권한 발급을 도입하려면 별도 승인·계약·독립 검토가 필요하다.

## Given–When–Then 시나리오

| ID     | Given                                                                | When                              | Then                                                                                                                          |
| ------ | -------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| AP-S01 | 유효한 v1/v2 입력과 일치하는 Git·파일 해시                           | `prepare`                         | `PREPARED`와 불변 기록을 저장하고 로컬 검사 경계를 알린다.                                                                    |
| AP-S02 | 통과한 단계와 필요한 승인·증거·예산                                  | `decide`                          | `PHASE_READY`와 다음 단계, 실제 승인 확인 책임을 반환한다.                                                                    |
| AP-S03 | 승인된 pending/current 단계와 유효 증거                              | `decide`                          | `CONTINUE_CURRENT`와 같은 경계를 반환한다.                                                                                    |
| AP-S04 | rollover 참조와 남은 횟수                                            | `decide`, `claim`                 | `ROLLOVER_READY` 뒤 한 번만 `CLAIMED`; 시작 요청문은 수신 세션의 대기와 승인 확인 책임을 명시한다. 세션 생성은 호출자 몫이다. |
| AP-S05 | 이미 claimed된 기록                                                  | `claim` 반복·다른 executor        | 기록 바이트를 바꾸지 않고 reconciliation/duplicate STOP을 반환한다.                                                           |
| AP-S06 | claim 뒤 실제 세션 ID                                                | `receipt`, 일치하는 ID로 `decide` | `RECEIPT_RECORDED`, 이후 공통 안전 검사 통과 시 `CONTINUE_CURRENT`; 영수증 자체는 실행 권한이 아니다.                         |
| AP-S07 | receipted 기록에 active STOP 또는 무효 증거                          | 일치하는 ID로 `decide`            | 해당 구체적 STOP을 반환한다.                                                                                                  |
| AP-S08 | receipted 기록에 다른 세션 ID                                        | `decide`                          | `STOP_ALREADY_TRANSFERRED`를 반환한다.                                                                                        |
| AP-S09 | source/dirty/참조 변경, 진행 중 활동, 승인·증거 누락, 단계·예산 한계 | `decide` 또는 해당 `claim`        | 기존 구체적 STOP을 반환한다.                                                                                                  |
| AP-S10 | 자체 `verified` 필드나 인자                                          | `prepare` 또는 `decide`           | 엄격한 입력 계약에 따라 거부한다.                                                                                             |

검사: `npx vitest run tests/unit/harness-portability.test.ts`, 이후 `npm run check`.
