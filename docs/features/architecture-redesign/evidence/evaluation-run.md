# AR-02 로컬 오프라인 평가 실행 기록

- 변경 전 기준선: `ae9ff54c33518b77fc0de18feb217660303ac739`의 CLI 스냅샷, SHA-256 `19823e889fa3e3db7a74b98610f8efbe8fd4412248860d7cf313b4176b84aefe`.
- 기준선 생성: 스냅샷을 격리된 로컬 Git fixture 저장소에서 동일한 14개 기록·문맥으로 직접 실행해 판정과 종료 코드를 관찰했다. `tests/fixtures/handoff-evaluations-baseline.json`에 case별 입력 해시와 실제 관찰을 기록했다. 기대 판정은 별도 corpus에 둔다.
- 현재 실행: `npm run handoff:eval -- --output docs/features/architecture-redesign/evidence/evaluation-current.json` → 종료 0, 14/14 비교 가능·기대 판정 일치, 기준선 대비 변경 0, 실패 0. corpus SHA-256 `d281c02ea2c29fbefc156addbe27069be31cb266a3fc1504293f9dd82625d379`.
- 관련 테스트: `npx vitest run tests/unit/handoff-evaluation.test.ts` → 종료 0, 4/4. 중복·누락 case, 해시 불일치, 기준선 누락, 같은 입력 재준비, 기준선 변화 표시를 확인했다. 잘못된 기준선 schema·출처·corpus에서는 모든 row가 `pass: false`, `comparable: false`이며 명령이 실패함을 확인했다.
- 정적 검사: `npx eslint scripts/evaluate-handoff.mjs tests/unit/handoff-evaluation.test.ts` → 종료 0.
- 권한 경계: 모든 row의 `approval_provenance`는 `not_checked`다. `approval-self-declared`의 구조 판정 통과는 실제 승인자의 의사·범위·시점·철회를 확인하지 않는다. 이 평가는 독립 AC 감사나 전체 제품 수용을 대신하지 않는다.
