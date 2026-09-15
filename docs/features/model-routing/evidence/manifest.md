# 시작 상태 manifest

- HEAD: `fc0b234bfbc14656d9d3f97728f0467ab4179cab`
- 시작 dirty: `?? docs/features/`
- command: `git status --short && git rev-parse HEAD && shasum -a 256 docs/features/model-routing/{interview,prd,spec-fixed,spec-original}.md`
- exit: 0

| 파일               | SHA-256                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `interview.md`     | `ac7b0a4fc1f22a12ff468d4f3b287e784bb165e2614c08e7a3c352656bba7ddc` |
| `prd.md`           | `483ad809db4a0e6d153239ad7a662a4d0ff430bd096195a48c8ff8e59616fd94` |
| `spec-fixed.md`    | `15545bd8e8cfea5d7cd3a8545850d0a7f086737af124005f8867a7afcd3efe53` |
| `spec-original.md` | `73c7d4390d1da85b3921b145bbdc638d086d32aa0a943c9cd956b619382d2657` |

## Current evidence

- canonical raw original: `verifier-adaptive-original.txt`, SHA-256 `5f81090be217f0a0917584dfb970b97ed8865dc837933238ce67552768c25a9c`, 14293 bytes. `spec-adaptive-original.md` links to this file so Prettier cannot alter its bytes.
- shape Red: `shape-red.stdout-stderr.log`, SHA-256 `39fde85fe0c22435ebd8b32be81eaaaea778e5415c52814d876aa66793bd3ff5`, exit 1.
- shape Green: `shape-green.stdout-stderr.log`, SHA-256 `28d47e8a039a25544fab5d350f73818629cf6352484e2c84908d676126245e9e`, exit 0.
- lint/harness raw logs: `shape-lint.stdout-stderr.log`, `shape-harness.stdout-stderr.log`, both exit 0.
- final `npm run check`: `final-check.stdout-stderr.log`, exit 0, SHA-256 `6340eeb72a423dad4062ea4b46927eaabc8d9939e95ad2c5caca996df20cbdb3`.
- checked core hashes: templates `3ddb830eaa3c52082845a7f7fdc142ce45766b8fa6967005eeefb67af7830f9f`; delivery `130fd1cff134087837d6fda6cd83b108e51dfd14a1080164abd99e9a8e95b556`; lifecycle `d8c1f0ad8409ee936d9bbd25e9c1b3e5cef3c09d916abc2bbf069f345c2cbb3b`; auto-loop `38909fc943d0f35e502f6c8cfde0c0abbfe4ede18bca7735eb995546d850149f`; portability test `d83f98146415287b52ae0ab8d9758b18dfbebc236f9a3761395e33276ff536e6`.
