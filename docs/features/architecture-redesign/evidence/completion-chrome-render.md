# Chrome 실제 렌더 확인 · 2026-10-02

## 대상과 환경

- 대상: `docs/architecture/redesign-review-2026-09-30.html`
- 시작 HEAD: `58b8e6e6d3479f84404dfc5f41403c2ee85e63f0`; 기존 미추적 변경은 보존했다.
- 대상 SHA-256 (검사 전후 동일): `1a190b89d0a44433237cc1e393d30011683a6b229a92cb87d1c0ab52d86e6653`.
- 실제 브라우저: 사용자 컴퓨터의 Google Chrome, CUA `extension` 브라우저 ID `1`. 이전 in-app browser-client 연결 실패와 별도의 Chrome 표면이다.
- 로컬 URL: `http://127.0.0.1:54685/redesign-review-2026-09-30.html`; 127.0.0.1에 묶고 `docs/architecture` 디렉터리만 제공한 임시 서버. 보고서 GET 200을 확인했고 검사 후 서버를 종료했다 (정상 수동 중단으로 종료 코드 130).
- 좁은 화면 override의 입력값 `600×800`은 이 Chrome 연결에서 `devicePixelRatio=1.5`이므로 실제 CSS `innerWidth=400`을 만들었다. 검사 뒤 override를 reset해 기본 `innerWidth=1280`으로 복원했다.

## 관찰

| 항목            | 실제 관찰                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 넓은 화면       | CSS `innerWidth=1280`, `documentElement.scrollWidth=1270`/`clientWidth=1270`; 제목, 목차, 첫 본문 카드가 실제 표시됨.             |
| 400px           | CSS `innerWidth=400`, `documentElement.scrollWidth=390`/`clientWidth=390`; 제목·목차가 줄바꿈되고 페이지 전체 가로 넘침은 없었음. |
| 본문 DOM/접근성 | `main section[id]` 12개. Chrome 접근성 트리에 제목, 목차 링크, 표, 현재 구조/목표 계층 SVG의 대체 설명이 나타남.                  |
| 내부 이동       | 목차 `3안 비교` 클릭 후 URL `#options`, 대상 상단 좌표 약 `0.05px`; `현재 구조` 클릭 후 `#today`, 상단 약 `-0.15px`.              |
| 좁은 표         | 400px에서 `#options` 영역 약 `358px`, 표 약 `324.7px`; 셀 텍스트가 줄바꿈되어 보이고 페이지 가로 넘침은 없음.                     |
| 구조도          | 400px에서 `#today .diagram`은 `clientWidth=243`, `scrollWidth=1098`; UI 가로 스크롤 후 `scrollLeft=520`, 후반 노드가 실제 보임.   |
| 브라우저 로그   | 해당 탭의 `error`·`warn` 로그 조회 결과 `[]`.                                                                                     |

스크린샷은 Chrome에서 직접 캡처한 JPEG이다: `completion-chrome-wide.jpg`, `completion-chrome-400.jpg`, `completion-chrome-400-options.jpg`, `completion-chrome-400-diagram-scrolled.jpg`.

## 검사 경계

이 서버는 `docs/architecture`만 제공했다. 보고서 안의 `../features`, `../methods`, `../../scripts` 등 범위 밖 상대 링크는 브라우저에서 열지 않았고 HTTP 성공으로 판정하지 않았다. 스크린샷·DOM 확인은 이 HTML의 렌더와 내부 앵커에 관한 증거이며, 링크 대상 문서 내용·전체 제품 수락이나 원격 배포 검증은 아니다. 서버의 `/favicon.ico` 요청은 404였으며 보고서 본문 렌더에는 영향을 주지 않았다.
