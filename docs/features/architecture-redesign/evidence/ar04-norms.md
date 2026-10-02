# AR-04 규범·파생 뷰 구현 증거

## 범위와 버전

- 기준 HEAD: `228fea90465772bc737927f61fd3b560e4076d2a`.
- 시작 시 대상 7개 파일은 모두 clean이었다. 다른 작업자가 소유한 `docs/features/`의 기존 dirty·untracked 파일은 수정하지 않았다. 구현 중 다른 작업자의 `scripts/`, `tests/`, `harness-map/` 변경도 관찰했으나 건드리지 않았다.
- 승인 계약: `issues-closure.md` AR-04-AC1~~3, `tests/closure-scenarios.md` CL-01~~04. 이 문서 자체는 독립 AC 판정이 아니다.
- 변경 파일이 기본 4개 예산을 넘는 이유: 승인 입력표, 두 스킬의 예산·G2 충돌, 단독 PR 진입, 구조도 오표기와 규범 포인터가 서로 다른 7개 파일에 있기 때문이다. 새 의존성은 없다.

## 단일 규범과 15개 실행 스킬 추적

기호: `실행`은 그 단계의 실제 확인 항목, `참조`는 규범 절을 읽거나 상위 스킬에서 인계, `—`는 그 스킬의 책임 밖이다. 이 표의 셀은 새 권한이나 완료 판정이 아니다. 단계·승인·외부 권한·checkpoint/RESUME·CLI 로컬 판정 경계는 `docs/harness/lifecycle.md`의 §1/§5/§4, 자동 반복 세부 STOP·예산은 `docs/methods/delivery-automation.md`의 자동 반복 절을 기준으로 한다.

| 등록 스킬         | 단계 | 승인 G1–G5 | 외부 권한 | STOP      | 수동/자동 루프 | checkpoint/RESUME | CLI 코어/평가 |
| ----------------- | ---- | ---------- | --------- | --------- | -------------- | ----------------- | ------------- |
| harness-cycle     | 실행 | 참조       | 참조      | 참조      | 참조           | 실행              | —             |
| project-bootstrap | 실행 | 참조       | 실행      | 참조      | —              | 참조              | —             |
| feature-planner   | 실행 | 실행       | 실행      | 참조      | —              | 참조              | —             |
| test-scenarios    | 실행 | 실행 G5    | —         | 참조      | —              | —                 | —             |
| tdd-red           | 실행 | 참조       | —         | 실행      | 참조           | —                 | —             |
| tdd-green         | 실행 | 참조       | —         | 실행      | 참조           | —                 | —             |
| ac-verifier       | 실행 | 참조 AC    | —         | 참조      | 참조           | —                 | —             |
| tdd-refactor      | 실행 | 참조       | —         | 실행 회귀 | 참조           | —                 | —             |
| security-review   | 실행 | 참조       | 참조      | 실행 차단 | 참조           | —                 | —             |
| e2e-write         | 실행 | 참조       | —         | 실행 실패 | 참조           | —                 | —             |
| create-pr         | 실행 | 참조 §5    | 실행      | 실행 차단 | 참조           | —                 | —             |
| tdd-loop          | 실행 | 실행 G5    | 실행      | 실행      | 실행 수동      | 참조              | —             |
| tdd-auto-loop     | 실행 | 실행       | 실행      | 실행      | 실행 자동      | 실행              | —             |
| design-system     | 실행 | 참조       | —         | 참조      | —              | —                 | —             |
| mermaid-diagram   | 실행 | 참조       | 참조      | —         | —              | —                 | —             |

`test-scenarios`의 G5 문구는 lifecycle §5를 직접 가리키며 독립 검토를 요구하므로 변경하지 않았다. 변경 대상 밖의 11개 스킬의 짧은 작업 요약도 권한을 새로 정의하지 않아 유지했다. CLI 코어·평가는 실행 스킬이 권한을 발급하는 항목이 아니다. `scripts/handoff-core.mjs`는 로컬 판정·전환, `scripts/session-handoff.mjs`는 파일·Git·CLI 어댑터, `scripts/evaluate-handoff.mjs`는 저장된 fixture·기준선 평가이며, 이 관계를 lifecycle §4와 구조도 시작 카드에서 구분했다.

## 실제 변경과 CL-01~04 판정 근거

- CL-01: lifecycle의 규범·파생 뷰 포인터를 추가하고, delivery·planning·feature-planner의 반복 권한 정의를 해당 절 링크와 실행 기록 요약으로 줄였다. create-pr 단독 진입에 lifecycle §5 읽기를 추가했다. 외부 권한과 기존 STOP 본문은 변경하지 않았다.
- CL-02: delivery 단계 입력표 마지막 열을 `다음에 확인할 결정·증거`로 바꾸고 TDD 행을 `G5 계약 검토·실제 단계 증거·독립 AC 검증`으로 수정했다. 일반 구현 승인에 매 단계 재승인이 필요하다는 표현을 제거했다.
- CL-03: tdd-auto-loop 스킬의 Green 총예산을 `min(3, 1 + user_approved_retry)`로 명시하고 누계 불초기화를 유지했다. 새 아키텍처는 먼저 유효한 G2 위임 범위·만료·철회를 대조하고 범위 밖만 사용자 게이트로 상향한다. 기존 코어 코드와 fixture는 바꾸지 않았다.
- CL-04: 구조도에 G1, 승인 범위 안 G2/G3, 분리 감사 G4/G5, 외부 권한, checkpoint/RESUME, CLI 로컬 판정 경계를 표시했다. 15개 스킬 표시, 00~05 목차, Mermaid 11.12.0 고정, 단일 `pre#diagram-source`, `securityLevel: strict`, 오류 시 원문 대체 경로는 보존했다.

