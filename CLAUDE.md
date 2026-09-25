# cc-harness · Claude Code 협업 지침

@AGENTS.md

위 AGENTS.md가 Codex와 함께 쓰는 공통 기준이다. 이 파일에는 그 기준을 Claude Code 도구로 실행하는 방법만 적는다. 둘이 어긋나 보이면 AGENTS.md와 그것이 가리키는 방법론을 따르고, 어긋난 지점을 사용자에게 알린다.

## 스킬 호출

- 스킬은 `/harness-cycle`처럼 호출한다. 문서의 `$스킬명`도 `/스킬명`으로 읽는다.
- `.claude/skills/<이름>/SKILL.md`는 `.agents/skills`의 원본을 가리키는 진입점일 뿐이다. 절차를 바꿀 때는 원본을 고치고, 이름이나 설명이 바뀌었으면 진입점도 같이 맞춘다. 본문을 한 곳에서만 관리해야 Codex와 Claude Code의 절차가 갈라지지 않는다.
- `security-review`는 Claude Code 기본 명령과 이름이 겹쳐서 `/harness-security-review`로 호출한다. 문서의 `/security-review`도 이 이름으로 읽는다.
- `mermaid-diagram`은 `disable-model-invocation: true`라서 사용자가 `/mermaid-diagram`을 입력했을 때만 실행한다. Codex의 `allow_implicit_invocation: false`와 같은 뜻이다.
- 원본 스킬이 읽으라고 지정한 절만 읽는다. 문서를 통째로 읽으면 이후 판단에 쓸 컨텍스트가 줄어든다.

## 역할 배정

오케스트레이션 정책의 역할은 `.claude/agents`의 서브에이전트에 배정한다. Agent 도구를 호출할 때 `subagent_type`에 아래 이름을 지정한다.

| 역할      | subagent_type      | 모델·effort            | 권한                           |
| --------- | ------------------ | ---------------------- | ------------------------------ |
| 작업자    | harness-worker     | claude-opus-5-5 medium | 파일 수정·검사 실행, 위임 불가 |
| 검증자    | harness-verifier   | claude-opus-5-5 high   | 읽기·검사 재실행만             |
| 진단 역할 | harness-diagnostic | claude-opus-5-5 xhigh  | 읽기 전용                      |

- 작업자와 검증자는 항상 서로 다른 호출로 만든다. 검증자가 구현자의 대화를 보지 않아야 독립 검증이 성립한다.
- 대화를 복제하는 fork 방식은 쓰지 않는다. 이름을 지정한 서브에이전트는 메인 대화를 물려받지 않으므로 최소 입력 계약을 그대로 지킬 수 있다.
- 서로 의존하지 않는 작업자는 한 응답에서 병렬로 호출한다. 의존 관계가 있거나 같은 파일을 건드리면 순서대로 호출한다.
- 호출할 때 `model`을 넘기면 정의의 값보다 우선한다. 덮어썼다면 결과 기록의 `requested`에 남기고, 실제 실행 모델을 확인할 수 없으면 `observed`는 `unknown`으로 둔다.

## 완료 판정

- 서브에이전트가 응답을 끝냈다는 사실만으로 완료로 보지 않는다. 반환된 명령·종료 코드·증거 파일을 직접 열어 AC와 대조한 뒤에 완료로 기록한다.
- 체크리스트에 미완료 항목이 남았으면 같은 작업자를 이어서 호출하되, 같은 작업의 연속 호출이 2~3회에 이르면 멈추고 원인을 검토한다. `tdd-auto-loop`에서는 스킬의 누적 Green·진단 예산이 우선한다.

## 훅

`.claude/settings.json`의 PostToolUse 훅은 Edit·Write·Bash 뒤에 구조도 디자인 검사를 실행한다. 검사가 실패하면 stderr가 전달되니, 기준 문서와 변경 의도를 비교해 원인을 고친다. 훅을 끄거나 검사 기준을 완화해 통과시키지 않는다.
