# AR-05 앵커 검증 구현 증거 · 2026-10-02

## 소유 범위와 원인

- 기준 코드 커밋: `228fea90465772bc737927f61fd3b560e4076d2a`. `scripts/check-harness.mjs`가 상대 링크의 `#fragment`를 버리고 파일 존재만 확인해 깨진 앵커를 통과시켰다.
- 이 묶음은 `scripts/check-harness.mjs`와 `tests/unit/harness-portability.test.ts`의 AR-05-AC2 / CL-06·07만 구현했다. 규범 문서·구조도와 디자인 훅 cache는 다른 소유자의 변경이다.
- 최초 Green 후보 SHA-256: `scripts/check-harness.mjs` = `48414db3bd1a9dad92d729f726be41beff9c4e4d3c4d49adef27c3a569b0d195`; `tests/unit/harness-portability.test.ts` = `65f707a799ed3fb676cf4423ce7b5f394bd870897a2bfb47f478e51c2de9508f`. 독립 검토가 이후 false pass를 찾아 재수정했다.

## Red → Green과 회귀

| 시점                       | 실제 명령                                                                                                                                                                | 결과                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Red                        | `npx vitest run tests/unit/harness-portability.test.ts -t 'rejects a broken relative Markdown fragment'`                                                                 | 종료 1. 신규 fixture의 `#missing-heading`에 대해 검사기 종료 0, 기대 종료 1. `1 failed`, `130 skipped`.                                                                                                  |
| 최초 Green                 | 같은 집중 명령                                                                                                                                                           | 종료 0. `1 passed`, `130 skipped`.                                                                                                                                                                       |
| 경계 보강                  | `npx vitest run tests/unit/harness-portability.test.ts -t 'fragment\|anchors\|HTML ids'`                                                                                 | 종료 1. 기존 fixture가 실제 제목 없이 `#example`을 유효하다고 기대했고 `#actual#other`를 잘라 통과시켰다. 기존 fixture에 실제 제목을 넣고 fragment 전체를 읽어 수정했다.                                 |
| 집중 회귀                  | `npx vitest run tests/unit/harness-portability.test.ts -t 'fragment\|anchors\|HTML ids\|document links'`                                                                 | 종료 0. `13 passed`, `129 skipped`.                                                                                                                                                                      |
| 전체 portability 최초      | `npx vitest run tests/unit/harness-portability.test.ts`                                                                                                                  | 종료 1. `139 passed`, `1 failed`(당시 140개). 동시 AR-04 문서의 설치본 미배포 `../architecture/index.html` 링크가 원인이다. 해당 파일 소유자에게 전달했다.                                               |
| 전체 portability 이전 후보 | 동일 명령                                                                                                                                                                | 종료 0. `142 passed`(101.60초). AR-04 소유자가 source 전용 화면 경로를 설치본 링크 대신 inline code로 고친 후 재실행했다. 이 결과는 아래 독립 검토에서 발견된 raw-text false pass 수정 전 코드의 증거다. |
| 정적 검사                  | `node scripts/check-harness.mjs`; `npx eslint scripts/check-harness.mjs tests/unit/harness-portability.test.ts`; `npx prettier --write` 관련 네 파일; `git diff --check` | 모두 종료 0. 하네스 직접 검사는 스킬 15개·등록 파일 62개를 보고했다.                                                                                                                                     |

## 확인 범위

상대 Markdown ATX 제목의 GitHub형 slug, 중복 suffix, inline 강조·링크 표시, percent decoded fragment, 명시적 HTML `id`/`a name`, 로컬 HTML `id`를 확인한다. Markdown 코드 펜스·들여쓴 코드·inline code와 HTML 주석의 가짜 앵커, `data-id`, 미존재 중복 suffix, 추가 `#`, 미지원 파일 종류와 잘못된 percent encoding을 성공 처리하지 않는다. 외부 URL은 기존대로 제외한다. 이 파서는 정적 HTML 속성과 현재 하네스의 Markdown ATX/GFM 사용 범위를 다루며 모든 CommonMark 확장·동적 DOM을 보증하지 않는다.

이 증거는 구현자 자체 검사다. AR-05 개별 독립 AC 판정과 최종 `npm run check`는 별도다.

## 독립 검토 후 보완

독립 검증자가 최초 Green 후보에서 `<script>const x = "<span id=\"ghost\"></span>";</script>`의 문자열 안 `id`를 실제 앵커로 수집해 `example.html#ghost`가 종료 0으로 통과하는 false pass를 발견했다. 같은 문제가 `style`, `textarea`, `title`, `template` 본문과 중첩 템플릿에도 있었다.

| 시점           | 실제 명령                                                                                                                                                              | 결과                                                                                                                                                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 보완 Red       | `npx vitest run tests/unit/harness-portability.test.ts -t 'does not treat inactive HTML contents as anchors'`                                                          | 종료 1. 여섯 fixture 모두 검사기 종료 0으로 오판해 `6 failed`, `147 skipped`(153개).                                                                                                                                                                                                                                     |
| 보완 집중 회귀 | `npx vitest run tests/unit/harness-portability.test.ts -t 'inactive HTML contents\|outer HTML element\|raw HTML content\|fragment\|anchors\|HTML ids\|document links'` | 최초 Green 종료 0에서 `27 passed`, `129 skipped`(156개). `plaintext` 닫는 태그를 실제 DOM 종료로 오해할 수 있는 추가 경계를 고쳐 최종 종료 0, `28 passed`, `129 skipped`(157개). 중간 1회는 malformed script에 대한 기대 진단 문구 차이로 종료 1이었고 기대값을 실제 `지원하지 않는 HTML raw-text 태그 형식`으로 고쳤다. |
| 보완 정적 검사 | `npx prettier --write scripts/check-harness.mjs tests/unit/harness-portability.test.ts`; 대상 ESLint; `node scripts/check-harness.mjs`; `git diff --check`             | 모두 종료 0. 직접 하네스 검사는 스킬 15개·등록 파일 62개.                                                                                                                                                                                                                                                                |

현재 후보 SHA-256: `scripts/check-harness.mjs` = `34ca184868d06819f47824043646e98ffeccec6e437aedda425d8f5f0fa4b026`; `tests/unit/harness-portability.test.ts` = `106eba62c842008eea77711b82efa74a4bc76c64d853b6882506123237bc26e0`.

HTML 검사기는 `script`·`style`·`textarea`·`title`과 `template`의 비활성 내용, 중첩 템플릿, 보수적으로 처리할 기타 raw-text 요소의 내부 태그·Markdown 제목을 앵커에서 제외한다. `plaintext`는 닫는 태그 텍스트가 나와도 EOF까지 비활성으로 취급한다. 외곽 요소 자체의 `id`는 실제 DOM 앵커로 유지한다. 인식 불가한 raw-text 시작 태그는 명시 오류로 실패한다. 이 검사는 일반 DOM 파서나 브라우저 렌더 검증이 아니다. 변경된 후보의 전체 portability 재실행은 하지 않았고, 메인의 최종 통합 검사와 독립 AC 재검토가 남았다.
