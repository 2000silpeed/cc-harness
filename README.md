# cc-harness · 아이디어부터 검증된 프로젝트까지

아이디어를 요구사항·설계·이슈별 구현·검증까지 연결하는 Codex 프로젝트 하네스입니다. **15개 실행 스킬과 작성 방법론·검사 도구**를 준비한 상태이며 실제 앱은 아직 구현하지 않았습니다.

## 시작하기

- 전체 진행 순서와 승인 기준: [전 사이클 설명서](docs/harness/lifecycle.md)
- 다른 프로젝트에 가져가기: [이식 방법](docs/harness/reuse.md)
- 문서 작성 틀: [산출물 템플릿](docs/harness/templates.md)
- 화면에서 흐름 보기: [하네스 지도](docs/architecture/index.html)

Codex 대화에서:

```text
$harness-cycle
대상 프로젝트: [경로]
아이디어: [누가 어떤 문제를 해결하는가]
범위: [기획만 / 승인된 기능 구현 / PR 준비]
기존 결정을 보존하고, 가장 먼저 미완료인 단계부터 진행해줘.
```

스킬 이름은 셸 명령이 아닙니다. 실제 대상의 지침·도구·승인 상태를 읽은 뒤 필요한 절차를 수행합니다.

## 어떤 순서로 사용하는가

| 순서 | 하는 일                  | 스킬                                       | 다음 단계로 넘기는 것    |
| ---- | ------------------------ | ------------------------------------------ | ------------------------ |
| 0    | 대상·목적·현재 단계 확인 | harness-cycle                              | 최초 요청·진행 기록      |
| 1    | 협업·품질 검사 기반      | project-bootstrap, mermaid-diagram         | 지침·실제 검사 명령      |
| 2    | 한 번에 하나씩 인터뷰    | feature-planner                            | 승인된 spec-fixed        |
| 3    | 디자인 기준 작성         | design-system                              | design.md·공통 기준      |
| 4    | PRD·기술 선택·수직 이슈  | feature-planner                            | ADR·범위·AC·의존 순서    |
| 5    | 계약·정상·경계·예외      | test-scenarios                             | 검토된 시나리오          |
| 6    | Red → Green              | tdd-red, tdd-green                         | 실패 근거·최소 구현      |
| 7    | AC 검증·구조·보안        | ac-verifier, tdd-refactor, security-review | AC별 근거·회귀·보안 결과 |
| 8    | 다음 이슈 반복           | tdd-loop 또는 tdd-auto-loop                | 검증된 이슈 통합         |
| 9    | 주요 사용자 흐름 확인    | e2e-write                                  | E2E 실행 증거            |
| 10   | PR·CI·main 인계          | create-pr                                  | 리뷰·검사·승인된 머지    |
| 11   | 배포·운영 인계           | harness-cycle의 보완 절차                  | 승인된 release checklist |

**16·17강은 마지막에 추가 실행하는 단계가 아닙니다.** tdd-loop는 한 이슈의 순서와 단계 승인을 묶고, tdd-auto-loop는 명시적인 자율 위임과 객관 STOP 조건으로 같은 사이클을 진행하는 선택적 모드입니다. main 머지와 서비스 배포도 별개입니다.

## 등록한 스킬셋

총 15개 프로젝트 스킬입니다. 원문 Claude의 `@ac-verifier`는 **독립 검토 역할 계약을 담은 스킬**로 이식했습니다. 스킬 자체가 별도 프로세스를 자동 생성하는 것은 아닙니다.

| 역할           | 스킬                                              |
| -------------- | ------------------------------------------------- |
| 전체 진입·기반 | harness-cycle · project-bootstrap                 |
| 기획·시각 기준 | feature-planner · design-system · mermaid-diagram |
| 이슈 개발      | test-scenarios · tdd-red · tdd-green              |
| 검토           | ac-verifier · tdd-refactor · security-review      |
| 전달           | e2e-write · create-pr                             |
| 반복 방식      | tdd-loop · tdd-auto-loop                          |

