# AR-05 성공 snapshot 훅 캐시 · 작업자 증거

**최종 판정: 실험 후 운영 불채택.** 이 문서의 Green은 격리된 후보 구현의 동작 검증이다. W1에서 full 파싱 6회와 warm stdout 18B를 줄였으나 wall 중앙값 차이 약 0.255ms는 속도 개선 근거가 되지 않았다. 증가한 검사기 113줄·테스트 157줄의 유지 비용을 감안해 후보를 운영 파일에서 제거했다. [후보 검사기](ar05-cache-candidate.mjs.txt) SHA-256 `6914e45c90ca23faa7ac49a67b8eb63bae1af21eaf71248f958179f72536bade`와 [후보 테스트](ar05-cache-candidate.test.ts.txt) SHA-256 `0a70fb50c3cd454ef4b4d690a6421da84c01f244d085e7af105839037b5ceccd`는 바이트 그대로 증거로 보존했다. 현재 `scripts/check-design-system.mjs`는 시작 HEAD 원본 SHA-256 `683a499c26a91f97918e2187543cb13415b45992a0f2456424beb291a14cb417`로 복원했고 신규 후보 테스트는 제거했다. 따라서 현재 기본 `design:check`와 `--hook` 모두 매번 전체 검사한다. W1/W2 수치는 운영 개선 결과가 아니라 후보 비교 실험이다.

- 시작 HEAD: `228fea90465772bc737927f61fd3b560e4076d2a`. 시작 시 `docs/features/trusted-approval/`와 architecture-redesign 계약 파일 등 다른 작업자의 dirty 상태가 있었다. 이 작업자는 `scripts/check-design-system.mjs`, 새 `tests/unit/design-hook-cache.test.ts`, 이 증거 파일만 변경했다.
- Node `v24.14.1`, Vitest `5.0.0`, macOS. 검사기 시작 SHA-256 `683a499c26a91f97918e2187543cb13415b45992a0f2456424beb291a14cb417`; 구현·서식 뒤 `6914e45c90ca23faa7ac49a67b8eb63bae1af21eaf71248f958179f72536bade`. 테스트 SHA-256 `0a70fb50c3cd454ef4b4d690a6421da84c01f244d085e7af105839037b5ceccd`.

## Red · 기존 검사기

실제 명령: `npx vitest run tests/unit/design-hook-cache.test.ts`, 종료 `1`. 첫 fixture의 유효 색상을 기준 문서의 `#e8edf1`로 바로잡은 뒤 실행했다. 기존 검사기는 full 성공 `{}\n` 뒤 캐시를 생성하지 않아 기대한 성공 snapshot 계약에서 실패했다. 전체 원출력은 [ar05-red.log](ar05-red.log)에 보존했다. 아래는 경로를 축약한 발췌다.

```text
❯ tests/unit/design-hook-cache.test.ts (3 tests | 3 failed) 96ms
× reuses only a matching successful hook snapshot and keeps ordinary checks full 35ms
× keeps a successful cache after invalid input and rechecks each invalid invocation 31ms
× runs full for an explicit target, unknown argument, corrupt cache, and symlink input 30ms

FAIL  tests/unit/design-hook-cache.test.ts > reuses only a matching successful hook snapshot and keeps ordinary checks full
AssertionError: expected false to be true // Object.is equality
❯ tests/unit/design-hook-cache.test.ts:65:29
65|   expect(existsSync(cache)).toBe(true);

FAIL  tests/unit/design-hook-cache.test.ts > keeps a successful cache after invalid input and rechecks each invalid invocation
Error: ENOENT: no such file or directory, open '.../private-tmp/cc-harness-design-.../success.json'

FAIL  tests/unit/design-hook-cache.test.ts > runs full for an explicit target, unknown argument, corrupt cache, and symlink input
Error: ENOENT: no such file or directory, open '.../private-tmp/cc-harness-design-.../success.json'
```

첫 Red 실행은 fixture에 허용되지 않은 `#0f172a`를 넣어 디자인 기준 오류로 실패했다. fixture를 계약에 맞게 수정하고 위 Red를 다시 확인했다. 검사 기준은 완화하지 않았다.

## 구현과 Green

- 캐시는 정확한 기본 `--hook` 인자에서만 적용한다. 기준 문서 3개·기본 HTML 1개를 바이트 snapshot으로 한 번 읽고, 검사기는 그 snapshot 텍스트를 사용한다. 검사기 자신의 파일 바이트·root identity·네 입력 바이트의 SHA-256이 이전 **full 성공** record와 같을 때만 stdout 없이 종료 `0`이다. `--hook` cold full의 기존 stdout `{}`와 오류 진단·종료 `2`를 유지한다.
- 캐시 경로는 `join(os.tmpdir(), 'cc-harness-design-' + sha256(resolve(scriptRoot)), 'success.json')`. mode는 디렉터리 `0700`, record `0600`; 현재 사용자 소유의 정규 파일만 읽는다. 성공 full 뒤 임시 파일을 `wx`로 만들고 `rename`한다. cache 누락·손상·심볼릭 링크·권한 오류·지원하지 않는 Windows와 명시 target·알 수 없는 인자는 full 경로다. 실패한 디자인은 성공 record를 덮어쓰지 않는다.
- fixture는 매 테스트마다 독립 `os.tmpdir()/design-hook-cache-*`에 검사기·기준 문서 3개·HTML을 복사한다. 테스트가 해당 임시 경로만 정리하며 저장소 fixture나 다른 작업자의 파일은 수정하지 않는다.

실제 관련 검사와 종료 코드:

```text
npx vitest run tests/unit/design-hook-cache.test.ts  # exit 0, Test Files 1 passed (1), Tests 5 passed (5)
npx eslint scripts/check-design-system.mjs tests/unit/design-hook-cache.test.ts  # exit 0
npx prettier scripts/check-design-system.mjs tests/unit/design-hook-cache.test.ts --check  # exit 0, All matched files use Prettier code style!
npm run typecheck  # exit 0, tsc --noEmit
git diff --check -- scripts/check-design-system.mjs  # exit 0
```

집중 테스트에서 cold `{}\n` → 동일 snapshot warm 빈 stdout → 일반 인자 full 메시지를 확인했다. 입력 손상 2회는 각각 진단과 종료 `2`, 성공 record 불변이며 입력 복원 뒤 기존 서명으로 hit한다. 명시 target·알 수 없는 인자·손상 record·입력/record symlink·읽기 제한·검사기 바이트 변경·root 변경도 full 경로를 확인했다. **이 테스트는 직접 CLI 진입점 증거다.** native Codex/Claude 훅의 신뢰·발화, 토큰·비용, 시간 절감은 아직 관측하지 않았고 AR-06의 W1/W2 측정·독립 검증이 남아 있다. 기본 `npm run check`는 이 작업자 범위에서 실행하지 않았다.
