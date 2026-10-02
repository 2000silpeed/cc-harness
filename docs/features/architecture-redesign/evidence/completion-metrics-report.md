# 완료 단계 로컬 CLI 측정 · 2026-10-02

## 범위와 결론

- 비교 대상은 `session-handoff.mjs` 실제 CLI의 역사판(`ae9ff54c33518b77fc0de18feb217660303ac739`의 blob SHA-256 `19823e889fa3e3db7a74b98610f8efbe8fd4412248860d7cf313b4176b84aefe`)과 현재 HEAD `58b8e6e6d3479f84404dfc5f41403c2ee85e63f0`의 CLI SHA `b9c64fb48edf85a94eb42a2cc5698f8854431c596db485fd087bc79f7dab031b` 및 상대 import 코어 SHA `824c40fa8c7a677125945f8188a1e3bb8d57f9c110286ce607f80b2e82e8e283`다. 순수 코어 함수만 호출한 속도와 CLI 속도를 혼동하지 않는다.
- 같은 14개 fixture case, 1회 warmup과 5회 paired 반복에서 본 측정 140회 모두 기대 종료 코드·의미 관찰·record 전후·config/input 불변을 만족했다. 역사판과 현행판의 70쌍 모두 의미 결과가 같다. `npm run check`의 14/14 평가는 별도 역사 증거이고 이번 수치는 실제 CLI 프로세스 실행이다.
- 70개 호출의 벽시계 중앙값은 역사판 **124.778 ms**, 현행판 **124.900 ms**다. 대응 쌍의 현행판−역사판 중앙값은 **+0.563 ms**, 사분위 구간은 **−2.784~+4.176 ms**이며 현행판이 느린 쌍은 41/70이다. 이 사분위는 70개 차이를 정렬한 뒤 0 기반 인덱스 `floor((n−1)/4)=17`, `floor(3(n−1)/4)=51`의 관찰값을 택한 방식이다. 보간 방식인 Python `statistics.quantiles(n=4)`로 계산하면 **−2.919~+4.338 ms**다. 전체 합계는 역사판 8.479 s, 현행판 8.921 s였으나 round별 합계 차이가 −175~+652 ms로 흔들리고 현행판 최대 456.894 ms의 이례 표본이 있다. 이 로컬 workload에서 시간 개선은 입증되지 않았다. 동일한 환경의 작은 표본을 전체 프로젝트 속도로 외삽하지 않는다.
- Python의 `resource.getrusage(RUSAGE_CHILDREN)`를 각 CLI 호출 앞뒤에 읽은 CPU(user+system) 차이의 중앙값은 역사판 **43.602 ms**, 현행판 **44.873 ms**이고 대응 쌍 차이 중앙값은 **+1.074 ms**다. 이는 Python이 기다린 자식의 usage delta로 수집한 값이며 Node가 실행한 Git 손자 프로세스의 CPU 포함 여부는 확인하지 않았다. 벽시계에는 Git 실행 시간이 포함된다.
- stdout+stderr 원시 byte 합계는 역사판 **37,490 B**, 현행판 **35,150 B**, 차이 **−2,340 B(−6.24%)**다. 이 차이는 CLI 로컬 출력량이며 모델 입력 토큰, 사용자에게 제시된 대화 내용, API 과금액을 측정하지 않는다.

## 재현 계약과 원시 증거

- 실행: `python3 docs/features/architecture-redesign/evidence/completion-metrics-benchmark.py` → 최종 종료 **0**. 스크립트 SHA-256 `0c054c46a28aecfaf011bba9c6db063410ecbf856d95012305028e856dc429b8`, [원시 행과 대응 쌍](completion-metrics-raw.json) SHA-256 `9dc3799c6535536dd0558d24085557659cbed7694805cc64444c54acd60f08c1`. 원시 증거는 warmup 28회와 본 측정 140회, 총 168회 각각의 setup/clone ns, CLI wall ns, Python `RUSAGE_CHILDREN` 차이 µs(`child_user_us`·`child_system_us`), 출력 byte와 SHA, 종료 코드, 의미 관찰, 불변 검사를 담는다.
- fixture Git revision `7cfde09197911b026e8422e155b11f451792e479`; 원본 dirty `tracked.txt` SHA `7b9a72466d3960eb2aacccfc848939453490db0678bd4725def3f789b891c919`. 각 호출마다 이 revision을 별도 clone하고 동일 `tracked.txt` 변경, record/input/config를 배치한다. dataset, source, fixture 해시는 실행 직전에 검증한다. Node `v24.14.1`, Git `2.52.0`, macOS의 같은 Python 프로세스·환경·cwd/명령 규칙에서 역사판과 현행판 순서를 case/round마다 뒤집었다. 두 버전의 소스 사본은 같은 OS 임시 영역에 두고 현행판만 기존 상대 import 코어를 함께 둔다.
- wall/CPU 측정은 프로세스 실행 앞뒤를 감싼다. CPU는 Python 프로세스의 `RUSAGE_CHILDREN` 누적값 차이로 기록했다. clone·입력 생성의 setup 시간은 별도 측정하여 CLI 시간에 더하지 않는다. 반복 사이의 OS 파일 캐시·프로세스 스케줄링은 통제하지 못하므로 첫 warmup을 성능 통계에서 제외하고 paired 순서를 교차했다. 각 새 clone의 데이터 상태는 같지만 이후 시스템 캐시까지 차갑게 만들었다는 주장은 하지 않는다.
- 첫 실행은 스크립트가 실패 case의 stderr 오류를 stdout JSON으로만 파싱해 한 case×5 round의 양쪽 버전 각 5회와 5쌍을 **측정기 오류**로 분류했고 종료 **1**이었다. [첫 실행의 원시 행](completion-metrics-first-attempt.json) SHA-256 `877b6099aaa3c6c540d7dfcb150a5fa1e6a8d63f91462120487ec3da18827dfc`를 보존했다. 양쪽 CLI는 실제로 기대 종료 코드 1과 같은 stderr를 반환했다. 측정기를 해당 계약대로 수정한 뒤 전체 1+5 paired round를 새로 실행했고 warmup·본 측정 모두 실패 0, 70/70 대응 쌍 parity, 종료 0이었다. 첫 실행의 실패 표본을 속도 통계에 합치거나 유리한 부분만 선택하지 않았다.

## 토큰과 비용의 판정 경계

- 이 CLI workload는 직접 LLM/API 호출을 하지 않아 **이 168회 실행의 모델 호출은 0**이다. 이는 전체 하네스 작업의 모델 토큰·비용 절감이 0이라는 뜻이 아니다. AI 오케스트레이션의 역사판/현행판을 같은 업무로 실행한 matching usage telemetry와 실제 청구 데이터는 없다. 따라서 **프로젝트 전체 토큰·실제 비용의 증감은 비교 불가**다.
- 별도 유료 provider 실험·가격 추정은 수행하지 않았다. AR-06의 디자인 검사 cache 측정과 그 운영 불채택 결정을 대체하지 않는다. 토큰·비용 개선을 검증하려면 같은 승인·STOP·품질 게이트와 같은 사용자 업무를 두 버전에서 수행한 실제 입력/출력/캐시 토큰 및 청구액 telemetry가 필요하다. 그 실험은 이번 로컬 CLI 비교의 관찰 범위 밖이다.
