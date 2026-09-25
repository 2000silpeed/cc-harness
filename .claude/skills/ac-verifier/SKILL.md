---
name: ac-verifier
description: 구현이 이슈의 Acceptance Criteria를 실제로 충족하는지 테스트 통과 여부와 별개로 검토할 때 사용한다. 가능하면 구현자와 분리한 검증자가 수행한다.
---

# ac-verifier

이 스킬을 실행할 때는 먼저 `.agents/skills/ac-verifier/SKILL.md`를 Read로 읽고, 그 파일이 지정한 절차와 읽기 범위를 그대로 따른다.

- 원본이 지정한 문서 절은 `node scripts/read-section.mjs <문서> "## 제목"`으로 그 절만 읽는다. Read는 파일 전체를 불러와 큰 방법론 문서 하나로 수만 토큰을 쓰기 때문이다.
- 실제 탐색·수정·테스트는 `CLAUDE.md`의 역할 배정에 따라 서브에이전트에 맡긴다.
- 이 파일은 Claude Code 진입점일 뿐이다. 절차 본문은 Codex와 함께 쓰는 원본에서만 관리한다.
