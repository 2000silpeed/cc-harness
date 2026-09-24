# 전 사이클 산출물 작성 템플릿

이 문서에서는 전 개발 과정에 필요한 기록 양식을 제공합니다. 새 대상의 `docs/features/{feature}/`에는 현재 단계에 필요한 템플릿만 사용하고, 빈 문서를 한꺼번에 만들지 않습니다. 대괄호 안의 안내 문구는 실제 내용으로 바꾸며, 확정하지 못한 항목에는 미정인 이유와 결정할 사람을 적습니다. 대상 프로젝트에 기존 인터뷰가 있다면 이 템플릿으로 덮어쓰지 않습니다.

## 원문·인터뷰·요구사항

```markdown
# spec-original.md

## 최초 요청

[사용자의 요청을 의미 변경 없이 보존]

## 제공 자료

[파일·링크·명시한 제약]
```

```markdown
# interview.md

| 질문 ID | 질문·AI 추천과 이유 | 사용자 답변·결정 이유 | 반영 요구사항 |
| ------- | ------------------- | --------------------- | ------------- |

## 회고

- AI 추천과 다르게 선택한 내용:
- 새로 발견한 경계·예외:
- 다시 시작한다면 바꿀 접근:
```

```markdown
# spec-fixed.md

- 상태·승인 근거:

## 목적·주 사용자

## 기본 사용 시나리오

## 요구사항

| ID  | 동작·제약 | 결정 근거 | 확인 방법 |
| --- | --------- | --------- | --------- |

## 용어 정의

## 오류·경계·저장·성능

## 미정·제외 범위
```

작성할 때는 실제 코드 패턴을 먼저 조사한 뒤 주 사용자(primary user), 최소 동작, 저장 관계, 경계, 실패 표시, 사용자 화면(UI)의 일관성, 성능, 확장 가능성을 확인합니다. 질문은 한 번에 하나만 하고 이미 알려진 답은 다시 묻지 않습니다. 확장 가능성을 검토하는 일은 이번 구현 범위를 넓히라는 허가가 아니라, 현재 결정의 영향을 확인하는 과정입니다.

## 디자인

[디자인 작성 가이드](../design-system/authoring-guide.md)의 `design.md`, `colors`, `typography`, `spacing`, `components` 템플릿을 사용합니다. 요구사항을 시각 명세로 바꾸되 관찰한 사실, 추정, 사용자 승인을 구분합니다. UI가 없다면 그 이유를 남기고 이 단계를 생략합니다.

## PRD와 ADR

```markdown
# prd.md

- 상태·요구사항 승인 근거·디자인 참조:

## 개요

## 사용자 스토리와 요구사항 ID

## 기술 대안 비교

| 기준               | 안 A | 안 B | 안 C |
| ------------------ | ---- | ---- | ---- |
| 데이터 구조        |      |      |      |
| API 변경 지점      |      |      |      |
| 상태관리 변경 지점 |      |      |      |
| 핵심 동작          |      |      |      |
| 컴포넌트 구조      |      |      |      |
| 기존 패턴 일관성   |      |      |      |
| 테스트 용이성      |      |      |      |

## 기술 결정: [제목]

- Context:
- Decision: [사용자 선택 또는 구현 승인 범위의 AI 선택·이유·근거]
- Alternatives: [각 대안과 각각의 거부 이유]
- Consequences: [장점·단점·부담]

## Out of Scope

## 용어 정의

## 검증·위험·미정
```

