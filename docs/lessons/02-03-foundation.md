# 2·3강 — 환경 준비와 품질 자동화 기록

이 문서는 초기 2·3강 적용의 상세 기록이다. 현재 전체 사이클과 스킬 목록은 [전체 설명서](../harness/lifecycle.md) 및 [등록 목록](../harness/registry.json)을 따른다. 아래 시점별 설치 결과를 후속 제품 실행 결과로 해석하지 않는다.

### 2강 — 매번 설명하지 말고 프로젝트에 남기기

`02.Claude와 협업 준비.pdf` 13쪽 전체의 핵심은 **사람용 README와 AI용 프로젝트 지침을 나누고, 반복 절차는 스킬로 만드는 것**입니다.

강의의 `/init`은 프로젝트를 조사해 지침의 초안을 만드는 출발점이지, 실제 코드 검증이나 설정 완료를 보장하는 명령이 아닙니다. 여기서는 실제 파일을 조사해 Codex가 읽는 `AGENTS.md`를 직접 작성했습니다. 강의의 예시 React/TypeScript 앱은 이 폴더에 없으므로 만들지 않았습니다.

### 3강 — AI가 규칙을 기억하기를 기대하지 않기

`03.코드 품질 자동화.pdf` 10쪽 전체의 핵심은 **규칙 문서만 믿지 말고, 잘못된 변경이 커밋되기 전에 검사하는 것**입니다.

```text
사용자가 요청한 git commit
  → pre-commit
    → lint-staged: 스테이징된 대상만 검사
      → ESLint --fix → Prettier --write
  → commit-msg
    → commitlint: 메시지 형식 검사
  → 모두 성공하면 커밋 진행
```

- **Husky**: Git 훅을 프로젝트 파일로 관리하고 설치 시 연결합니다.
- **lint-staged**: 바뀐 전체 작업 폴더가 아니라 스테이징된 대상만 검사합니다.
- **ESLint / Prettier**: 코드 오류와 서식을 나눠 검사하고 가능한 것은 자동 수정합니다.
- **commitlint**: Conventional Commits 메시지 형식을 검사합니다.

이 Git 훅들은 Codex·Claude·직접 실행한 터미널 커밋에 공통으로 적용됩니다. **Codex의 별도 네이티브 훅 기능으로 옮기는 작업이 아닙니다.** 지침을 따르려는 AI의 행동과, Git에서 실행되는 검사는 서로 다른 장치입니다.

## 전체 페이지 대응

### 2강 · 13쪽

| 페이지 | 강의 내용                              | 적용                                                     |
| ------ | -------------------------------------- | -------------------------------------------------------- |
| 1      | `/init`과 `CLAUDE.md`                  | Codex 프로젝트 지침으로 전환                             |
| 2      | 새 팀원에게 프로젝트 맥락 전달         | 현재 상태·경로·원칙 기록                                 |
| 3      | 전체 과정의 첫 환경 준비 단계          | 후속 요구사항·TDD·CI와 범위 분리                         |
| 4      | 메모리·초기화·스킬 학습 목표           | 지침·재사용 절차 분리                                    |
| 5      | 세션 맥락과 파일에 남기는 규칙         | “AI는 기억이 전혀 없다”로 일반화하지 않고 파일 기준 유지 |
| 6      | 사람용 README와 AI용 지침, 간결한 구성 | README와 짧은 AGENTS 분리                                |
| 7      | export·이벤트 핸들러 규칙 불일치 예시  | 앱이 없으므로 예시 컨벤션 강제하지 않음                  |
| 8      | `/init` 조사·초안·사람 검토            | 실제 파일 조사 후 지침 작성·로딩 검증                    |
| 9      | 텍스트 Mermaid와 버전 관리             | HTML 구조도와 단일 Mermaid 원문                          |
| 10     | 스킬 위치·호출 방식                    | Codex `.agents/skills/`와 명시적 선택                    |
| 11     | 소스 조사·CDN·dark 구조도              | 실제 문서·설정 관계로 생성하고 화면 확인                 |
| 12     | 프로젝트 스킬과 전역 스킬 구분         | 프로젝트 내부에만 적용                                   |
| 13     | 예제 프로젝트와 구조도 실습            | 예제 저장소를 임의 추정하지 않고 현재 폴더에 적용        |

### 3강 · 10쪽

| 페이지 | 강의 내용                                      | 적용                                            |
| ------ | ---------------------------------------------- | ----------------------------------------------- |
| 1      | Husky·lint-staged·commitlint                   | 세 도구를 실제 설치                             |
| 2      | AI 작성 코드도 lint를 놓칠 수 있음             | 지침과 Git 자동 검사를 함께 사용                |
| 3      | 환경 준비 다음 요구사항·TDD·E2E·CI             | 앱 테스트와 CI는 아직 미구현으로 구분           |
| 4      | 훅·메시지·실패 차단 학습 목표                  | 정상·비정상 입력으로 검증                       |
| 5      | Git 훅 실행과 종료 코드, pre-commit/commit-msg | 실제 훅 실행과 차단 확인                        |
| 6      | `.git/hooks` 대신 버전 관리되는 `.husky/`      | Husky와 npm prepare 연결                        |
| 7      | 스테이징된 TS/TSX에 ESLint·Prettier            | 현재 파일에 맞게 JS/MJS/HTML·문서·설정으로 변경 |
| 8      | feat/fix/test/refactor/chore 메시지 예시       | Conventional 규칙과 한국어 예시 기록            |
| 9      | 코드 검사 다음 메시지 검사 흐름                | 두 훅을 각각 연결                               |
| 10     | 설치·실패 실험·지침 갱신 실습                  | 도구 설치, 격리된 Git 훅 검증, AGENTS 갱신      |

