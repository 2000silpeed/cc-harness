승인합니다.

기존 아키텍처 B안 + 검증 정책 C안 + 제안한 NOW 범위로 구현을 진행해주세요.

다만 다음 세 조건을 구현 원칙에 추가합니다.

1. `compact / standard / intensive` 분류에서 파일 수나 diff 크기를 주요 기준으로 사용하지 마세요. 특히 compact는 변경의 blast radius가 충분히 확인된 경우에만 선택할 수 있도록 하고, 영향 범위가 불명확하면 standard 이상으로 올리세요. 이 조건이 가능하면 검증 가능한 contract/test로 남도록 해주세요.

2. Evidence Reuse 판단 자체가 새로운 고비용 절차가 되지 않도록 해주세요. 코드/계약/테스트/환경의 유효성을 가능한 한 기존 metadata, 버전, 해시, 명령, checkpoint 등 저비용 근거로 먼저 판단하고, 불확실할 때만 추가 탐색 또는 재검증하도록 설계해주세요.

3. Adaptive Execution이 실제로 토큰이나 총 프로젝트 비용을 절감한다고 가정하지 마세요. 이번 구현은 이를 검증하기 위한 첫 policy로 취급합니다. 관측 가능한 execution metadata를 남겨 향후 compact / standard / intensive별 retry, escalation, verification, rework 및 실제 usage가 제공되는 실행 경로의 token usage를 비교할 수 있게 해주세요. 측정되지 않은 절감률이나 성능 향상을 문서에서 주장하지 마세요.

그 외에는 제안한 설계를 승인합니다.

NOW 범위를 넘어 NEXT/LATER 기능을 구현하지 마세요.

새 router framework, 별도 configuration system, token collector, learning system, 자동 upgrade engine을 이번 작업에 추가하지 마세요.

기존 cc-harness의 승인 gate, STOP, 독립 검증, 유한 retry, 사용자 권한 경계는 유지해주세요.

이제 저장소의 기존 lifecycle과 orchestration policy를 그대로 dogfooding하여 구현을 진행해주세요.

구현자와 독립 verifier를 분리하고, 관련 테스트를 수행한 뒤 마지막에 `npm run check`까지 실행해주세요.

완료 후에는 단순 변경 파일 목록보다 다음을 중심으로 보고해주세요.

- 실제 구현된 Adaptive Execution contract
- Model Routing과의 연결
- compact / standard / intensive 선택 방식
- Minimum Sufficient Context
- JIT Repository Understanding
- Evidence Reuse
- ADOPT / RESUME 동작
- Execution Metadata
- 추가/변경된 테스트와 결과
- `npm run check` 결과
- 구현 중 최초 설계에서 변경된 판단과 이유
- 아직 실제 runtime에서 검증하지 못한 부분
- NEXT로 남긴 항목

그리고 이번 구현 자체를 dogfooding 사례로 남길 수 있다면, 어떤 process profile이 선택되었고 왜 선택되었는지, worker/verifier/escalation이 실제로 어떻게 사용되었는지도 증거가 있는 범위에서 보고해주세요.

추가main결정: 이작업 intensive, 이유 공통승인/STOP/재개/routing 계약에 영향주고 독립검증및다른프로젝트이식에 연결. actual backend model/usage unknown. worker Terra high 요청은 앞선 Sol quota error 대체, reasoning escalation으로계산하지않음. user승인된시나리오는 직전설계 9절의 7개경계+기존ModelRouting/ADOPT/RESUME검증 전체(첫작업지시에요약됨); 허용scope 내 implementation bookkeeping만정리. 이름만바꿔G4/G5새승인사칭/필수gate완화금지. 진정 새 미승인기술결정있으면main에보고.
