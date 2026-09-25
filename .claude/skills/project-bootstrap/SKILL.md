---
name: project-bootstrap
description: 독립형 개발 하네스를 새 저장소에 적용하거나 승인된 기술안으로 앱의 최소 실행·검사 기반을 준비할 때 사용한다. 기존 도구를 조사하고 필요한 설정만 병합한다.
---

# project-bootstrap

이 스킬을 실행할 때는 먼저 `.agents/skills/project-bootstrap/SKILL.md`를 Read로 읽고, 그 파일이 지정한 절차와 읽기 범위를 그대로 따른다.

- 원본이 지정한 문서 절은 `node scripts/read-section.mjs <문서> "## 제목"`으로 그 절만 읽는다. Read는 파일 전체를 불러와 큰 방법론 문서 하나로 수만 토큰을 쓰기 때문이다.
- 실제 탐색·수정·테스트는 `CLAUDE.md`의 역할 배정에 따라 서브에이전트에 맡긴다.
- 이 파일은 Claude Code 진입점일 뿐이다. 절차 본문은 Codex와 함께 쓰는 원본에서만 관리한다.