## 초기 검증 기록

### 2·3강 적용 당시 기록

아래는 초기 설치 시점의 검증 이력입니다. 패키지 감사·브라우저·Git 훅 검사를 이후 문서 수정 때마다 재실행했다는 뜻은 아닙니다.

- 2강 13쪽과 3강 10쪽을 모두 이미지로 렌더링해 확인했습니다.
- Codex `debug prompt-input`에서 프로젝트 `AGENTS.md`가 입력에 포함됨을 확인했습니다.
- Codex app-server `skills/list`에서 `mermaid-diagram`이 프로젝트 `.agents/` 경로, `scope: repo`, `enabled: true`로 발견됐으며 프로젝트 스킬 오류는 없었습니다.
- 스킬 공식 검증 스크립트 결과는 `Skill is valid!`였습니다.
- Codex의 새 모델 응답을 호출해 스킬 재생성을 시킨 것은 아닙니다. **발견·형식 검증**, 직접 수행한 구조도 갱신, 브라우저 화면 확인을 구분합니다.
- 브라우저에서 변경된 Codex 구조도의 SVG·한글 레이블·품질 검사 연결선을 직접 확인했습니다. 내장 브라우저 연결은 `privileged native pipe bridge is not available; browser-client is not trusted`로 실패해 Chrome의 로컬 HTTP 화면으로 검증했습니다.
- `npm ci --no-fund`로 잠금 파일 재설치와 `prepare → husky` 연결을 확인했습니다. 설치 결과는 167개 패키지 추가, 168개 감사, 보고된 취약점 0개였습니다. 이는 실행 시점의 npm 감사 결과이며 보안 전체를 보증하지 않습니다.
- 정상·비정상 훅 검증은 별도 임시 Git 저장소에서 `git hook run pre-commit`과 `git hook run commit-msg -- <메시지파일>`로 수행했습니다. 검증용 저장소에서도 실제 커밋은 만들지 않았습니다.

| 검증                     | 확인한 결과                                             |
| ------------------------ | ------------------------------------------------------- |
| 정상 스테이징 파일       | pre-commit 종료 0, 코드·서식 작업 실행 및 스테이징 반영 |
| 잘못된 JS                | `no-unused-vars`, `no-undef` 오류로 pre-commit 실패     |
| 정상 Conventional 메시지 | commit-msg 종료 0                                       |
| `bad message`            | `subject-empty`, `type-empty` 오류로 commit-msg 실패    |
| HTML 모듈 스크립트       | 정의되지 않은 식별자를 ESLint가 거부                    |
| 원본 보존                | 2강·3강 PDF와 기획 Markdown의 작업 전후 SHA-256 일치    |
| 프로젝트 Git 상태        | 스테이징 0개, 커밋 없음, 로컬 Husky 경로 연결           |

설치·발견·최종 통합 검사 로그는 `/tmp/cc-harness-lesson03.KCYTMz/`에 있습니다. 훅 로그는 `/var/folders/bc/dgnqfptd3g980z9ybm8kw5fh0000gn/T/cc-harness-hooks.d2H8ra/`의 `pre-commit-positive.out`, `pre-commit-negative.out`, `commit-msg-negative.out`입니다. 임시 로그는 OS 정리 시 사라질 수 있습니다. 실패 훅의 정확한 숫자 종료 코드는 보존하지 않았으며, 비정상 종료와 원인 로그를 확인했습니다.

현재 전체 검사 명령은 `npm run check`입니다. 앱 테스트나 원격 CI가 아니라 ESLint·디자인 기준·Prettier 통합 검사이며, 다시 실행해 현재 상태를 확인할 수 있습니다.

### 보존한 원본

강의 PDF 18개와 `feature-planning-workflow.md`를 수정하지 않습니다. PDF는 기본 Git 제외 대상으로 설정해 자료가 의도치 않게 공유되는 일을 줄였습니다. 원본 기획 Markdown은 포맷 대상에서 제외했습니다.

| 원본                           | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| 2강 PDF                        | `8ab474cb8ab9bbc13096423c1cacc361f68fed72834ed8550bc976f268121613` |
| 3강 PDF                        | `b197fc1dd24f4bf4627e4dca1c6f16d6ad9b3d6cc57f967a6be35c21004b7367` |
| `feature-planning-workflow.md` | `cbadf1c57e4cc0a3d59b26afa07a837ef4c815428f45f3a3b644764d0326d767` |
