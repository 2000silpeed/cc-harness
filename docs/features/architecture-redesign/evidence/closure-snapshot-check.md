# Closure snapshot integrated check

## Isolation and source identity

- Root working tree HEAD: `228fea90465772bc737927f61fd3b560e4076d2a`. The separate root `npm run check` attempt remains recorded in `closure-final-check.md` and `closure-final-check.log`: exit `1` at ESLint from 28 errors in the untracked, unowned `harness-map/` files.
- A temporary directory with the `cc-harness-redesign-closure-` prefix received current bytes of 133 Git tracked files and 17 new files under `docs/features/architecture-redesign/`. It excluded the untracked `harness-map/` and `docs/features/trusted-approval/` directories. No Git repository was initialized there.
- The snapshot linked the existing root `node_modules` directory. Both checks therefore used the same installed dependencies and `package-lock.json`; `npm ci` was not needed and no dependency was added. The snapshot's 31 operational files matched the current root bytes before the recovery run. Scripts, tests, package files, normative docs, diagram, v2 contracts, measurement outputs, and the HTML report were in that comparison.
- The original root precheck manifest is retained unchanged. Four v2 contract documents changed after that root attempt for independent G4/G5 closure. Their hashes in the snapshot and current root matched during the recovery run: `spec-fixed-v2.md` `af3ab0e05b2aa703a062f420c7a3a62320fc36de9ebb4717dd315d9be4b68085`, `prd-v2.md` `6f76066e1f5087f83ca44e5d08005b97c35a1b083aaf5edae32d20136dde3c05`, `issues-closure.md` `0de5fdfe7d70405242ee3e713d6bd2ec809041750ac5d0c5db3b942892db46df`, and `closure-scenarios.md` `7dcf9e31df051d920cd08b8c555f400f2afc2169f3ae2990af7f4f9f0e41bb90`.

## Attempts in the isolated snapshot

| Attempt | Command and result                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1       | `npm run check`, exit `1`, `3.297` seconds, 2026-10-02 08:16:02–08:16:05 UTC. Lint, design check (84 declarations), and harness check (15 skills, 62 registered files) passed; format check stopped on `evidence/ar05-anchors.md`.                                                                                                           | `closure-snapshot-check-1.log`, SHA-256 `6bc53f0704d065260542523a0aba821f4112359b7c8d1e59ab459d25a6bcc190` |
| 2       | After the AR-05 owner formatted only `evidence/ar05-anchors.md` (new SHA-256 `6d4c9209b29553f1450ed7ab3916e34ed01008e3d119ff65b80c1fedc6eb462b`), that file's current bytes replaced its snapshot copy. The 31 operational files still matched root. `npm run check` then exited `0` in `105.396` seconds, 2026-10-02 08:18:38–08:20:23 UTC. | `closure-snapshot-check-2.log`, SHA-256 `0c7c54b12560af0455fb7ce5e8b7099f898481c20c376c6d4100984113dd379f` |

Recovery attempt 2 passed ESLint, design check (84 declarations), harness check (15 skills and 62 registered files), Prettier, Vitest (4 files, 176 tests), handoff evaluation (`failures: []`), and TypeScript typecheck. All 31 snapshot operational source hashes were unchanged after the check.

## Result boundary and subsequent edits

The root working tree's whole check remains **failed** because the excluded unowned `harness-map/` files are still present. The isolated snapshot's whole check is **green for the copied project source**. These are distinct results.

During snapshot attempt 2, the report owner changed only historical labeling and explanatory text in the root HTML report. The tested snapshot used report SHA-256 `c7ee83d62698bac14af217c19a062672356b1816370b556c3582f59ef7de5947`; the later root HTML SHA-256 is `3879b98a53fb7ca9ab4b7e83ff8f1723898d3fda51640f295f2006b68deceee6`. This was the only root-versus-snapshot difference among the 31 operational files at check completion. Root `progress.md` and `evidence/closure-contract.md` also changed afterward as status bookkeeping. The current HTML revision was not included in the green snapshot run and needs its own scoped presentation check.

The temporary snapshot was removed after evidence capture; the root source, unowned directories, and original root failure logs were not edited by this check.
