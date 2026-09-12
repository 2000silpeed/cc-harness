# PM-07 재개 전 독립 검토

실행 ID: `pm-resume-20260913`. 검토자 Nash는 이전 Red 작성자와 별도 컨텍스트다. 구현 완료 AC 판정이 아니라 Green 진입 전 테스트 준비 검토다.

## 1차 검토

- 타입 검사와 단위 테스트 73개 수집 통과. 실행은 61 assertion 실패·12 통과이며, 수정된 fixture에서 이전 null 접근 오류는 재현되지 않았다. 통과 12개는 ZIP no-op도 통과하므로 구현 증거가 아니다.
- 수식 셀의 캐시가 숫자여서 일반 텍스트 필드 검증만으로도 거부될 수 있었다. 정상 캐시를 사용하고 수식이라는 이유를 검증해야 한다.
- shared 수식의 C3가 시트 범위 밖이라 직렬화되지 않았다. 실제 anchor·follower가 존재하는 fixture와 두 위치 검증이 필요하다.
- 미리보기에서 적용 버튼이 영구히 없어야 한다는 브라우저 단언은 PM-08과 충돌한다. 자동 저장하지 않음·취소 시 보존을 지속 계약으로 삼아야 한다.
- Worker 5초 제한·오류·처리 중 취소·늦은 결과 폐기 설계의 테스트가 누락되어 있다. 구현 전 결정적 테스트와 최소 stub을 추가한다.
- 정규화 문구는 내부 공백 삭제가 아니라 앞뒤 공백 제거로 명확히 한다. 요구사항은 바꾸지 않는다.

원시 로그: `tmp/pm07-resume-review-UjT0zM/`. 이 검토는 준비 보완 필요이며 Green 승인이 아니다. 과거 STOP 기록은 보존한다. 보완은 Green 이전 시나리오 준비에서 수행하고 독립 재검토 후 새 Red로 진행한다.

## 기존 변경 검토

메인이 PM-03–PM-06 UI·도메인·저장소 및 의존성 변경을 검토했다. 백업 전체 교체와 삭제는 확인 후 트랜잭션 완료 시에만 성공하며 검색·간트는 같은 행 집합을 사용한다. SheetJS는 공식 배포 URL·잠금 무결성 값으로 고정되어 있다. `git diff --check` 통과.

재개 전 기존 단위 회귀: `npm test -- --exclude tests/unit/program-excel.test.ts --exclude tests/unit/xlsx-zip.test.ts` → 157개 통과, exit 0. 로그 `tmp/pm-resume-baseline-regression.log`. PM-07 제외를 전체 통과로 해석하지 않는다. 이번 검토에서 기존 브라우저 80개는 재실행하지 않았으며 과거 PM-06 검증 기록과 구분한다.

5173·5174 서버와 `tmp/pm-sample-100.json` 존재를 확인했으며 브라우저 저장 데이터를 수정하지 않았다. 임시 로그·샘플·dist·node_modules는 커밋 대상에서 제외한다.

## 보완 후 독립 재검토

Jason이 Green 이전 준비 단계에서 수식 fixture·공백 계약·브라우저 단언을 보완하고 Worker lifecycle 9사례와 최소 stub을 추가했다. Nash가 재검토하여 `PASS_PREPARATION_ONLY`로 판정했다. 타입 exit 0, 단위 83개 수집(Excel 40·ZIP 34·Worker 9), 실제 fixture helper의 normal/shared/array 직렬화·읽기 독립 probe exit 0이다. 증거: `tmp/pm07-resume-review2-TroVwS/`.

재검토 최초 셸 래퍼가 zsh 읽기 전용 변수 `status`에 대입해 실패했다(`tmp/pm07-resume-review2-xp2cDQ/`). 실제 Red 이전의 검증 래퍼 오류이며 제품·테스트 실패가 아니다. 메인이 준비 검증의 가역 수정으로 분류해 `result_code`로 고친 래퍼만 재실행하도록 했다. 이전 Red STOP이나 Green 횟수를 초기화하지 않았다.

lint·design·harness·format 검사는 exit 0. 새 테스트 본문은 재검토에서 실행하지 않았으며, 준비 통과를 Green 진입 또는 전체 제품 통과로 주장하지 않는다. 기준 커밋은 미구현 테스트와 세 최소 stub을 포함한다. 커밋 후 새 Red에서 실제 미구현 실패를 확인한다.
