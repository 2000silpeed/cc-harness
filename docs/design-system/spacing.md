# 간격·레이아웃 기준

기존 화면의 값을 보존한다. 새 4px 배수 규칙으로 임의 정리하지 않는다. 최대 너비 1180px, 데스크톱 바깥 여백 48px 24px, 카드 안쪽 24px, 카드 사이 22px이다. 600px 이하에서는 바깥 28px 16px, 카드 16px로 줄인다. 배지는 줄바꿈하고 표·그림은 가로 스크롤한다.

아래에는 간격 외에 현재 문서의 크기·배치 속성도 포함한다. 브레이크포인트와 선택자별 배치는 정적 검사 대상이 아니므로 화면 검토가 필요하다.

## 기계 검사 기준

이 JSON 블록은 검사기가 읽는 속성별 허용 값의 단일 기준이다. 의도한 디자인 변경은 근거를 확인하고 이 기준과 화면을 함께 수정한다. 검사 통과만을 위해 허용 값을 추가하지 않는다.

```json
{
  "box-sizing": ["border-box"],
  "margin": ["0", "0 auto", "12px 0", "22px 0", "0 0 18px"],
  "max-width": ["1180px", "100%"],
  "padding": [
    "48px 24px",
    "6px 12px",
    "24px",
    "13px 12px",
    "4px 0",
    "18px",
    "28px 16px",
    "16px",
    "10px 8px"
  ],
  "margin-top": ["0", "22px"],
  "display": ["flex", "block"],
  "flex-wrap": ["wrap"],
  "gap": ["8px"],
  "border-radius": ["999px", "16px", "8px"],
  "overflow-x": ["auto"],
  "text-align": ["center", "left"],
  "height": ["auto"],
  "margin-bottom": ["0"],
  "width": ["100%", "46%"],
  "border-collapse": ["collapse"],
  "vertical-align": ["top"],
  "overflow-wrap": ["anywhere"],
  "cursor": ["pointer"],
  "outline-offset": ["5px"],
  "white-space": ["pre-wrap"],
  "padding-top": ["24px"]
}
```
