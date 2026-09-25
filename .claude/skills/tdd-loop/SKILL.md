---
name: tdd-loop
description: 승인된 이슈 하나를 실행 권한에 맞는 단계별 검토와 TDD·독립 AC 검증을 거쳐 로컬 완료 또는 PR 준비까지 진행한다.
---

# tdd-loop

이 스킬을 실행할 때는 먼저 `.agents/skills/tdd-loop/SKILL.md`를 Read로 읽고, 그 파일이 지정한 절차와 읽기 범위를 그대로 따른다.

- 원본이 지정한 문서 절은 `node scripts/read-section.mjs <문서> "## 제목"`으로 그 절만 읽는다. Read는 파일 전체를 불러와 큰 방법론 문서 하나로 수만 토큰을 쓰기 때문이다.
- 실제 탐색·수정·테스트는 `CLAUDE.md`의 역할 배정에 따라 서브에이전트에 맡긴다.
- 이 파일은 Claude Code 진입점일 뿐이다. 절차 본문은 Codex와 함께 쓰는 원본에서만 관리한다.
