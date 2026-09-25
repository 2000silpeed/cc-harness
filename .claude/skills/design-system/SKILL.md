---
name: design-system
description: 디자인 시스템 문서를 새로 작성하거나 다른 프로젝트에 재사용할 때, 또는 기존 화면 스타일을 변경·점검할 때 사용한다. 출처 기반 화면 명세와 공통 기준을 작성하고 대상 환경에 맞는 검사를 연결한다.
---

# design-system

이 스킬을 실행할 때는 먼저 `.agents/skills/design-system/SKILL.md`를 Read로 읽고, 그 파일이 지정한 절차와 읽기 범위를 그대로 따른다.

- 원본이 지정한 문서 절은 `node scripts/read-section.mjs <문서> "## 제목"`으로 그 절만 읽는다. Read는 파일 전체를 불러와 큰 방법론 문서 하나로 수만 토큰을 쓰기 때문이다.
- 실제 탐색·수정·테스트는 `CLAUDE.md`의 역할 배정에 따라 서브에이전트에 맡긴다.
- 이 파일은 Claude Code 진입점일 뿐이다. 절차 본문은 Codex와 함께 쓰는 원본에서만 관리한다.
