# Independent final recheck

## 2026-09-15 portability failure

- command: `npx vitest run tests/unit/harness-portability.test.ts`
- cwd: `/Users/sungwoon/ai-projects/cc-harness`
- exit: `1` (46 passed, 1 failed of 47)
- failing case: `exports the actual registry into an empty target and validates without product files`
- observed cause: distributable `docs/harness/templates.md` linked to `../features/model-routing/progress.md`. The real source repository contains that feature record, but the installer deliberately excludes `docs/features/`; the empty exported target therefore failed `check-harness` on the dangling link.
- verdict: portability regression. The source-only `node scripts/check-harness.mjs` result did not clear this failure because it checks a repository where the feature record exists.
- required correction: remove the feature-specific link from the distributed template and repeat the focused portability regression. This result is a real fourth changed-input Green gate for the authorized manual `tdd-loop` maintenance; it is not an auto-loop attempt or a test-only rerun.

## Corrected portability evidence

- canonical template no longer links to the excluded feature record; the only `progress.md` reference is generic template prose.
- current template SHA-256: `3ddb830eaa3c52082845a7f7fdc142ce45766b8fa6967005eeefb67af7830f9f`.
- raw result: `fourth-green.stdout-stderr.log`, SHA-256 `697fb492316980535e1ed2e63ff63d304763c1f9fbb5d58acd8b9d211671070f`, exit `0`, 47/47.
- result: portability blocker cleared. This is the fourth changed-input Green in the finite manual `tdd-loop` maintenance. The automatic `tdd-auto-loop` three-attempt STOP was not entered or relaxed.
