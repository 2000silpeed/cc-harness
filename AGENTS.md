# cc-harness · Codex 협업 지침

## 현재 범위

- 실제 프로젝트 진행에 사용하는 Codex 하네스다. 현재는 실행 스킬, 작성 방법론, PM 요구사항, 구조도와 코드 품질 도구가 있다.
- 앱 소스, React/TypeScript 구성, 앱 테스트·빌드, 원격 CI는 없다. 파일명만으로 구현이나 의존성을 추정하지 않는다.
- 사람용 설명서와 검증 기록은 `README.md`, 구조도는 `docs/architecture/index.html`이다.
- 강의 PDF·중복 원본·Claude 호환 파일·임시 자료는 저장소 밖에 백업했다. 다시 가져오거나 Git에 포함하지 않는다. 기존 PM 인터뷰와 승인 상태는 요청 없이 변경하지 않는다.
- 전체 사이클은 `docs/harness/lifecycle.md`, 실제 스킬 목록은 `docs/harness/registry.json`을 따른다. 요구사항·아키텍처·범위·이슈·시나리오 승인 근거를 보존한다. 등록과 실제 제품 실행을 구분한다.

## 작업 방식

- 실제 파일과 적용 범위의 지침을 먼저 확인한다. 기존 구조를 재사용하고 변경을 작게 유지한다.
- 이 파일은 200줄 이하를 목표로 간결하게 유지한다. 상세 절차는 스킬·설명서에 둔다.
- 기본 예산은 새 추상화 1개 이하·새 의존성 0개·변경 파일 4개 이하다. 초과가 필요하면 이유와 범위를 먼저 알린다.
- 가역적인 수정과 검증은 승인된 작업 범위에서 완료한다. 별도 요청 없이 커밋·푸시·브랜치 생성·전역 설정 변경을 하지 않는다.
- 비밀 값, `node_modules`, 임시 산출물, 원본 PDF를 Git에 추가하지 않는다. 필요한 파일만 선택적으로 스테이징한다.
- 장시간 작업은 진행 상황을 간단히 알린다. 완료·미구현·미검증을 구분하고 실제 오류나 중단 이유를 명시한다.

## 명령과 품질 기준

- 설치: `npm ci`. 잠금 파일의 개발 도구를 설치하고 `prepare`가 Husky Git 훅을 연결한다.
- 코드 검사: `npm run lint`. JS/MJS 및 HTML 안의 JavaScript를 검사한다.
- 서식 검사: `npm run format:check`. 수정하려면 `npm run format`을 사용한다.
- 최종 통합 검사: `npm run check`. ESLint·디자인 기준·하네스 등록·Prettier 검사이며 앱 테스트나 CI를 뜻하지 않는다.
- 관련 검사를 먼저 1회 수행하고, 실패하면 원인을 수정해 재실행한다. 마지막에 가능한 통합 검사를 1회 수행한다. 변경·실패 없이 반복하지 않는다.
- `pre-commit`은 lint-staged로 스테이징된 대상에 ESLint 자동 수정과 Prettier를 실행한다. 수정 불가능한 오류는 커밋을 차단한다.
- `commit-msg`는 commitlint로 Conventional Commits를 검사한다. 훅은 Codex 전용이 아니라 Git에서 동작한다.
- 훅을 우회하거나 오류를 숨기지 않는다. 앱 테스트·빌드 명령은 실제 구성이 생긴 뒤 추가한다.

## 요구사항 인터뷰

- 전 사이클 요청은 harness-cycle, 기획은 feature-planner, 이슈 구현은 tdd-loop로 연결한다. 자동 모드는 명시적 위임·유한 범위·원문 STOP 조건이 필요하다.

- 먼저 최초 기능 정의서와 실제 코드·설정을 읽는다. 앱 소스가 없으면 없다고 밝히고 구현·패턴을 추정하지 않는다.
- 한 번에 질문 하나만 하고, 판단이 필요한 질문에는 추천 방식과 이유를 함께 제시한다. 이미 확인한 사실을 반복해서 묻지 않는다.
- 최초 요청은 `spec-original.md`에 보존하고, 사용자 결정·이유·용어를 `spec-fixed.md`에 정리한다. 미승인 AI 제안을 사용자 결정으로 기록하지 않는다.
- 사용자 확정 전 구현으로 넘어가지 않는다. 요청 범위 밖의 기존 인터뷰를 재진행하거나 수정하지 않는다.
- 4강 브리핑·재사용 프롬프트·점검표는 `docs/lessons/04-requirements-interview.md`를 따른다.

## 디자인 시스템

- UI 변경 시 `.agents/skills/design-system/SKILL.md`와 대상 `design.md`, `docs/design-system/` 기준을 읽고 `npm run design:check`를 실행한다.
- 현재 기준은 기존 구조도 화면에만 적용한다. PM 앱 디자인 확정으로 간주하지 않는다. 정적 검사와 실제 화면 검증을 구분한다.
- Codex 훅 설정·신뢰 승인·검사 범위는 `docs/lessons/05-design-system.md`를 따른다.

## 커밋 메시지

- 사용자가 커밋을 요청했을 때 `type(scope): 한국어 설명`을 사용한다. scope는 생략할 수 있다.
- 예: `docs(codex): 협업 설명서 추가`, `chore(quality): 커밋 전 검사 구성`.
- 주요 type: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`. 전체 허용 값과 길이 등은 `commitlint.config.mjs`가 확장하는 규칙을 따른다.
- 도구는 형식을 검사한다. 한국어 여부나 변경 내용과 설명의 일치까지 보증하지 않는다.

## 구조도 스킬

- 프로젝트 스킬: `.agents/skills/mermaid-diagram/SKILL.md`.
- Codex CLI에서 `$mermaid-diagram 현재 문서와 품질 검사 구조를 갱신해줘`처럼 명시적으로 호출한다.
- `agents/openai.yaml`에서 암묵적 호출을 비활성화했다. 상시 파일 감시기나 자동 동기화 기능은 아니다.
- 구조 변경 시 실제 근거와 구조도의 일치를 확인한다. 문서만 변경한 것과 브라우저 렌더링 검증을 구분한다.
- Codex의 기준 지침은 이 파일이며 스킬의 기준은 `.agents/skills/`다. `docs/lessons/`는 스킬이 사용하는 상세 방법론이므로 참조 대체 없이 삭제하지 않는다.
