# 색상 기준

기준 화면: `docs/architecture/index.html`. 구조도 문서 화면의 현행 기준이며 새 제품의 색상안은 별도로 정한다.

배경은 페이지 #111519 / 카드 #191f25 / 코드 #10161b, 본문 #e8edf1, 보조 #b2bec8이다. 강조 #f5b957, 경고·포커스 #f5c36e, 성공 #95d9b3, 오류 #ffbc97, 링크 #a8d4ff를 사용한다. 상태는 색뿐 아니라 문구로도 전달한다.

## 기계 검사 기준

이 JSON 블록은 검사기가 읽는 속성별 허용 값의 단일 기준이다. 의도한 디자인 변경은 근거를 확인하고 이 기준과 화면을 함께 수정한다. 검사 통과만을 위해 허용 값을 추가하지 않는다.

```json
{
  "color-scheme": ["dark"],
  "background": ["#111519", "#191f25", "#10161b"],
  "color": ["#e8edf1", "#f5b957", "#b2bec8", "#f5c36e", "#95d9b3", "#ffbc97", "#a8d4ff"],
  "border": ["1px solid #3b4b58", "1px solid #303a43"],
  "border-color": ["#936728"],
  "border-bottom": ["1px solid #303a43"],
  "outline": ["2px solid #f5c36e"]
}
```
