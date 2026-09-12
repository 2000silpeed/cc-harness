# 타이포그래피 기준

시스템 한글 폰트를 사용하며 웹 폰트를 추가하지 않는다. 코드만 monospace로 구분한다. 제목은 28–42px 유동 크기, 소제목 20px, 표·상태 14px, 배지·보조정보 13px이다. 본문은 브라우저 기본 크기를 유지한다.

## 기계 검사 기준

이 JSON 블록은 검사기가 읽는 속성별 허용 값의 단일 기준이다. 의도한 디자인 변경은 근거를 확인하고 이 기준과 화면을 함께 수정한다. 검사 통과만을 위해 허용 값을 추가하지 않는다.

```json
{
  "font-family": [
    "-apple-system, BlinkMacSystemFont, \"Apple SD Gothic Neo\", \"Malgun Gothic\", sans-serif",
    "ui-monospace, SFMono-Regular, Menlo, monospace"
  ],
  "font-size": ["13px", "clamp(28px, 4vw, 42px)", "20px", "14px", "0.92em"],
  "letter-spacing": ["0.12em", "-0.04em"],
  "font-weight": ["700", "600"],
  "line-height": ["1.75", "1.65", "1.8"]
}
```
