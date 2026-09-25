---
name: feature-planner
description: 새 기능의 아이디어를 인터뷰·디자인 연계·PRD/ADR·수직 이슈 계획으로 만들거나 기존 기획을 재개할 때 사용한다. 사용자 결정과 구현 승인 범위의 AI 판단을 구분하고 필요한 게이트 증거를 갖춘다.
---

# feature-planner

이 스킬을 실행할 때는 먼저 `.agents/skills/feature-planner/SKILL.md`를 Read로 읽고, 그 파일이 지정한 절차와 읽기 범위를 그대로 따른다.

- 원본이 지정한 문서 절만 읽는다. 전체 문서를 읽으면 이후 판단에 쓸 컨텍스트가 줄어든다.
- 실제 탐색·수정·테스트는 `CLAUDE.md`의 역할 배정에 따라 서브에이전트에 맡긴다.
- 이 파일은 Claude Code 진입점일 뿐이다. 절차 본문은 Codex와 함께 쓰는 원본에서만 관리한다.
