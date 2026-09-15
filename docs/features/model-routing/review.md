# Independent AC review — MR-IMP-01

- Reviewer: separate verifier subagent `/root/adaptive_independent_verifier`; a different worker implemented the canonical nine-file diff.
- Review base: `fc0b234bfbc14656d9d3f97728f0467ab4179cab`. The four planning documents were already untracked; the portability-test change began with the worker's Red step. README is the explicitly allowed ninth-file test-description synchronization.
- Canonical source: [verifier-adaptive-original.txt](evidence/verifier-adaptive-original.txt), 14,293 bytes, SHA-256 `5f81090be217f0a0917584dfb970b97ed8865dc837933238ce67552768c25a9c`. [spec-adaptive-original.md](spec-adaptive-original.md) intentionally links to that raw source rather than duplicating it.
- Reviewed hashes: test `d83f98146415287b52ae0ab8d9758b18dfbebc236f9a3761395e33276ff536e6`; templates `3ddb830eaa3c52082845a7f7fdc142ce45766b8fa6967005eeefb67af7830f9f`; delivery `130fd1cff134087837d6fda6cd83b108e51dfd14a1080164abd99e9a8e95b556`; lifecycle `d8c1f0ad8409ee936d9bbd25e9c1b3e5cef3c09d916abc2bbf069f345c2cbb3b`; auto-loop skill `38909fc943d0f35e502f6c8cfde0c0abbfe4ede18bca7735eb995546d850149f`.

## Evidence

- The initial Red is a summary in `red-green.md`; it is not retained as raw runner stdout/stderr.
- Later contract raw logs are retained. `fourth-green.stdout-stderr.log` is 47/47 and its test target matches the current hash above.
- I independently reproduced the exported-target portability regression after the template linked to excluded `docs/features/model-routing/progress.md`: exit 1, 46/47. [verifier-final-recheck.md](evidence/verifier-final-recheck.md) preserves it. The link was removed and the final raw 47/47 result cleared the blocker.
- I independently ran source `node scripts/check-harness.mjs` successfully (15 skills, 32 registered files) and reviewed the focused lint raw log (exit 0). The main-assigned worker then ran the full `npm run check` successfully; the feature-local raw log is `evidence/final-check.stdout-stderr.log`.

| AC    | Verdict | Evidence                                                                                                                                                                                                                                                               |
| ----- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | pass    | Process Routing selects `compact`/`standard`/`intensive`; Model Routing selects worker/diagnostic/verifier roles. The policy distinguishes model capability from harness capability.                                                                                   |
| AC-02 | pass    | `compact` requires confirmed local blast radius; unknown impact and authority/security/data/STOP work cannot be downgraded by file or diff size.                                                                                                                       |
| AC-03 | pass    | STOP/user gate precede routing; automatic Green budget is bounded; no-progress and three failures STOP. The action matrix and diagnostic trace/new-worker/user-gate/STOP outcomes are explicit.                                                                        |
| AC-04 | pass    | Reuse first compares low-cost relevant code, contract/AC, test, command, environment, and checkpoint metadata; only uncertain scope is revalidated.                                                                                                                    |
| AC-05 | pass    | NEW/ADOPT/RESUME preserve `legacy-unknown`, retain safeguards, and keep mandatory STOPs. Ratchet identity A replaced by B is regression despite equal counts.                                                                                                          |
| AC-06 | pass    | Both JSON examples parse to the same reusable core: revision, contract-hash entry, evidence validity, one checkpoint, explicit attempts/retry, diagnostic trace, failure current/history, and unknown/unavailable fields. The 47-test regression checks both examples. |
| AC-07 | pass    | The regression preserves project-owned files and all-or-nothing conflicts. The independently observed exported-target regression was fixed and final 47/47 passed.                                                                                                     |

## Dogfood accounting and limits

This was authorized finite **manual `tdd-loop` maintenance**, not `tdd-auto-loop`: four changed-input Green passes and three retries after the first Green. The three post-review correction cycles repaired metadata/actions, schema alignment, and final policy/portability. The automatic three-attempt STOP remains unchanged and was not bypassed.

No product/runtime code or dependency changed, so product E2E, a new security scan, and refactor work are not applicable. This review verifies the existing installer conflict/symlink safeguards and STOP/permission rules. The completed `npm run check` is a local harness integration check; it is not product E2E, remote CI, production ADOPT, a live backend routing trace, or usage/cost measurement.

## Independent conclusion

`ac_passed=true` for the approved documentation, portability-regression, and evidence-contract scope. Actual backend model selection, runtime role isolation beyond this separate verifier assignment, full escalation execution, production ADOPT, and token/cost/quality outcomes remain `unverified`.
