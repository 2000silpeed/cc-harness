# AR-07 최종 독립 검토와 후행 문서 기록

## 독립 판정

- `hardening_verify`가 기준 HEAD `0c96b805f345b4d8fadcb6c7079bab69f4fa392f`와 후보 manifest 33개 파일을 읽기 전용으로 감사해 AC1·AC2·AC3 모두 PASS를 반환했다. SHA를 직접 재계산해 33/33 일치했다. 검증자는 파일 수정·테스트 실행 없이 증거를 검토했다.
- 평가기 SHA-256 `1e6449fa760d7ea5631aeb26c048dfc59d6ed550d6ad068afe36495caa981211`, 테스트 SHA-256 `521fefc0c997791e10fdf524f87b28f4ea290b6cfaf1c0b90ce7b889803f75c2`가 최종 대상이다. 동결 계약·시나리오·corpus·baseline은 유지됐다.
- AC1: 시작 시점 로컬 master·HEAD·원격 master가 `0c96b805…`로 일치했고 이전 전달과 이번 보완 기록이 분리됐다. AC2: 고정 역사 CLI SHA, 원시 14개 출력·상태의 baseline 재구성 14/14, 실제 capture SHA를 대조했다. 같은 `STOP_ACTIVE`의 잘못된 reason은 종료 1·`candidate_mismatch`·`result.reason`으로 실패한다. 관련 6/6, provenance Red 1실패→Green 6/6, 평가 14/14·변화 0을 확인했다. AC3: 앵커 지원·제외 범위가 검사기와 회귀에 맞고 core·CLI·디자인 checker는 불변이다.
- [격리 최종 검사](ar07-final-isolated-check.log)는 종료 0, Vitest 178/178, 평가 14/14와 typecheck PASS다. `.git` 없는 HEAD archive + 소유 파일 + 동일 node_modules 환경이다. 현재 root 전체 검사는 미실행이며 후행 문서 바이트는 별도 정적 검사로 구분한다.

## 실행 컨텍스트

- 새 작업자 생성은 `agent thread limit reached`로 실패했다. 설치 CLI의 `exec --ephemeral`에서 기존 이력·resume·fork 없이 새 후속 작업을 실행했다.
- 첫 CLI thread `01a0fc13-0952-70d2-8032-4c65df97b04e`은 모델 미지원 HTTP 400으로 종료 1·작업 미실행이었다. 후속 thread `01a0fc13-fc95-7901-be9b-d58f2c1afd6c`는 이번 호출만 `gpt-5.6-sol/medium`을 요청했고 종료 0이었다. model·effort 실제 관찰값은 unknown이며 전역 설정은 불변이다.
- 후속 CLI `turn.completed` 한 턴의 관찰 토큰: input 2,405,881, cached input 2,307,072, cache write 0, output 24,251, reasoning output 6,458. 출처 `/tmp/cc-harness-ar07-final-worker-events-2.jsonl`; 포함 관계를 더하거나 전체 프로젝트 사용량·비용·절감으로 해석하지 않는다.

## 후행 국소 문서 반영

- 메인은 독립 판정 수신 후 progress, 검사 기록, HTML 보고서와 이 검토 기록 4개 문서만 사실 갱신했다. 실행 코드·테스트·계약·권한·STOP 동작은 불변이며 새 추상화·의존성 0이다. 필수 정책의 compact 예외와 메인의 진행 기록 권한을 적용한다.
- 대상 문서 4개의 `npx prettier --check`, 보고서 `npx eslint`, `npm run design:check`는 모두 종료 0이었다. 디자인 검사는 루트 구조도 84개 선언의 정적 결과다. 별도 독립 델타 검토를 유지하며 실제 넓은/400px 렌더·native 세션·시간/토큰/비용 절감은 미검증이다.
