---
name: tdd-refactor
description: 테스트와 AC 검토를 통과한 구현의 외부 동작을 유지하면서 중복·이름·책임·복잡도·프로젝트 규칙을 개선할 때 사용한다.
---

# tdd-refactor

이 스킬을 실행할 때는 먼저 `.agents/skills/tdd-refactor/SKILL.md`를 Read로 읽고, 그 파일이 지정한 절차와 읽기 범위를 그대로 따른다.

- 원본이 지정한 문서 절만 읽는다. 전체 문서를 읽으면 이후 판단에 쓸 컨텍스트가 줄어든다.
- 실제 탐색·수정·테스트는 `CLAUDE.md`의 역할 배정에 따라 서브에이전트에 맡긴다.
- 이 파일은 Claude Code 진입점일 뿐이다. 절차 본문은 Codex와 함께 쓰는 원본에서만 관리한다.