파일은 `.agents/skills/{name}/SKILL.md`에 있습니다. 스킬·참조 문서·강의 대응의 기계 목록은 [registry.json](docs/harness/registry.json)입니다. Mermaid는 기존의 명시적 선택 정책을 유지합니다.

## 재사용 시 지킬 것

- 복사하는 것은 **방법론과 스킬**입니다. 현재 구조도 색상·PM 사례를 새 제품의 결정으로 복사하지 않습니다.
- 기존 대상의 AGENTS·패키지·훅·CI를 조사하고 필요한 부분만 병합합니다.
- 요구사항·기술안·범위·이슈 목록·시나리오의 승인 근거를 남깁니다.
- 자율 모드도 테스트 완화·무단 원격 작업·무제한 반복을 허용하지 않습니다.
- 기능 테스트·AC 검토·시각 검증·보안·CI·사람 수락을 각각 확인합니다.
- 문서나 설정이 바뀌면 README와 흐름 화면도 현재 상태에 맞춥니다.

### 안전한 이식

하네스 원본에서 먼저 복사 계획을 확인합니다.

```sh
node scripts/install-harness.mjs --target /absolute/path/to/project
node scripts/install-harness.mjs --target /absolute/path/to/project --apply
```

대상 폴더는 미리 존재해야 합니다. 기본은 dry-run이고, 기존 내용과 충돌하면 쓰기 전에 중단합니다. PDF·인터뷰 사례·전역 설정·대상 package/AGENTS/훅은 자동 복사하지 않습니다.

### 각 문서를 만드는 법

- 요구사항·PRD·ADR·이슈·진행·PR·배포 인계: [공통 작성 템플릿](docs/harness/templates.md)
- design.md·색상·폰트·간격·컴포넌트: [디자인 작성 방법론](docs/design-system/authoring-guide.md)
- 시나리오·Red·Green·AC·보안: [TDD 방법론](docs/lessons/09-13-tdd.md)
- E2E·PR·CI·머지·반복 자동화: [전달과 자동화](docs/lessons/14-17-delivery-automation.md)

각 문서에는 입력 자료, 상세 수행, 산출물, 게이트, 검증·실패 복구를 연결했습니다.

## 현재 저장소의 실제 명령

이 명령은 **하네스 저장소 자체**를 검사합니다. 새 제품의 test/build 명령은 별도로 구성해야 합니다.

| 명령                             | 역할                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| `npm ci`                         | 잠금 파일로 개발 도구 설치, prepare로 Husky 연결                  |
| `npm run lint`                   | JS/MJS·HTML 스크립트 검사                                         |
| `npm run design:check`           | 현재 구조도 HTML의 CSS 선언 검사                                  |
| `npm run harness:check`          | 등록 파일·스킬 이름·문서 링크·페이지 목록·존재하는 원본 해시 검사 |
| `npm run format:check`           | 서식 확인, 수정 없음                                              |
| `npm run check`                  | ESLint → 디자인 → 하네스 등록 → Prettier                          |
| `npm run prepare`                | 기존 Git 저장소의 Husky 연결                                      |
| `node scripts/check-harness.mjs` | 이식본에서도 별도 의존성 없이 등록 검사                           |

`npm run format`과 lint-staged는 파일을 수정합니다. 보호된 원본·인터뷰는 요청 없이 포맷하지 않습니다. Husky는 Git 커밋 시점의 장치, `.codex/hooks.json`은 Codex 도구 완료 후 장치입니다. Codex 훅은 새 세션의 `/hooks`에서 검토·신뢰 승인이 필요하며 현재 실제 발화는 미검증입니다.

직접 의존성은 기존 개발 도구 9개를 유지했습니다. 이 전체 등록에 새 패키지는 추가하지 않았습니다. 실행 환경과 초기 설치 기록은 [2·3강 기록](docs/lessons/02-03-foundation.md), 현재 검증 결과는 [검증 기록](docs/harness/verification.md)을 봅니다.

