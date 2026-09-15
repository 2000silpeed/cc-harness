# 이슈 MR-IMP-01 시나리오

- 근거 PRD·AC·대상 코드: [issues.md](../issues.md), `docs/harness/templates.md`, `scripts/install-harness.mjs`, `tests/unit/harness-portability.test.ts`
- 계약: registered harness files만 installer가 복사하며 project-owned 파일은 보존한다. canonical Adaptive Execution JSON example은 유효 JSON이고 `unknown` 관측값과 유한 예산을 표현한다.
- 검토 상태·사용자 결정 근거: 최신 명시 구현 승인이 이 이슈의 범위와 아래 7 경계를 포함한다. 문서의 작성 자체를 사용자가 읽고 G4/G5로 승인했다고 주장하지 않는다.

| ID   | AC    | 분류 | Given                                                                    | When                       | Then                                                                                                                   | 테스트 층 | 격리할 의존성            |
| ---- | ----- | ---- | ------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------ |
| S-01 | AC-01 | 정상 | 승인된 변경이 있다                                                       | process profile을 고른다   | profile과 role routing을 별도 metadata로 기록한다                                                                      | 문서 계약 | 실제 backend             |
| S-02 | AC-02 | 경계 | 한 줄 권한 변경 또는 영향 범위가 불명확하다                              | profile을 고른다           | compact를 거부하고 standard 이상 또는 user gate로 올린다                                                               | 문서 계약 | 실제 task classifier     |
| S-03 | AC-03 | 경계 | Green 3회 실패 또는 no-progress다                                        | escalation을 검토한다      | STOP이 diagnostic보다 우선하고 budget을 reset하지 않는다                                                               | 문서 계약 | 실제 orchestration trace |
| S-04 | AC-04 | 정상 | relevant code·contract·AC·test·command·environment metadata가 모두 같다  | reuse를 판단한다           | 추가 탐색·테스트 없이 evidence를 재사용한다                                                                            | 문서 계약 | 실제 environment         |
| S-05 | AC-04 | 경계 | code는 같지만 environment가 바뀌었다                                     | reuse를 판단한다           | 전체 lifecycle 대신 영향 검사만 재검증한다                                                                             | 문서 계약 | 실제 environment         |
| S-06 | AC-03 | 경계 | 동일 count지만 command/signature/tool version/scope fingerprint가 다르다 | ratchet를 비교한다         | regression으로 기록하고 count만으로 pass 처리하지 않는다                                                               | 문서 계약 | 실제 orchestration trace |
| S-07 | AC-03 | 정상 | diagnostic을 한 번 호출했다                                              | diagnostic 결과를 반환한다 | 예산을 소비하고 새 worker가 구현을 재개하며 counter는 유지된다                                                         | 문서 계약 | 실제 orchestration trace |
| S-08 | AC-05 | 정상 | routing field 없는 과거 증거가 있다                                      | RESUME한다                 | legacy unknown으로 보존하고 effective checkpoint 이후만 새 policy를 적용한다                                           | 문서 계약 | 실제 legacy repository   |
| S-09 | AC-06 | 정상 | metadata가 제공되지 않거나 profile 결과 비교가 필요하다                  | result example을 읽는다    | requested/observed, profile/retry/escalation/verification/rework/outcome/usage source·unit·coverage가 유효 JSON에 있다 | unit      | 파일 시스템              |
| S-10 | AC-07 | 예외 | target에 project-owned 파일 또는 customized registered file이 있다       | installer를 apply한다      | 전자는 보존하고 후자는 아무 registered file도 쓰지 않고 충돌한다                                                       | unit      | 임시 디렉터리            |

## 미정·제외

실제 agent가 profile을 선택하고 backend metadata를 관찰하는 runtime trace는 이 문서 테스트로 검증하지 않는다. main orchestration의 별도 verifier가 구현 뒤 관찰한다.

## 실행할 테스트 명령

`npx vitest run tests/unit/harness-portability.test.ts`
