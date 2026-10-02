# Closure final integrated check

## Source freeze

- Source HEAD: `228fea90465772bc737927f61fd3b560e4076d2a`.
- Precheck manifest: `closure-source-manifest.json` (`ecc7d18044c3d59149b084852c6cad0d3ee91ca5195c15b919bef91a166c27a5` SHA-256). It records Node `v24.14.1`, npm `11.11.0`, Darwin arm64, 31 operational source files, four bookkeeping snapshots, three historical cache experiment evidence files, and two trusted approval originals.
- Operational source includes `package.json`, lockfile, all current `scripts/` and `tests/` files, changed normative documents, the main architecture diagram, the frozen HTML report, v2 contracts, and AR06 measurement outputs. Historical cache candidate sources are recorded separately: they are not operating checker code.
- Frozen report: `docs/architecture/redesign-review-2026-09-30.html` SHA-256 `c7ee83d62698bac14af217c19a062672356b1816370b556c3582f59ef7de5947`.
- Precheck and postcheck hashes match for all 31 operational source files, four bookkeeping files, three experimental evidence files, and two trusted approval originals. No snapshot drift was observed during this check.

## One full check attempt

| Item                       | Observed result                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Command                    | `npm run check`                                                                                       |
| Start (UTC)                | `2026-10-02T08:14:13.532963+00:00`                                                                    |
| End (UTC)                  | `2026-10-02T08:14:15.159817+00:00`                                                                    |
| Duration                   | `1.627` seconds                                                                                       |
| Exit code                  | `1`                                                                                                   |
| Raw combined stdout/stderr | `closure-final-check.log`, SHA-256 `17cbc09619c81e2b108e99c1b04fa5e7d13445083019e864cc118cc1e295fadf` |
| Completed check stage      | `npm run lint` failed; downstream stages were not started because the script uses `&&`                |

ESLint reported **28 errors, 0 warnings**, all in two untracked files outside the closure owner's scope:

- `harness-map/harness-map.html`: 14 errors, including unused variables, empty blocks, and assignments never subsequently used.
- `harness-map/template.html`: 14 errors of the same classes.

The check was **not green**. The unowned files were preserved without editing, formatting, staging, or excluding them. Because lint stopped the command, this attempt gives no result for `design:check`, `harness:check`, `format:check`, tests, handoff evaluation, or typecheck. Repeating the entire command against the same state would reproduce the known first-stage failure; a new attempt needs an owner-approved resolution for `harness-map/` and a fresh source manifest.

The preceding AR04 portability regression had two attempts in this closure work: the initial run found a nonportable source-only diagram link, and the targeted rerun passed after that link was fixed. This does not substitute for the final integrated check.
