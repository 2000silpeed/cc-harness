# 전체 강의 커버리지와 적용 범위

## 전체 판독

총 **18개 PDF / 224쪽**. 2–5강 45쪽은 앞선 작업에서 전페이지 확인했고, 이번 전체 통합에서 6–17강·소개·특강 179쪽을 추가로 확인했다. 후속 범위 중 6–8강 41쪽과 14–17강 50쪽은 독립 담당자가 페이지별 직접 판독하고 메인이 분석 문서를 검토했다. 9–13강·소개·특강 88쪽은 메인이 페이지 이미지 합본으로 확인하고 작은 도식은 원본 크기로 추가 확인했다.

아래는 읽기와 문서 반영의 범위다. 제품 기능이나 자동화 런타임 실행 완료를 뜻하지 않는다. 원본 해시·페이지 목록·스킬 파일의 기계 목록은 [registry.json](registry.json)에 있다. 판독 문서의 페이지별 표를 통해 상세 내용을 찾는다.

| 자료 ID | 원본                                              | 확인 쪽 | 내용·페이지 대응                                     | 연결 스킬                              |
| ------- | ------------------------------------------------- | ------- | ---------------------------------------------------- | -------------------------------------- |
| 02      | `02.Claude와 협업 준비.pdf`               | 13/13   | [분석 문서](../lessons/02-03-foundation.md)          | `project-bootstrap`, `mermaid-diagram` |
| 03      | `03.코드 품질 자동화.pdf`                         | 10/10   | [분석 문서](../lessons/02-03-foundation.md)          | `project-bootstrap`                    |
| 04      | `04.요구사항 인터뷰_v1.pdf`                       | 11/11   | [분석 문서](../lessons/04-requirements-interview.md) | `feature-planner`                      |
| 05      | `05.디자인 시스템 구축.pdf`                       | 11/11   | [분석 문서](../lessons/05-design-system.md)          | `design-system`                        |
| 06      | `06.PRD 작성 & 기술 결정(ADR).pdf`                | 16/16   | [분석 문서](../lessons/06-08-planning.md)            | `feature-planner`                      |
| 07      | `07.이슈 분해 & GitHub 등록.pdf`                  | 11/11   | [분석 문서](../lessons/06-08-planning.md)            | `feature-planner`                      |
| 08      | `08.기획 워크플로우 자산화 & feature-planner.pdf` | 14/14   | [분석 문서](../lessons/06-08-planning.md)            | `feature-planner`                      |
| 09      | `09.TDD 개념.pdf`                                 | 12/12   | [분석 문서](../lessons/09-13-tdd.md)                 | `test-scenarios`                       |
| 10      | `10.Red.pdf`                                      | 10/10   | [분석 문서](../lessons/09-13-tdd.md)                 | `tdd-red`                              |
| 11      | `11.Green 최소 구현.pdf`                          | 16/16   | [분석 문서](../lessons/09-13-tdd.md)                 | `tdd-green`, `ac-verifier`             |
| 12      | `12.Refactor + 보안.pdf`                          | 14/14   | [분석 문서](../lessons/09-13-tdd.md)                 | `tdd-refactor`, `security-review`      |
| 13      | `13.이슈 사이클 반복.pdf`                         | 5/5     | [분석 문서](../lessons/09-13-tdd.md)                 | `tdd-loop`                             |
| 14      | `14.E2E 개념.pdf`                                 | 16/16   | [분석 문서](../lessons/14-17-delivery-automation.md) | `e2e-write`                            |
| 15      | `15.main 머지.pdf`                                | 16/16   | [분석 문서](../lessons/14-17-delivery-automation.md) | `create-pr`                            |
| 16      | `16. tdd-loop.pdf`                                | 9/9     | [분석 문서](../lessons/14-17-delivery-automation.md) | `tdd-loop`                             |
| 17      | `17강.tdd-auto-loop.pdf`                          | 9/9     | [분석 문서](../lessons/14-17-delivery-automation.md) | `tdd-auto-loop`                        |
| special | `[특강]  배경지식 - Test Code 에 대한 이해.pdf`   | 24/24   | [분석 문서](../lessons/00-orientation-testing.md)    | `test-scenarios`, `tdd-red`            |
| intro   | `강의소개.pdf`                                    | 7/7     | [분석 문서](../lessons/00-orientation-testing.md)    | `harness-cycle`                        |

## 빠뜨리기 쉬운 연결

- 소개: 지침·검증·피드백·사람 판단의 네 장치. 단순 프롬프트 모음이 아니다.
- 4–8강: 원문 워크플로의 3단계, 4개 사용자 승인, 3안×7기준, ADR 네 요소, 수직 슬라이스와 GWT AC를 유지했다.
- 5→11강: 디자인 문서는 독립 장식물이 아니라 Green의 UI 구현 입력이다.
- 9→10강: 계약·시나리오가 테스트 코드가 되며 실패 이유를 검증한다.
- 11→13강: 테스트 통과와 AC 판단을 나누고 독립 검토 계약을 등록했다.
- 14→15강: E2E 제품 결함은 적절한 하위 회귀 테스트의 Red→Green으로 돌아간다. E2E 완화로 숨기지 않는다.
- 15강: PR 초안 검토·E2E·push/PR·CI·리뷰·머지를 구분하며 main 통합은 배포가 아니다.
- 16강: 사전 점검과 7단계의 순서 자동화, 단계 승인 유지.
- 17강: 단계별 격리·JSON·객관 STOP·별도 AC·PR 리뷰. 수치 조건은 별도 원문 프로필로 보존하고 무제한 자체 승인으로 바꾸지 않았다.
- 특강: GWT/AAA, 사용자 관점, 비동기 대기, Matcher, Mock/Stub, FIRST가 시나리오·Red·E2E 원칙에 연결된다.

## 원문과 다르게 보강한 지점

1. Claude 파일 경로·호출 표기를 Codex 프로젝트 스킬과 지침으로 바꿨다. 공식 문서와 로컬 CLI를 확인했다.
2. 빈 프로젝트에서 기술 선택 후 최소 런타임을 준비하는 경로를 추가했다. 강의가 전제하는 앱이 없다고 허위 구현을 만들지 않는다.
3. 자동 모드의 자율 판단은 사전 승인 범위 안으로 제한하고 증거·수정 상한·안전한 정지를 둔다. 17강의 원문과 변환 이유를 분석 문서에 분리했다.
4. 강의의 문서 정리를 무조건 삭제로 옮기지 않는다. 요구사항·ADR·승인 이력은 대상 보존 정책을 따른다.
5. 배포·운영 인계는 강의 밖 보강이다. 호스팅·운영 시스템이 설치됐다는 의미가 아니다.

## 없는 자료·미실행 범위

16강 도식에 18강이 예고되지만 실제 폴더에는 18강 PDF가 없다. 없는 강의의 내용을 만들어 넣지 않았다. 스킬 전문·자동 루프 JSON 스키마·spawn 구현 등 원문에 생략된 세부는 재사용 방법론으로 보강했으며 복원된 원문이라고 주장하지 않는다.

실제 PM 앱 구현·앱 TDD/E2E·원격 GitHub 등록·CI·머지·배포는 이번 요청 범위가 아니다.
