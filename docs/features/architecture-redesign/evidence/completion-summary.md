# 아키텍처 재설계 완료 단계 요약 · 2026-10-02

## 현재 범위와 판정

- 기준 root HEAD는 `58b8e6e6d3479f84404dfc5f41403c2ee85e63f0`이다. AR-04–07의 승인된 가역적 로컬 구현과 각 AC 독립 PASS는 기존 증거에 기록됐다. AR-01–06의 이전 완료분은 `0c96b805f345b4d8fadcb6c7079bab69f4fa392f`로 `master`와 `origin/master`에 전달된 역사적 상태다. 이번 완료 단계의 후행 Git 전달 여부는 별도로 확인해야 한다.
- root `.prettierignore`와 `eslint.config.mjs`의 두 변경은 별도 Git 프로젝트 `harness-map/**`를 루트 검사에서 제외하는 경계 조정이다. 검사 전후 별도 Git HEAD `91e85bcb1c57fe86e2ca82b62270a8d570276a9b`와 그 17개 원본 파일 해시는 동일했다. 별도 Git 자체의 ESLint 28오류는 미수정이다. 다른 소유 변경은 보존했다.
- 현재 source의 root `npm run check` 최종 종료 코드 **0**: lint, 디자인 선언 84개, 하네스 스킬 15개·등록 62개, Prettier, Vitest 4파일 178/178, 인계 평가 실패 0, 타입 검사 통과. [최종 인계](completion-root-final-handoff.md), [검사 manifest](completion-root-final-recovery-manifest.json), [전체 로그](completion-root-final-recovery-check.log)를 대조했다. 전체 로그 SHA-256은 `db2ac7185ee887eabfc2bf1b4ca64cc6c940dab8597f2ee665d089ec8577f3af`이다. 앞선 root 검사에서 별도 Git lint 28오류, 첫 최종 검사에서 준비 JSON 서식, 다음 검사에서 생성 시각 JSON 서식으로 각각 종료 1이었으며 원본 기록을 보존했다. 최종 PASS가 선행 실패를 삭제하지 않는다.
- 위 전체 검사는 당시 보고서 HTML 바이트와 결과 문서 작성 전의 검사다. 결과 문서 델타는 대상 Prettier(최초 종료 1, 서식 수정 후 종료 0)와 `npm run design:check`(종료 0), 최종 HTML Chrome 재렌더로 따로 판정했다. 디자인 정적 검사는 루트 `docs/architecture/index.html`의 84개 선언에 관한 것이며 보고서 시각 검증이 아니다.

## 실제 브라우저와 성능 관찰

- 변경 전 보고서 HTML SHA-256 `1a190b89d0a44433237cc1e393d30011683a6b229a92cb87d1c0ab52d86e6653`의 [Chrome 관찰](completion-chrome-render.md)과 JPEG 4개를 보존했다. in-app browser 연결 실패도 [선행 실패 기록](completion-browser-check.md)에 남겨뒀다. 이 문구를 반영한 **최종 HTML 바이트** SHA-256 `5499eda7f21b964aa34b0859f95667a21588956fb9c362ffd15a9eb12d8e50e6`의 [최종 Chrome 렌더](completion-final-render.md)는 CSS 폭 1280px/400px에서 페이지 전체 가로 넘침 없음, `#options`/`#today` 목차 이동, 좁은 표와 구조도 내부 가로 스크롤, 콘솔 `error`·`warn` 빈 배열을 다시 확인했다. 범위 밖 상대 링크의 HTTP 결과와 전체 문서 스크롤은 전수 확인하지 않았다.
- [실제 CLI 측정](completion-metrics-report.md)은 warmup 28회와 본 측정 140회, 70쌍이다. 모든 쌍의 의미 결과가 같았다. 현행판−역사판 벽시계 대응 쌍 중앙값은 **+0.563ms**로 이 workload의 시간 개선은 입증되지 않았다. stdout+stderr 합계 byte는 **−6.24%**였지만 모델 입력 토큰이나 비용이 아니다.
- 사용자 승인 후 수행한 [AI source-reading 실험](completion-ai-usage-result.md)은 동일한 단일 질문을 각 판 3회, 총 6회 새 `codex exec` 프로세스로 수행했다. 6/6 답과 oracle 일치, 종료 0이다. 평균 CLI 보고 input은 역사판 **95,591**, 현행판 **91,082** 토큰이고 wall은 **18.41초**, **18.04초**다. 대응 세 쌍의 현행판−역사판 input 차이는 −27,494·+289·+13,678토큰, wall 차이는 −1.56·+0.22·+0.23초로 각 지표 모두 2쌍에서 현행판이 더 컸다. 캐시 사용량이 다르고 그룹당 표본이 3개라 신뢰할 수 있는 속도·토큰 절감을 입증하지 않는다. 요청한 모델은 `gpt-5.6-sol`, effort는 `medium`, CLI는 `0.157.0`이지만 실행 JSONL의 실제 모델·effort ID는 **unknown**이다. 청구 기록이 없어 실제 비용 비교도 **unknown**이다. 이전 preflight는 model event 0인 환경 실패로 여섯 표본에 포함하지 않았다.

## 남은 경계

- native hook의 신뢰 승인·실제 발화, 전체 프로젝트의 토큰·성능 효과, 실제 청구 비용, 다른 OS·원격 CI, 전체 제품 수락은 이 증거로 판정하지 않는다.
- 최종 문서 바이트의 Chrome 재렌더는 위 SHA로 기록했다. 독립 델타 검토 결과는 별도 기록과 현재 체크포인트에 반영한다. 추가 외부 작업은 그 실행 결과와 권한을 별도로 대조한다.
