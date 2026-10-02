# 아키텍처 재설계 현재 진행 기록 · 2026-10-02

- Source revision: `ae9ff54c33518b77fc0de18feb217660303ac739`. 착수 시 미추적 `docs/features/trusted-approval/`은 다른 작업 소유로 보존했다. 이전 단계·수정 시도의 상세 기록은 [progress-history.md](progress-history.md)에 있다.
- 승인: `spec-original.md`의 “재설계 마무리 하고 구현 까지”, “계속”에 따라 가역적 로컬 구현·검증을 진행한다. AI가 PRD v1에서 기존 CLI를 유지하는 B안을 `policy-delegated` 기술안으로 선택했다. 사용자가 B안을 직접 지명한 것으로 기록하지 않는다. Git·PR·배포·외부 서비스·유료 호출 권한은 없다.
- 계약: `spec-fixed.md` R1–R6, `issues.md` AR-01부터 AR-03, `tests/redesign-scenarios.md` SC-01부터 SC-11. 명령별 오류 인터페이스 정정 뒤 G4/G5 독립 계약 감사 PASS. 이 판정은 구현 AC 판정과 구별한다.
- AR-01: 새 순수 코어와 기존 CLI·배포 helper 회귀를 구현했다. 예상 Red 2개 뒤 관련 Green 132/132 종료 0, 독립 감사 지적 수정 후 관련 Vitest 133/133·typecheck·lint·diff 검사 모두 종료 0([최종 관련 로그](evidence/ar01-review-green.log)). 변경 전 `ae9ff54` CLI와 원시 비교 12/13, 요청된 중복 안내 출력 차이를 정규화한 비교 13/13. 코어 문맥 주입과 설치본 동일 입력 coverage를 수정한 뒤 AR-01 AC 독립 PASS 판정을 받았다.
- AR-02: 변경 전 CLI의 동일 입력 14개 기준선을 고정했다. 독립 감사에서 잘못된 전역 기준선의 행별 성공 표시 결함을 지적받아 수정했다. 수정 후 평가 14/14 비교 가능·기대 판정 일치, 기준선 대비 변화 0, 실패 0; 관련 Vitest 4/4 및 ESLint 종료 0. 잘못된 기준선 schema·출처·corpus는 모든 row `pass: false`, `comparable: false`이며 명령 실패. 독립 AR-02 AC PASS. 모든 row의 승인 출처는 `not_checked`이며 평가 결과는 실제 승인 확인이 아니다. [평가 실행 기록](evidence/evaluation-run.md)에 기준선·명령·해시가 있다.
- AR-03: 변경 전후 `npm run check`의 디자인 검사는 한 번이므로 체인을 유지했다. `handoff:eval`만 `test` 뒤에 추가됐다. 검토한 앵커 16/16은 유효해 범용 파서를 보류했다. 훅 payload의 쓰기 대상을 신뢰성 있게 판별할 근거가 없어 훅 동작을 유지했다. 관련 `npm run design:check` 종료 0, 디자인 선언 84개. 최종 `npm run check` 1회 종료 0: lint, 디자인 84개, 등록 스킬 15개·파일 62개, 서식, Vitest 149/149, 오프라인 평가 14/14·변화 0, 타입 검사. 실행 시점과 이후 문서 정리는 [최종 검사 기록](evidence/final-check.md)에 분리한다.
- 보고서 최종 브라우저 확인: Chrome에서 최신 문구를 새로고침해 넓은 화면과 Responsive 400×706의 카드·줄바꿈을 확인했다. 목차 `#roadmap`·`#implementation` 이동과 Tab으로 `진행 기록` 링크에 표시되는 포커스를 확인했다. 로컬 HTTP 서버는 확인 뒤 종료했다. 이 시각 확인은 모든 링크 대상 본문과 전체 표 스크롤의 검증은 아니다.
- 최종 독립 판정: AR-03-AC1/2/3 모두 PASS. G4/G5 계약 감사, AR-01/02 구현 AC, AR-03 문서·검사 AC와 최종 로컬 통합 검사가 각각 완료됐다([최종 독립 검토](evidence/final-review.md)). 독립 검증자는 변경 문서와 실행 증거를 대조했으며 통합 검사·Chrome 실행은 구현자 증거를 검토한 것이다.
- 남은 경계: 역사적 Green과 이번 구현 검사는 서로 다른 시점이다. 속도·토큰·비용 개선과 실제 훅 발화는 측정하지 않았으며, 전체 링크 대상 본문·표 스크롤은 브라우저에서 전수 검증하지 않았다. 승인 출처 검증 수단과 자동 재개는 범위 밖이다.
- STOP: 새 보안·외부 권한 필요, 기존 STOP/예산·schema·명령 훼손, 기준선/입력 해시 불일치, 독립 감사 실패, 진전 없는 반복. 증거와 복구 조건을 남기며 승인 범위 밖 변경은 진행하지 않는다.
