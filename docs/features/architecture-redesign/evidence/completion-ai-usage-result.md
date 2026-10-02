# AI source-reading usage experiment

Status: six of six planned model trials completed. The earlier sandbox preflight failed before any model event and is excluded from the six-trial sample. This measures one fixed code-reading question only.

## Inputs and execution

- Setup and pinned hashes: [completion-ai-usage-setup.json](completion-ai-usage-setup.json). `python3 docs/features/architecture-redesign/evidence/completion-ai-usage-check.py` exited 0 before dispatch: source and shared-input hashes, read-only snapshots, response schema, and trial order passed.
- Trial order: old, current, current, old, old, current. Every trial used a fresh sequential `codex exec --ephemeral --sandbox read-only` process, the same byte-identical prompt and `AGENTS.md`, the same response schema, and a four-command cap in the trial instructions. CLI command counts were 2–3.
- Requested model and effort: `gpt-5.6-sol`, `medium`. Installed CLI observed at dispatch: `codex-cli 0.157.0`. The CLI JSONL did not emit actual model or effort, so both observed values are **unknown**. The dispatcher verified ChatGPT subscription login before execution; no API-key billing was used. The six trials ran on macOS with the same local CLI/environment.
- Source variants: old `ae9ff54c33518b77fc0de18feb217660303ac739`, current working-tree snapshot at setup. The exact source and input SHA-256 values are in the setup and [result JSON](completion-ai-usage-result.json). Snapshots were not changed or executed during the experiment.

## Trial results

`input` includes `cached input`; it is the CLI's reported total, not a bill. All six answers matched `decision=RECEIPT_RECORDED`, `idempotent=true`, `used_rollovers_delta=0`, and `state_json_rewritten=false`. All six answers included valid source paths and line ranges. The state JSON field excludes the CLI's transient lock file.

| Trial | Variant | Exit |   Input | Cached input | Cache write input | Output | Reasoning output | Wall (s) | Commands | Oracle |
| ----- | ------- | ---: | ------: | -----------: | ----------------: | -----: | ---------------: | -------: | -------: | ------ |
| 01    | Old     |    0 | 106,205 |       75,776 |                 0 |    610 |              282 |    21.41 |        3 | Match  |
| 02    | Current |    0 |  78,711 |       49,024 |                 0 |    537 |              251 |    19.85 |        2 | Match  |
| 03    | Current |    0 |  75,007 |       59,392 |                 0 |    416 |              126 |    14.39 |        2 | Match  |
| 04    | Old     |    0 |  74,718 |       58,112 |                 0 |    422 |              159 |    14.17 |        2 | Match  |
| 05    | Old     |    0 | 105,849 |       94,976 |                 0 |    601 |              273 |    19.66 |        3 | Match  |
| 06    | Current |    0 | 119,527 |       82,560 |                 0 |    504 |              158 |    19.89 |        3 | Match  |

Old mean input was 95,591 tokens and current mean input was 91,082 tokens (4.7% lower). Old mean wall time was 18.41 s and current mean wall time was 18.04 s (2.0% lower). With three samples per group, substantial overlap, and variable cache use, these descriptive differences do not establish a reliable speed or token saving. The old/current oracle outcome was equal, so this task does not show a behavior-quality improvement. No actual subscription charge record was available; billing cost is **unknown**, with no API tariff projection.

The prior default-sandbox preflight exited 1 in 0.26 s: `state_5.sqlite` was read-only and the in-process app-server returned EPERM. It produced zero model events. Its exact zero-byte stdout and stderr are preserved as [preflight stdout](completion-ai-usage-trial-00-preflight.stdout.jsonl) and [preflight stderr](completion-ai-usage-trial-00-preflight.stderr.log). The later approved retry used the same prepared payload and CLI options with the required execution permission.

For each trial, `completion-ai-usage-trial-NN.*` holds the exact stdout JSONL, stderr/time log, final answer, UTC start/end, and exit code. [result JSON](completion-ai-usage-result.json) records every raw file's SHA-256 and size, every `turn.completed` usage object, command count, answer, oracle comparison, and path/line validation. The JSONL does not provide actual model/effort telemetry. The source-reading workload cannot support a whole-project performance, quality, or cost claim.
