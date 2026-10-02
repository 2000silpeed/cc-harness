# 최종 HTML 바이트의 Chrome 렌더 · 2026-10-02

## 대상과 환경

- 대상: `docs/architecture/redesign-review-2026-09-30.html`; SHA-256 **`5499eda7f21b964aa34b0859f95667a21588956fb9c362ffd15a9eb12d8e50e6`** (검사 전후 동일). root HEAD `58b8e6e6d3479f84404dfc5f41403c2ee85e63f0`의 dirty 작업 트리에서 결과 문구를 갱신한 바이트다.
- 사용자 컴퓨터의 Google Chrome extension 브라우저 ID `1`에서 실제 열었다. `python3 -u -m http.server 0 --bind 127.0.0.1 --directory /Users/sungwoon/ai-projects/cc-harness/docs/architecture`로 보고서 디렉터리만 임시 제공했고 URL `http://127.0.0.1:59328/redesign-review-2026-09-30.html`의 GET 200을 확인했다. 기본 sandbox의 bind는 `EPERM`으로 실패해 동일한 좁은 명령의 실행 권한으로 재시도했다. 종료 후 서버를 중단했고 종료 코드는 0이다.
- 검증 시각: 2026-10-02 13:53~13:55 UTC. 좁은 화면 override `600×800`은 이 Chrome 연결의 DPR 1.5에서 CSS `innerWidth=400`을 만들었다. 검사 후 override를 reset해 CSS 1280px로 복원하고 생성 탭을 닫았다.

## 실제 관찰

| 항목      | 관찰                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 넓은 화면 | CSS `innerWidth=1280`, 문서 `scrollWidth/clientWidth=1270/1270`; 제목·목차·첫 카드가 표시됨.                                                       |
| 좁은 화면 | CSS `innerWidth=400`, 문서 `scrollWidth/clientWidth=390/390`; 제목과 목차가 줄바꿈되며 페이지 가로 넘침이 없음.                                    |
| 본문      | `main section[id]` 12개, 갱신한 `완료 단계의 한정 측정` 문구가 DOM과 접근성 트리에 표시됨.                                                         |
| 목차/표   | `3안 비교` 이동 뒤 `#options`, 대상 상단 약 `0.05px`; 400px에서 섹션 약 `358px`, 표 약 `324.7px`, 페이지 가로 넘침 없음.                           |
| 구조도    | `현재 구조` 이동 뒤 `#today`, 대상 상단 약 `−0.15px`; 내부 `.diagram`은 `clientWidth=243`, `scrollWidth=1098`이며 가로 스크롤 후 `scrollLeft=700`. |
| 콘솔      | 이 탭의 `warn`·`error` 로그 조회 결과 `[]`.                                                                                                        |

직접 캡처한 PNG: [1280px](completion-final-wide.png) SHA-256 `c5c51fb14373b644b03f0401a20ee49cd62862fc2c2b840a2d0ef13b7dfb317b`, [400px](completion-final-400.png) `60d14c3b7b86f7d9d2dd2aa0dd3fc04de9020fedef37ff14d4bbc7b2b28fb444`, [좁은 표](completion-final-400-options.png) `ecc19420ebf9d8d99a231ab3cc0e2f4501f252710c4d0635b98904ca1072c601`, [구조도 스크롤](completion-final-400-diagram.png) `caa8480acb33b011035a82fe774907a1f3e58106602598d3cacb845c419e6a11`.

## 검사 경계

이 서버는 `docs/architecture`만 제공했다. `../features`, `../methods`, `../../scripts` 등 범위 밖 상대 링크의 HTTP 결과와 본문은 브라우저에서 확인하지 않았다. 같은 상대 경로 중 이번에 추가한 completion 문서 링크 4개는 로컬 파일 존재만 별도 확인했다. 전체 페이지 수직 스크롤, 외부 링크 도착지, 다른 OS와 원격 배포·CI는 검증하지 않았다. `/favicon.ico` 요청의 404는 관찰됐고 본문 렌더·콘솔 `warn`/`error` 결과에는 영향을 주지 않았다. `npm run design:check`의 84개 선언 통과는 루트 `index.html` 정적 검사이며 이 Chrome 렌더와 별개다.
