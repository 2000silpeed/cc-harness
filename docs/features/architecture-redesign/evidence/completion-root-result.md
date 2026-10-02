# Original root check attempt

- Status: failed at the first stage; this is not a full integrated pass.
- Source HEAD: `58b8e6e6d3479f84404dfc5f41403c2ee85e63f0`; tracked tree: `855137f2e72eea88513b2a498cbf0085bc8f322f`. Tracked files were clean before and after.
- Existing untracked inputs: `docs/features/trusted-approval/spec-fixed.md`, `spec-original.md`, and `harness-map/`. Their file hashes are in `completion-root-untracked-before.sha256` (manifest SHA-256 `0706cab7578c961c0726bca81857000f3dcc1f2e37eb319b042268dee2715854`); the same hashes matched after execution. None was edited.
- Environment: Darwin arm64, Node `v24.14.1`, npm `11.11.0`.
- Command: `npm run check` in the original repository root, once, 2026-10-02 13:22:11–13:22:13 UTC; exit code `1`.
- Combined stdout/stderr: `completion-root-check.log`, SHA-256 `17cbc09619c81e2b108e99c1b04fa5e7d13445083019e864cc118cc1e295fadf`.
- Failure: `npm run lint` reported 28 errors, 0 warnings. `harness-map/harness-map.html` and `harness-map/template.html` each have 14 errors: unused names, two empty blocks, and two useless assignments. The root lint glob covers `**/*.{js,mjs,ts,tsx,html}` and the current ESLint ignores do not exclude this nested untracked project.
- `design:check`, `harness:check`, `format:check`, Vitest, handoff evaluation, and typecheck did not start because the check script joins stages with `&&`.
- Ownership: the two failing HTML files belong to another task. No source correction or lint configuration change was made. Their owner must resolve the 28 actual errors, or the main agent must establish and approve a legitimate root-check scope policy for this nested project; an ignore solely to conceal errors is not justified.

## Read-only recovery investigation

- `harness-map/` is a nested Git repository at HEAD `91e85bcb1c57fe86e2ca82b62270a8d570276a9b`, with no nested `AGENTS.md`. Its tracked `template.html` is the source; `build.py` inserts `harness.json` into the template to create ignored `harness-map.html`. The current generated file exactly matches that build relationship.
- The template SHA-256 is `550e436b799654edf6cb3510f108ec117e24c2a45d0fdec05a50b2019f9ed50b`; generated HTML SHA-256 is `f3e746e6e50fcdb87a87ce90687781d1079acb79c7042442c52bbad07f9efa82`.
- The 14 errors in each file map to unused `locIndexBy`, `model`, `idPrefix`, `vt`, `eff`, five unused catch parameters, two empty catches, and two unused assignments to `m`. The proposed behavior-preserving edits remove only those unused bindings and retain the required `m` capture for `case` and `facts` links.
- Review-only unified diff: `/tmp/completion-root-harness-map-minimal.patch`, SHA-256 `ad3b3591979f173da332e36f2bba34b6f6137e8361658c4898f25f0d6de6691c`; `git apply --check` exited `0`. It was not applied.
- A read-only targeted `prettier --check` on both HTML files exited `1` and reported formatting issues in both. The root `format:check` will require an owner-approved response after lint passes; no second root check was run.
