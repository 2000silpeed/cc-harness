# PM-00 · 실행 기반 검증

## 승인과 범위

사용자 “아하 그렇지 좋아 1번 진행해”에 따라 PM-00만 실행했다. React·TypeScript 빈 장부, 기존 디자인 토큰 연결, Vite 실행·빌드, 단위/브라우저 검사, IndexedDB 테스트 경계, TSX 디자인 검사 및 추가 기능 저작 계약을 준비했다. PM-01 등록·저장 구현은 하지 않았다.

## 선택과 출처

- React/React DOM 19.3.0, TypeScript 6.0.3, Vite 8.3.0, Vitest 5.0.0, Playwright 1.63.0을 잠금 파일로 고정했다. npm registry의 버전·엔진·peer dependencies를 조회했다.
- TypeScript 최신 7 대신 typescript-eslint 8.70.0의 지원 범위에 맞춰 6.0.3을 선택했다. 현재 Node는 24.14.1이다.
- 실행·빌드는 [Vite 공식 가이드](https://vite.dev/guide/), 테스트는 [Vitest 가이드](https://vitest.dev/guide/), JSX 처리는 [TypeScript 문서](https://www.typescriptlang.org/docs/handbook/jsx.html)를 확인했다.
- fake-indexeddb는 테스트에서만 사용한다. 제품 저장 스키마·repository는 PM-01 시나리오 승인 후 구현한다. CSS 프레임워크·아이콘·상태관리·Excel 라이브러리는 추가하지 않았다.

## 재현

저장소 루트에서 Node 22.12+ 또는 24 계열로 실행한다.

```sh
npm ci
npx playwright install chromium
npm run dev
npm test
npm run typecheck
npm run build
npm run test:browser
npm run check
```

개발 서버는 127.0.0.1:5173, 브라우저 테스트는 production build를 127.0.0.1:4173으로 제공한다. 4173이 이미 사용 중이면 다른 서버를 재사용하지 않고 실패한다. 등록 버튼은 다음 단계 안내만 표시하고 저장 완료를 흉내내지 않는다.

## 검증 기록

- 설치: 완료, npm audit 0 vulnerabilities(설치 시점). 향후 안전성을 보증하지 않는다.
- 단위: 10개 통과. React 정적 렌더·격리된 IndexedDB 읽기/쓰기 경계·TSX 정상/위반·동적 style 거부·CSS 훅 JSON·이름 색상/oklch/미정의 토큰 거부를 확인했다.
- 타입·빌드: tsc --noEmit 및 Vite production build 성공.
- 실행: 개발 서버 시작 및 HTTP 200 확인.
- 브라우저: macOS Chromium에서 390/768/1440px 빈 장부·키보드 Tab/Enter·안내·페이지 가로 넘침·콘솔 오류를 검사했다. 실제 캡처를 보고 모바일 빈 안내 잘림을 발견해 표 밖으로 옮겼으며 회귀 검사에 영역 좌표 확인을 추가했다.
- 캡처: test-results/bootstrap-empty-ledger-and-entry-at-390px/ledger-390.png 및 768/1440px 대응 폴더. 재실행으로 갱신되는 로컬 산출물이며 Git 제외다.
- 인앱 브라우저 연결은 `privileged native pipe bridge is not available; browser-client is not trusted`로 실패했다. 신뢰 설정을 바꾸지 않았고 프로젝트 Playwright smoke 및 캡처 검토로 진행했다.
- 기존 15개 하네스 스킬·구조도·훅 명령은 유지한다. TSX 파일 생성 직후 기존 미지원 경고가 실제 전달됐으며 이후 AST 검사를 연결했다.

## 검사 범위와 한계

최종 `npm run check` 종료 코드 0: lint·구조도 84개 선언·PM 스타일 3파일·하네스 15스킬·서식·단위 10개·타입·빌드·브라우저 3개 통과. 독립 읽기 검토에서 이름 색상/oklch 검출 누락을 지적받아 색상 속성 허용값 검사와 회귀 테스트를 추가했다. 모바일 수정 후 캡처에서 빈 안내가 화면 안에 표시되는 것을 확인했다.

TSX/JSX는 TypeScript AST로 파싱하고 정적 style 객체의 색상·간격을 검사한다. 동적 style·computed key·spread를 거부한다. 정적 문자열의 HEX/rgb/hsl을 경고한다. 클래스 CSS는 기존 정규식 검사다. 임의 런타임 JavaScript·CSS-in-JS·외부 CSS·전체 CSS 문법·실효 색상 대비를 검증하는 범용 린터는 아니다. 간격 오류의 TSX 위치는 추출된 선언 번호이며 색상·동적 style 위치는 원본 줄이다.

추가 검색/삭제/Excel/탭 안내 계약은 design-system/components.md의 저작 확장이다. 기존 생성 JSON 6개에 대한 strict 검사를 새 계약에까지 확대 주장하지 않는다.

## 미완료·다음 단계

- Windows Chrome·Edge, 실제 200% 브라우저 확대, 웹폰트 로드, 프로그램 저장·등록·간트·검색·백업·Excel·탭 잠금·오프라인은 미검증/미구현이다. 시스템 대체 서체로 렌더링한다.
- 디자인의 최종 사용자 승인은 별도다. PM-00 기반의 시각 확인은 전체 제품 디자인 승인이 아니다.
- 원격 CI·배포·커밋·푸시·전역 Codex 설정 변경은 하지 않았다.
- 다음 작업은 PM-01 test-scenarios로 함수/저장 계약과 정상·경계·오류 시나리오를 제시하는 것이다. 바로 전체 기능 구현으로 넘어가지 않는다.
