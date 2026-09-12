# PM 색상 · Cool Ledger

상태: 하네스 합성 후 PM용 재정립 제안. 적용 범위는 밝은 테마다. 구조도 공통 색상 문서를 덮어쓰지 않는다.

## 권한과 출처

Semantic-os `domains/color/ontology/build/graph.json`과 Design Ontology Harness `docs/color-reference.md`의 동기화 검사 통과. payload SHA-256: `4041facc76b5557979f38a27688d349378caece64d143eb409fc78890a9903b9`.

Cool Neutral은 온톨로지의 대비 기반 UI 중성 램프, Classic Blue는 `color-keyword-classic-blue`의 앵커다. 원본 조합표가 아니라 PM 역할에 맞춘 새로운 조합이다. 모니터·인쇄 재현을 보증하지 않는다.

## 실제 채택 역할

| 역할         | CSS 토큰                                | 값      | 용도·주의                                           |
| ------------ | --------------------------------------- | ------- | --------------------------------------------------- |
| 바탕·작업 면 | --ds-color-canvas / surface             | #F5F6F7 | Cool Paper                                          |
| 보조·선택 면 | --ds-color-surface-muted / surface-tint | #E8EAED | Cool Veil; 선택은 문구·포커스도 병행                |
| 본문         | --ds-color-ink                          | #21252B | Cool Ink; 순검정 대신 사용                          |
| 보조 문구    | --ds-color-ink-muted / ink-subtle       | #5A6270 | Cool Muted; opacity로 흐리게 만들지 않음            |
| 장식 경계    | --ds-color-border                       | #D2D5DB | Cool Line; 입력의 유일한 경계로는 불가              |
| 입력 경계    | --ds-color-border-strong                | #5A6270 | 보조 면에서도 대비를 확보하기 위한 명시적 재사용    |
| 주 액션·링크 | --ds-color-primary / accent / link      | #0F4C81 | Classic Blue; 단색, 절제해 사용                     |
| 역상 글자    | --ds-color-ink-inverse                  | #FFFFFF | 생성기의 runtime policy 값; 주 액션 위에서만 검사됨 |

source anchor와 실제 semantic role은 자동으로 같지 않다. 생성기는 브랜드 hue 파생 중성색도 만든다. PM은 `runtime-theme.css`에서 생성된 `--ds-color-brand-*` 앵커로 위 역할을 명시적으로 연결했다. 합성기 출력은 수정하지 않았다.

Cool Edge #818895는 Cool Veil 위에서 약 2.96:1이므로 해당 입력 경계에 채택하지 않았다. 15% ghost border 역시 장식 이외 용도로 사용하지 않는다.

## 컴포넌트 상태 매핑

| 요소·상태      | 배경 / 전경 / 경계                  | 색 외 정보                                        |
| -------------- | ----------------------------------- | ------------------------------------------------- |
| 주 버튼        | primary / ink-inverse / 없음        | 행동이 명확한 동사                                |
| 보조 버튼      | surface-muted / ink / 없음          | 백업·복원 등 명시 이름                            |
| 입력 기본      | surface / ink / border-strong       | 라벨·입력 형식                                    |
| 입력 포커스    | surface / ink / primary 2px outline | 키보드 위치                                       |
| 입력 오류      | surface / ink / border-strong       | ‘오류’ 문구 + 필드 연계; 색상만 의존 금지         |
| 선택 행        | surface-muted / ink                 | 선택 문구·현재 행 인식                            |
| 업무 5상태     | surface-muted / ink                 | 다섯 한국어 이름; 신규 의미색 5개를 강제하지 않음 |
| 개발 막대      | primary / 필요하면 ink-inverse      | 기간 텍스트와 시작·끝 날짜                        |
| 이관 표식      | primary                             | 다이아몬드 형태·범례·날짜                         |
| 일정 미정      | surface / ink-muted                 | 막대 대신 문구; 경고 상태 아님                    |
| 오류·저장 실패 | surface-muted / ink                 | 작업명·원인·복구 안내, 지속 표시                  |

## 대비 검사

최종 연결값을 읽어 11개 역할의 **121개 방향 조합**을 text-capable(≥4.5), large-ui-only(≥3), decorative-only(<3)로 분류했다. 모든 조합을 텍스트로 허용하는 뜻이 아니다.

필수 쌍: 본문/작업 면 14.23:1, 보조 글자/보조 면 5.10:1, 흰 글자/주 액션 8.86:1, 주 액션색/작업 면 8.19:1, 강한 경계/보조 면 5.10:1.

재현: `node docs/features/pm-program-tracker/ontology/verify-design.mjs`. 전체 행렬은 합성 후 `ontology/build/palette-verification.json`에 저장한다. 실제 렌더링·focus·disabled·투명 합성·다크 테마는 이 수치 검사에 포함되지 않는다.
