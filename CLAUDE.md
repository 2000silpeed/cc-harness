# cc-harness · Claude Code 협업 지침

@AGENTS.md

## Claude Code에서 읽는 방법

- 위 AGENTS.md가 공통 기준이다. 이 파일은 Codex 표기를 Claude Code 도구로 옮기는 대응만 적는다.
- 스킬은 `/harness-cycle`처럼 호출한다. `.claude/skills/<이름>/SKILL.md`는 `.agents/skills/<이름>/SKILL.md`를 가리키는 진입점이다. 절차는 원본만 고치고, 이름·설명이 바뀌면 진입점도 같이 맞춘다. Claude Code 기본 명령과 이름이 겹치는 스킬은 진입점에 `harness-`를 붙인다. `security-review`는 `/harness-security-review`로 호출하며, 문서의 `/security-review`도 이렇게 읽는다.
- 문서의 `$스킬명`은 `/스킬명`, `apply_patch`는 Edit·Write, `agents/openai.yaml`의 `allow_implicit_invocation: false`는 진입점의 `disable-model-invocation: true`로 읽는다.
- 오케스트레이션 정책의 작업자와 검증자는 Agent 도구로 만든 서브에이전트다. 작업자와 검증자는 서로 다른 서브에이전트로 배정하고, 서브에이전트 안에서 다시 위임하지 않는다. 요청 모델·effort와 실제 관측값은 구분해 기록한다.
- `.claude/settings.json`의 PostToolUse 훅이 Edit·Write·Bash 뒤에 구조도 디자인 검사를 실행한다. 실패하면 stderr가 전달되며, 이를 우회하지 않는다.
