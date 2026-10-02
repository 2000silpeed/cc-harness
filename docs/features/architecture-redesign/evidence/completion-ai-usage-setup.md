# AI usage A/B source-reading setup

Status: inputs ready; no model trial has run in this preparation. This is one source-reading workload, not a whole-project performance or billing-cost proxy.

The inputs are in `/tmp/completion-ai-usage.tNH9tf`. Before dispatch, run `python3 docs/features/architecture-redesign/evidence/completion-ai-usage-check.py` from repository root; it verifies hashes, read-only bits, schema, and six-trial order without invoking a model. `case-1` contains the exact old CLI source at `ae9ff54c33518b77fc0de18feb217660303ac739`; `case-2` contains the current CLI and its extracted core. Both have byte-identical `AGENTS.md` and `prompt.txt`. The only source difference is the historical implementation versus current implementation. `completion-ai-usage-setup.json` records source/input hashes and the six-trial order. The snapshot files are mode `0444`. Do not run these source files or alter the snapshots during the trial.

## Manual oracle

For an already receipted valid record and replay with the same handoff, executor, and session IDs, with no current-state problem: `decision=RECEIPT_RECORDED`, `idempotent=true`, `used_rollovers_delta=0`, `state_json_rewritten=false`. This field concerns the persisted `session-handoff.json` record, excluding the CLI's transient lock file. In `case-1`, `receipt()` returns before its mutation and `atomicWrite` block (`src/session-handoff.mjs:814-860`). In `case-2`, `receiptHandoff()` returns `changed:false` (`src/handoff-core.mjs:614-649`), so the CLI's conditional `atomicWrite` is skipped (`src/session-handoff.mjs:260-292`). The CLI adds a resume prompt and notice, which are outside the compact answer schema. The oracle comes from manual code reading; it has not been independently reviewed or behaviorally fixture tested here.

## Dispatch boundary

The main dispatcher should first get an independent setup/oracle review signal and verify the installed CLI account uses ChatGPT subscription auth. Do not run this experiment with API-key billing. Check installed CLI model support; `gpt-5.6-sol` is the proposed requested model, not an observed model until trial telemetry confirms it. Keep model, medium effort, CLI version, auth class, environment, prompt, AGENTS, schema, sandbox, and four-command cap matched. Run six fresh sequential sessions in the manifest order; no warmup and no selective exclusions. Use `--ephemeral` and `--sandbox read-only`. No provider calls are made by this setup.

Command for trial `01` (change case and output suffix according to manifest order; run each as a separate fresh process):

```sh
/usr/bin/time -p codex exec \
  -C /tmp/completion-ai-usage.tNH9tf/case-1 \
  --ephemeral --sandbox read-only \
  --model gpt-5.6-sol -c model_reasoning_effort=medium \
  --json --skip-git-repo-check \
  --output-schema /tmp/completion-ai-usage.tNH9tf/response.schema.json \
  - < /tmp/completion-ai-usage.tNH9tf/case-1/prompt.txt \
  > docs/features/architecture-redesign/evidence/completion-ai-usage-trial-01.stdout.jsonl \
  2> docs/features/architecture-redesign/evidence/completion-ai-usage-trial-01.stderr.log
```

The dispatcher must run this from repository root or replace output paths with absolute paths. Save per-trial start/end UTC, exit code, requested and observed model/effort, installed CLI version and auth class, source/input hashes, prompt/AGENTS/schema paths, and environment identity. Preserve every stdout JSONL and stderr stream, including failed trials. Parse every `turn.completed` usage field (input, cached input, cache write if present, output, reasoning) without treating missing fields as zero. Compare oracle correctness and path/line evidence separately from token and wall-time readings. Subscription billing cost is unavailable unless an actual charge record exists; do not project API prices onto it. The old/new code's equal oracle outcome means this workload can measure source-reading token/time effects, not a behavior-quality improvement.
