# AR-06 W1/W2 직접 CLI 측정

- **운영 판정: 캐시 후보 불채택.** W1/W2는 보존한 후보 검사기 SHA `6914e45c...bade`의 격리 실험이다. 현재 운영 `scripts/check-design-system.mjs`는 HEAD `228fea9`의 SHA `683a499c26a91f97918e2187543cb13415b45992a0f2456424beb291a14cb417`로 복원되어 기본·훅 호출 모두 full 검사한다. 후보에서 관찰한 full/cache-hit 횟수는 현재 운영 동작이 아니다.
- 판정: W1/W2 관찰 계약 충족.
- fixture root: `/private/var/folders/bc/dgnqfptd3g980z9ybm8kw5fh0000gn/T/ar06-direct-entry-d534RI/project`; 입력 4개 SHA와 환경·stdin SHA는 JSON에 기록했다.
- checker SHA: 기준 `683a499c26a91f97918e2187543cb13415b45992a0f2456424beb291a14cb417`, 후보 `6914e45c90ca23faa7ac49a67b8eb63bae1af21eaf71248f958179f72536bade`.
- W1: 기준 full 12/12; 후보 full 6/12, 재사용 6/12.
- W1은 각 버전마다 3 round의 cold hook → warm hook 2회 → 일반 full을 실행했다. 12호출 wall ms 기준 min/median/max는 기준 `31.618/33.467/99.585`, 후보 `31.572/33.212/36.854`다. 중앙값 차이는 약 `0.255ms`이고 기준 초기 호출에 `99.585ms`의 이상치가 있다. 실행 순서와 분산을 고려하면 **시간 단축은 입증되지 않았다**. 개별 24행은 JSON에 보존했다.
- W1 stdout은 기준 `504B`(12/12회 출력), 후보 `486B`(6/12회 출력)다. warm hook만 보면 기준 `18B`, 후보 `0B`다. 모든 종료 코드는 `0`, 두 버전 일반 full은 같은 `84개 선언`을 출력했다. 후보는 full 파싱 6회를 생략했지만 Node 프로세스 시작·입력 hash 비용은 남는다.
- W2 성공 cache SHA 7fd82b905d1110d26a87df7163c80dc5020662408ce1ecbfba1fea64398ad823; 무효 후 SHA 7fd82b905d1110d26a87df7163c80dc5020662408ce1ecbfba1fea64398ad823.
- W2의 기준 무효 hook은 종료 `2`, 후보 무효 hook 두 번은 각각 `2`, 후보 무효 일반 full은 `1`이다. 모두 `디자인 기준 이탈`을 진단하고 full 경로를 거쳤다. 유효 바이트 복원 뒤 후보 hook은 기존 성공 서명으로 빈 stdout·종료 `0`이었다. cache 경로 mode는 디렉터리 `0700`, record `0600`이다.
- 재현 출처: [측정 당시 runner 원문](ar06-measure-runner.mjs.txt) SHA-256 `41c23dc6d6e63491821e68482205f5d7c2ee13c1548ff8244d03e025250015d0`. 당시 runner는 `git show 228fea9:scripts/check-design-system.mjs`와 그때의 후보·네 디자인 입력을 임시 프로젝트에 복사하고, 동일한 `PATH/TMPDIR/LANG/TZ`와 합성 stdin으로 각 호출을 실행했다. 측정 전 `node --check` 종료 `0`을 확인했다. **원본 runner는 현재 그대로 재실행하면 안 된다.** 운영 검사기가 기준판으로 복원되어 비교 변수가 사라졌고 runner의 출력 경로는 이 원본 raw JSON/Markdown을 가리켜 덮어쓸 위험이 있다. 재현하려면 별도 임시 checkout/사본에 네 디자인 입력을 놓고 JSON의 SHA 네 개와 각각 일치하는지 확인한 뒤, [보존 후보 검사기](ar05-cache-candidate.mjs.txt)의 정확한 바이트(SHA `6914e45c90ca23faa7ac49a67b8eb63bae1af21eaf71248f958179f72536bade`)를 그 사본의 `scripts/check-design-system.mjs`에 놓는다. runner도 임시 사본으로 복사해 `repository`를 그 checkout으로, `evidenceDir`를 원 저장소 밖의 새 임시 출력 디렉터리로 바꾼 후 실행한다. 두 버전의 입력·환경·stdin SHA가 이 JSON과 다르면 비교 불가로 처리한다. 측정 당시 runner 바이트와 raw 29행은 수정하지 않았다.
- 비교 경계: 기준판을 먼저, 후보판을 나중에 실행했으며 OS 파일 cache·런타임 준비 상태를 완전히 통제하지 않았다. 이 측정의 분모는 checker 직접 진입 12회/버전이다. 전체 하네스의 시간·토큰·비용 절감으로 외삽하지 않는다. 추가된 cache 로직의 유지 비용과 full 파싱·stdout 감소를 함께 판단해야 한다.
- 측정 후 원본 fixture `/private/var/folders/bc/dgnqfptd3g980z9ybm8kw5fh0000gn/T/ar06-direct-entry-d534RI`와 그 안의 cache를 본 작업자가 범위 확인 후 제거했고, 제거·부재 확인 명령은 종료 `0`이었다. JSON의 `fixture_root`는 당시 비교의 절대 경로를 기록한 값이며 현재 존재하는 경로가 아니다. `/tmp`의 runner 실행 복사본도 보존 원문과 `cmp` 일치 확인 후 제거했다. 원본 저장소의 네 디자인 입력은 측정 전후 SHA가 같았다.
- 채택 판단 근거: 후보는 12호출 중 full 6회를 줄였지만 전체 stdout 차이는 `18B/504B = 3.57%`, 중앙값 차이는 `0.255ms/33.467ms = 0.76%`에 그쳤다. 3 round·순서 편향·초기 이상치 아래에서 wall 개선을 확정할 수 없어 운영 코드를 단순한 기존 전체 검사로 되돌렸다. [후보 코드·테스트 보존과 Red/Green](ar05-cache.md)을 참조한다.
- `scan`은 stdout/오류와 checker 분기에 근거한 직접 CLI 관찰 분류다. native Codex/Claude 훅 신뢰·발화, 토큰·비용은 unknown이다.
- assertion: 없음.