## 변경 파일 SHA-256

| 파일                                      | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `docs/harness/lifecycle.md`               | `00bc83cc5fa2930384e7886b9f115aba3155d08b75e21fead009986f3172a2ca` |
| `docs/methods/delivery-automation.md`     | `0b27d1d27e3c79ced3958fd3942c1e2532bd4e982f6aa8a75511668268ef16e1` |
| `docs/methods/planning.md`                | `513d263f11eb592e91e610ad93e719ac97fa45344b04bb49e37c28c60e94fc4d` |
| `.agents/skills/feature-planner/SKILL.md` | `f7d9a6fa0b22597ee6c720ca2ea705c202d38fb58fc78cf00a7bc18bbb62381c` |
| `.agents/skills/tdd-auto-loop/SKILL.md`   | `78ea6f304217851e68fb280f05584ae5dbdefd4361e2d4e03df41888a5f1d59a` |
| `.agents/skills/create-pr/SKILL.md`       | `937df56958c67eedbdbe4c4e0a58c49be5ec8a579f74c2bd1722e269b326e46b` |
| `docs/architecture/index.html`            | `c5b8f9a5a151ae97e938819d77d77624226afffa70cd69d59bf071872bc9271c` |

## 검사·화면 관찰

- `git diff --check`: 종료 코드 0.
- 대상 7파일 `npx prettier --check`: 최초 종료 코드 1(delivery, index); 두 파일만 `npx prettier --write` 종료 코드 0 후 재검사 종료 코드 0.
- `npm run design:check`: 종료 코드 0, 구조도 CSS 선언 84개. 해당 검사 후 변경은 두 파일의 Prettier 서식만이었다.
- `node scripts/check-harness.mjs`: 종료 코드 0, 15개 스킬·62개 등록 파일. 파일·참조·등록 구조 검사이며 앵커·의미·독립 AC 판정은 아니다. 병렬 작업자가 검사기 파일을 이후 수정했으므로 이 결과는 실행 당시 버전으로만 사용한다.
- 설치본 회귀에서 원본 전용 구조도를 `lifecycle.md`의 상대 Markdown 링크로 넣으면 대상에 해당 파일이 없어 실패함을 확인했다. 원본 전용 경로를 inline code로 바꾸고 미배포 경계를 명시한 뒤 `npx vitest run tests/unit/harness-portability.test.ts`를 재실행했다. 종료 코드 0, 1파일 142/142 통과(소요 103.51초). 이 실행은 병렬 작업자의 테스트 추가가 반영된 작업 트리에서 수행됐다.
- 구조도 로컬 상대 파일 링크: 6개 중 누락 0개. 새 규범·인계 링크의 절 제목을 lifecycle §4/§5, delivery 자동 반복 절과 대조했다.
- Chrome 로컬 페이지 `http://127.0.0.1:8765/docs/architecture/index.html`: 넓은 화면에서 Mermaid 상태 `도식 렌더링 완료`, SVG의 G1/G2·G3·G4/G5/별도 권한 레이블을 접근성 트리에서 확인했다. Chrome DevTools Responsive 400px × 706px, 100%에서 목차·카드 줄바꿈과 가로 넘침 없는 본문을 화면으로 확인했고 Tab 포커스 외곽선을 checkpoint 접기 항목에서 확인했다. 브라우저의 기존 사이트 확대 150%는 변경하지 않았다.
- Mermaid 의존성 실패 경로를 임시 동일 페이지 fixture로 재현했다. 원본 `docs/architecture/index.html`의 SHA-256 `c5b8f9a5a151ae97e938819d77d77624226afffa70cd69d59bf071872bc9271c`를 확인한 뒤, 임시 사본에서 모듈 URL 한 곳만 `http://127.0.0.1:8766/missing-mermaid.mjs`로 바꿨다(사본 SHA-256 `c46b781a3ce17dd596f5d2031e920aeca699d0bcda2c4101a210d4cf28d1c4ef`). 로컬 서버는 `GET /index.html` 200, `GET /missing-mermaid.mjs` 404를 기록했다. Chrome에서 전체 도식 접기를 펼치자 `도식을 표시하지 못했습니다. 인터넷/CDN 접근 또는 Mermaid 문법을 확인하세요. 아래 원문과 근거 표는 계속 볼 수 있습니다.`라는 오류 문구와 펼쳐진 `도식 원문`의 `flowchart TD` 이하 내용이 접근성 트리와 화면에 보였다. 이 결과는 **실제 CDN 장애가 아닌 실패 주입**의 폴백 증거다. 생산 파일은 수정하지 않았고 검증용 탭·서버·임시 fixture를 종료·제거했다.
- 전체 `npm run check`와 독립 AC 검토는 메인 통합·분리 검증 단계에 남긴다. 제품 앱 실행·원격 CI·배포·사용자 최종 수락은 이 문서 검사 범위가 아니다.
