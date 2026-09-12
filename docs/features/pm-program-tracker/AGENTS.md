# PM 프로그램 관리 · 작업 지침

이 지침은 이 폴더와 하위 파일에 적용한다. 저장소 루트 AGENTS.md의 공통 절차는 반복하지 않는다.

## 요구사항과 승인

- spec-original.md·interview.md·spec-fixed.md의 사용자 결정과 승인 상태를 보존한다. 디자인 검사 통과를 기능·디자인 승인으로 취급하지 않는다.
- PM이 직접 등록하는 단일 프로젝트 도구다. 요청 없이 계정·클라우드·다중 프로젝트·검색·태그 등으로 범위를 확대하지 않는다.
- 개발 예정일과 실제 완료일을 구분한다. 비어 있는 날짜·진행 상태를 추정하거나 날짜만으로 상태를 변경하지 않는다.

## 디자인의 기준

- 화면 구성은 design.md, 공통 규칙은 design-system/의 colors.md·typography.md·spacing.md·components.md를 읽는다.
- 저장소 루트 docs/design-system/은 구조도용 기준이다. PM 화면에 복사하지 않는다.
- ontology/brand_profile.json·spec.md는 합성 입력, ontology/design-system/component-contracts.json은 저작 계약이다. 입력 수정 후 엔진으로 재생성하며 생성 토큰을 직접 보정하지 않는다.
- ontology/design-system/tokens.css는 생성 토큰, runtime-theme.css는 PM 테마 확장이다. 문서와 실행 값의 일치를 유지한다.
- ontology/build·plugins·agent-team은 외부 백업으로 옮긴 재생성 자료다. 무조건 다시 복제하지 않는다. 재합성·복원 절차는 ontology/verification.md와 source-policy.md를 따른다.

## 검증

- 저장소 루트에서 `npm run design:check:pm`을 실행한다. 개별 CSS는 `npm run design:check:pm -- 파일경로`로 검사한다.
- PM 자동 스캔은 src/app/public의 CSS·HTML·TSX·JSX다. PM-00 빈 장부는 src/에 있다. 문서·생성 토큰은 앱 스캔 대상이 아니며 팔레트·간격 토큰을 별도 검사한다. TSX 동적 style·JSX spread는 미지원 오류로 처리한다.
- 지원하지 않는 스타일 형식은 검사기를 먼저 확장한다. 규칙을 완화해 통과시키지 않는다.
- PostToolUse 경고를 받으면 기준 문서와 대조해 수정한다. 훅은 자동 복구·시각 검증·기능 테스트를 대체하지 않는다.
- 정적 검사, 실제 훅 피드백, 화면 검증, 사용자 승인을 구분해 보고한다.