## 상세 방법론 참조

아래 문서는 스킬이 읽는 작성 절차·템플릿·승인 및 실패 처리 기준입니다. 강의별 파일명과 출처 표는 근거 추적을 위해 유지합니다. 실행에 불필요한 PDF 원본과 임시 렌더 이미지는 저장소에서 제거했습니다.

| 자료             | 상세 분석                                                            |
| ---------------- | -------------------------------------------------------------------- |
| 소개·테스트 특강 | [방향과 테스트 기초](docs/lessons/00-orientation-testing.md)         |
| 2·3강            | [협업 기반·품질 자동화](docs/lessons/02-03-foundation.md)            |
| 4강              | [요구사항 인터뷰](docs/lessons/04-requirements-interview.md)         |
| 5강              | [디자인 시스템](docs/lessons/05-design-system.md)                    |
| 6·7·8강          | [PRD·ADR·이슈·기획 자산화](docs/lessons/06-08-planning.md)           |
| 9–13강           | [시나리오·TDD·AC·보안·반복](docs/lessons/09-13-tdd.md)               |
| 14–17강          | [E2E·CI·머지·루프 자동화](docs/lessons/14-17-delivery-automation.md) |

[전체 224쪽 커버리지](docs/harness/coverage.md)에 페이지별 근거와 원문/보강 차이를 연결했습니다. 18강은 예고만 있고 PDF가 없어 분석했다고 주장하지 않습니다. 배포·운영은 강의 밖의 보완 인계입니다.

## 기존 프로젝트 요구사항

PM 프로그램 관리 도구의 기존 결정은 다음 문서에 있습니다. 정리 과정에서 내용이나 승인 상태를 변경하지 않았습니다. 이 기능을 진행할 때 재사용하고, 다른 프로젝트에 이식할 때는 복사하지 않습니다.

- [최초 요청](docs/features/pm-program-tracker/spec-original.md)
- [인터뷰·회고](docs/features/pm-program-tracker/interview.md)
- [요구사항 검토본](docs/features/pm-program-tracker/spec-fixed.md)

강의 PDF 18개, 중복 워크플로우 원본, `CLAUDE.md`·`.claude/`, 임시 렌더 파일과 OS 메타데이터는 프로젝트 밖으로 백업 후 제거했습니다. 스킬의 상세 참조 문서, 검사기와 설정, PM 요구사항은 남겼습니다. 원본 PDF가 없으므로 하네스 검사는 원본 해시 18개를 건너뛰었다고 표시합니다. 파일·스킬·참조 검사는 계속 수행합니다.

`node_modules`는 로컬 검사 실행에 필요하므로 유지하지만 Git에는 포함하지 않습니다. 새 환경에서는 `npm ci`로 복원합니다.

## 화면 열기

```sh
open docs/architecture/index.html
```

파일 URL이 차단되는 브라우저에서는 다음처럼 구조도 폴더만 제공합니다.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/architecture
```

`http://127.0.0.1:8765/`에서 확인한 뒤 Ctrl+C로 종료합니다. 단계별 내용은 오프라인에서 읽을 수 있으며 보조 Mermaid 도식만 CDN 연결이 필요합니다.

## 완료로 혼동하지 말아야 할 것

스킬 파일·이식 도구는 등록했습니다. 실제 PM 앱 구현, 앱 단위/통합/E2E 테스트, 원격 CI·PR·머지·배포는 수행하지 않았습니다. 독립 검토와 자동 루프의 제품 런타임 검증은 승인된 대상 앱에서 별도 수행해야 합니다.

Codex 변환 근거: [프로젝트 지침](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [스킬](https://learn.chatgpt.com/docs/build-skills), [훅](https://learn.chatgpt.com/docs/hooks). 현재 설정을 대상에 적용할 때는 설치된 버전과 공식 문서를 다시 확인합니다.