기술 결정은 처음에는 미정으로 둡니다. 실제 구조에 맞는 대안을 최소 세 가지 비교한 뒤 [승인과 외부 작업](lifecycle.md#5-승인과-외부-작업)에 따라 사용자 선택 또는 유효한 구현 승인 범위의 AI 선택을 기록하고 ADR의 네 요소를 작성합니다. 하지 않을 일도 승인 결과 안에서 구체화하며 권한 밖의 결정만 확인합니다. 의미 없는 대안을 끼워 넣어 특정 선택을 유도해서는 안 됩니다. 제품 요구사항 문서(PRD)는 결정의 기준점이며 디자인 값을 중복 저장하는 문서가 아닙니다.

## 이슈

```markdown
# issues.md

- PRD·범위 승인 근거:
  | ID  | 사용자에게 보이는 결과 | 선행 이슈 | 크기 판단 | 상태 | 외부 URL |
  | --- | ---------------------- | --------- | --------- | ---- | -------- |

## [ID] [행동 중심 제목]

### 목적·범위·PRD 요구사항

### Acceptance Criteria

- [ ] AC-01: Given [...], When [...], Then [...]

### 의존성

### 테스트 접근·예상 변경 범위

### 제외 범위·위험

### 등록 결과

- 저장소·issue URL·보드 item·상태:
```

각 이슈 하나만으로도 사용자가 체감할 동작을 보여줄 수 있는지 검토합니다. API→상태→UI 계층만 기준으로 수평 분할해서는 안 됩니다. 반나절에서 하루는 이슈 크기를 가늠하기 위한 기준일 뿐 실제 작업 시간을 보장하지 않습니다. GitHub에는 이슈 목록을 승인받은 뒤 대상 저장소, 보드, 권한을 확인하고 등록합니다. 일부만 성공했다면 이미 생성된 URL을 기록하여 중복 등록을 막습니다.

## 테스트·검증

[TDD 방법론](../methods/tdd.md)의 시나리오·AC·보안 템플릿을 이슈별 `tests/`와 `reviews/`에 사용합니다. 요구사항 ID → AC → 시나리오 ID → 테스트 코드 → 실행 증거의 연결이 끊기지 않아야 합니다.

## 진행·재개

```markdown
# progress.md

- 대상 프로젝트 절대 경로:
- feature·현재 이슈·현재 단계:
- 구현/외부 작업 승인 범위:
- 대상 변경 식별자: [커밋 또는 검사 파일 해시]

| 게이트 | 대상 문서·버전 | 상태 | 사용자 승인·위임 근거 |
| ------ | -------------- | ---- | --------------------- |

| 단계 | 명령·cwd | 결과·종료 코드 | 증거 경로 | 다음 행동 |
| ---- | -------- | -------------- | --------- | --------- |

## 남은 문제·미실행 검사

## 재개 조건
```

명령을 실행하지 않았다면 `planned` 또는 `unverified`로 기록합니다. 사용할 스킬 이름을 나열했다는 이유만으로 실행 완료 상태로 바꾸지 않습니다.

## Adaptive Execution 결과 JSON

기존 auto-loop 결과 필드를 제거하지 않고 아래 metadata를 추가합니다. 이 예시는 문서 계약의 literal JSON이며 실제 agent 행동·backend metadata·cost 절감을 증명하지 않습니다. 관찰하지 못한 값은 0이 아니라 `unknown` 또는 `unavailable`으로 기록합니다.

```json
{
  "issue": "<approved-issue>",
  "stage": "green",
  "status": "passed",
  "base": "<approved-base>",
  "head": "<issue-branch>",
  "revision": "<verified-revision>",
  "attempt": 1,
  "ac_passed": null,
  "source_revision": "<verified-source-revision>",
  "contract_hashes": { "docs/methods/delivery-automation.md": "<sha256-of-effective-contract>" },
  "evidence": [],
  "evidence_validity": { "state": "unknown", "reason": "<not-yet-assessed>", "refs": [] },
  "profile": "standard",
  "profile_reason": "impact was not fully known",
  "risk_flags": [],
  "context_scope": ["approved-AC", "relevant-contract", "focused-test", "checkpoint"],
  "verification": { "depth": "focused", "scope": ["tests/unit/harness-portability.test.ts"] },
  "evidence_reuse": {
    "reused": false,
    "checks": ["same_relevant_code_contract_ac_test_command_environment"]
  },
  "roles": {
    "worker": { "role": "default_worker", "context_id": "worker-new" },
    "verifier": { "role": "verifier", "context_id": "verifier-independent" }
  },
  "requested": {
    "worker": { "model": "Sol", "effort": "medium" },
    "verifier": { "model": "Sol", "effort": "high" }
  },
  "observed": {
    "worker": { "model": "unknown", "effort": "unknown" },
    "verifier": { "model": "unknown", "effort": "unknown" },
    "usage": {
      "value": "unknown",
      "source": "unavailable",
      "unit": "unknown",
      "coverage": "unknown"
    }
  },
  "green_attempts": { "limit": 3, "used": 3, "remaining": 0 },
  "retry_count": 2,
  "diagnostic": {
    "budget": 1,
    "used": 0,
    "remaining": 1,
    "escalation_reason": "not-run",
    "diagnostic_result": null,
    "evidence_ref": null,
    "requested": { "model": "unknown", "effort": "unknown" },
    "observed": { "model": "unknown", "effort": "unknown" },
    "context_id": null,
    "approval_ref": null,
    "status": "not-run"
  },
  "rework": { "count": "unknown", "definition": "post-verification correction cycles" },
  "failure": { "current": null, "previous": [] },
  "outcome": "passed",
  "next_action": "independent-verification",
  "policy_effective_checkpoint": "<approved-checkpoint>"
}
```

`compact` 실행 수준은 관련 호출, 계약, 의존성이 확인된 경우에만 사용합니다. 영향 범위가 불명확하거나 보안·데이터·권한 문제가 있거나 사용자 승인 관문과 STOP 계약이 걸려 있다면 `standard` 이상을 사용하거나 사용자 승인을 받습니다. 파일 수나 변경량(diff)이 작다는 이유만으로 실행 수준을 낮추지 않습니다.

기존 결과를 재사용할 때는 버전, 해시, 명령, 작업 확인점처럼 확인 비용이 낮은 정보부터 비교합니다. 관련 코드·계약·인수 조건(AC)·테스트·명령·실행 환경이 모두 같은지 확인하고, 하나라도 불명확하면 해당 부분만 추가로 조사하거나 다시 검증합니다.

`green_attempts.used`는 Green 구현 시도 수이며, `retry_count`는 첫 Green 뒤 실제로 수행한 추가 구현 시도 수입니다. 검증 입력과 버전이 같은 단순 재실행은 이 수에서 제외합니다. 독립 AC 검토가 실패한 뒤 구현이나 계약을 바꾸고 Green으로 돌아가면 새 Green 시도이자 재작업(rework)으로 계산합니다.

상한(`limit`)은 `min(3, 1 + user_approved_retry)`입니다. 범위, 컨텍스트, 모델, RESUME이 바뀌어도 누계를 초기화하지 않습니다. 진단(diagnostic)은 별도 예산을 사용합니다. `not-run`은 호출하지 않은 경우이고, `unknown`은 호출했지만 값을 관찰하지 못한 경우입니다. 성공 예시의 `ac_passed: null`은 아직 독립 AC 검토 전이라는 뜻입니다.

실패 중에는 `failure.current`에 `{ "class": "<failure-class>", "identity": "<class-command-signature-tool-version-scope>" }`를 기록합니다. 해결되면 current를 `null`로 두고 previous로 옮깁니다. 자동 예시의 수치는 `tdd-auto-loop` 계약을 보인 것입니다. 수동 tdd-loop는 승인된 유한 범위와 실제 누적 Green/retry/rework를 자체 progress에 기록하며 자동 상한을 묵시적으로 적용하지 않습니다.

## PR·CI·머지 기록

```markdown
# delivery.md

- 원격 저장소·base·head·대상 커밋:
- 관련 이슈·요구사항:

## 변경 요약

## 실제 검사

| 검사 | 명령/CI 이름 | 대상 변경 | 결과 | 로그 |
| ---- | ------------ | --------- | ---- | ---- |

## 리뷰·미해결 의견

## 승인

- PR 생성 / 머지 / 브랜치 정리 / 이슈 종료 각각의 범위:

## 머지 결과 또는 미실행 이유

## 회고와 다음 기능에 재사용할 규칙
```

테스트 명령은 대상의 실제 package와 CI 설정에서 확인합니다. GitHub Actions YAML 파일이 있는 상태와 원격 실행이 성공한 상태는 서로 다릅니다. 아직 CI가 없다면 초안을 만들 수 있지만 검증 상태는 대기 중(`pending`)으로 둡니다.

## 배포·운영 인계

```markdown
# release-checklist.md

- 배포 대상·환경·담당자·비용 승인:
- 배포할 버전·검사 증거:
- 비밀 관리: [값이 아닌 저장 위치·주입 방식]
- 마이그레이션·백업·복구 조건:
- 실행 절차·롤백 절차:
- smoke test·관측할 로그·알림:
- 사용자 승인과 실제 실행 결과:
- 남은 운영 작업·책임자:
```

플랫폼이 정해지지 않으면 일반 템플릿을 실행 가능한 배포 스크립트로 주장하지 않습니다.
