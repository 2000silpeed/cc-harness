# 재설계 시나리오 계약 v1

- 추적 기준: `spec-fixed.md` R1–R6 → `issues.md` AR-01~03 AC. 상태: 명령별 오류 인터페이스 정정 후 G5 독립 검토 PASS; 구현 Red·Green과 독립 AC 결과는 별도 기록한다.
- 각 case는 정상/경계/거부를 구분하고 입력 fixture SHA-256, 기준 HEAD/dirty, 기대 decision 또는 검사 결과, 실행 명령·종료 코드·로그 경로를 구현 시 기록한다. 같은 입력의 baseline과 current를 비교한다.

| ID    | 요구·AC          | Given / When / Then                                                                                                                                                                                           | 기대 판정              |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| SC-01 | R1, AR-01-AC1    | Given 유효한 v1/v2 handoff와 일치하는 HEAD/dirty, When 기존 CLI 네 명령을 실행, Then baseline과 결정·JSON·지속 상태가 같다                                                                                    | PASS                   |
| SC-02 | R1, AR-01-AC2    | Given 활성 STOP·소진 예산·stale ref 각각, When `decide`, Then 기존 우선순위의 STOP ID가 같다                                                                                                                  | PASS                   |
| SC-03 | R1, AR-01-AC2    | Given 퇴역 참조의 재활성화나 실패 증거 제거, When 후속 `prepare`, Then 기존 기록을 바꾸지 않고 거부한다                                                                                                       | PASS                   |
| SC-04 | R2, AR-01-AC2    | Given 로컬 `approved` 문자열과 일치하는 파일 해시만 있는 입력, When `decide`, Then CLI 결과를 실제 사용자 승인 확인/`verified`로 기록하지 않는다                                                              | PASS                   |
| SC-05 | R1, AR-01-AC3    | Given 배포 등록으로 설치된 파일, When 설치된 handoff helper를 실행, Then core import와 출력이 정상이다                                                                                                        | PASS                   |
| SC-11 | R6, AR-01-AC4    | Given 저장 receipt session ID placeholder 또는 claim과 다른 executor, When `decide`가 읽음, Then `STOP_MALFORMED`; When `claim`·`receipt`가 읽음, Then 기존 stderr와 nonzero 종료; 유효 기록은 기존 결과 유지 | 거부/회귀              |
| SC-06 | R3, AR-02-AC1    | Given 동일 corpus·입력 해시의 baseline/current, When evaluator 실행, Then 안정적 case ID별 기대/실제·pass·변화 JSON이 나온다                                                                                  | PASS                   |
| SC-07 | R3, AR-02-AC2    | Given 중복 case ID·누락 baseline·입력 해시 불일치 각각, When evaluator 실행, Then 실패 ID·이유를 남기고 nonzero 종료한다                                                                                      | FAIL 기록              |
| SC-08 | R2/R3, AR-02-AC3 | Given 승인 자기 선언 fixture, When evaluator 실행, Then 구조적 통과와 출처 미확인을 구분한다                                                                                                                  | PASS                   |
| SC-09 | R4, AR-03-AC1/2  | Given 실제 검사·훅 호출 목록, When 관련 명령과 최종 check/가능한 훅 smoke 실행, Then 필수 검사·실패 감지를 보존하고 입증된 중복만 줄인다                                                                      | PASS 또는 훅 변경 보류 |
| SC-10 | R5, AR-03-AC3    | Given 현재 구현 로그와 기존 HTML·문서, When 링크·명령·권한·상태 대조, Then 현재/역사적 증거가 구분되고 모순이 없다                                                                                            | PASS                   |

## G5 판정 경계

테스트 수집·fixture pass는 승인 진위, 독립 AC, 전체 제품 완료를 증명하지 않는다. 분리된 검증자가 시나리오의 요구사항 추적·누락·부정 사례·실제 명령의 타당성을 감사한 뒤 G5를 판정한다. 실패 fixture를 수정할 때 기대값을 구현에 맞춰 완화하지 않는다.

독립 검증자 `/root/redesign_contract_verify`의 조건부 PASS 지적은 SC-11의 명령별 오류 인터페이스를 명시해 해소했다. 정정 후 G5 최종 독립 판정은 PASS (`tests/redesign-scenarios.md` SHA-256 `2a3ab05e…`)이며 구현 테스트 통과를 뜻하지 않는다.

## 2026-10-02 구현 추적

SC-01부터 SC-08과 SC-11의 AR-01/02 범위는 지적된 코어 문맥 주입·설치본 동일 입력 실행·평가기 전역 오류 표시를 수정한 뒤 독립 구현 AC PASS 판정을 받았다. 관련 명령·입력 해시와 남은 경계는 [현재 진행 기록](../progress.md) 및 증거 파일에 둔다. SC-09/10의 문서 정렬과 최종 `npm run check` 종료 0을 확인했고 AR-03 독립 AC1/2/3도 모두 PASS다. 이 단락은 위 G5 시나리오 계약의 당시 해시와 별개인 구현 상태다.
