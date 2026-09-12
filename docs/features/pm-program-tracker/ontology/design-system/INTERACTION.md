# ontology — 인터랙션 계약

`design-system/interactions.css`가 이 계약의 실행 가능한 형태입니다.
선택되지 않은 패턴을 구현하거나 여기 없는 모션을 추가하면 린터가 막습니다.

- 선택 방식: `contextual-variation`
- 변동 시드: `None`

## 선택된 패턴

### enter · `result-reveal`

Purposeful result reveal

- 마크업: `data-interaction="result-reveal"`
- 모션: 180ms · `enter` · reduced-motion `opacity-only`
- 적용 역할: list-surface, status-region
- 근거 팩: `vibecoding-motion`
- 가드레일:
  - Use only when new content becomes available.
  - Do not animate layout-critical geometry or delay access to content.
  - Preserve the product's information hierarchy and copy.

### emphasis · `attention-border`

State-bound attention border

- 마크업: `data-interaction="attention-border"`
- 모션: 180ms · `standard` · reduced-motion `static`
- 적용 역할: status-region
- 근거 팩: `vibecoding-motion`
- 가드레일:
  - Never apply the animated border to every card by default.
  - Use semantic accent tokens only; no hard-coded effect colors.
  - Focus visibility must remain stronger and independent from decoration.

### progress · `determinate-bar`

When the remaining work is measurable, showing the measurement beats showing activity.

- 마크업: `data-interaction="determinate-bar"`
- 모션: 180ms · `standard` · reduced-motion `static`
- 적용 역할: async-action, status-region
- 근거 팩: `harness-interaction-candidates`
- 가드레일:
  - Use only when real progress is known; never fake the fill rate.
  - Pair the bar with a numeric or textual status.
  - Fall back to an indeterminate pattern rather than inventing a percentage.

### transition · `context-crossfade`

A brief crossfade marks that the frame of reference changed while the surrounding chrome stayed put.

- 마크업: `data-interaction="context-crossfade"`
- 모션: 180ms · `standard` · reduced-motion `opacity-only`
- 적용 역할: list-surface
- 근거 팩: `harness-interaction-candidates`
- 가드레일:
  - Chrome and navigation must not move during the fade.
  - Do not crossfade when the underlying data is identical.
  - Keep the outgoing and incoming content from overlapping legibly.

## 검토했지만 선택하지 않은 후보

- `dot-progress` (progress, 점수 5)
- `immediate-swap` (enter, 점수 4)
- `skeleton-placeholder` (progress, 점수 3)
- `weight-shift` (emphasis, 점수 3)
- `inline-expand` (enter, 점수 2)
- `staged-enter` (enter, 점수 2)
