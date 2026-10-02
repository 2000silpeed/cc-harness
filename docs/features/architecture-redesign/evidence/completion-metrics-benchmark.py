"""Bounded local CLI A/B measurement; no model calls or repository writes outside evidence."""

import hashlib
import json
import os
import pathlib
import resource
import shutil
import statistics
import subprocess
import sys
import tempfile
import time


ROOT = pathlib.Path(__file__).resolve().parents[4]
EVIDENCE = pathlib.Path(__file__).resolve().parent
DATASET_PATH = ROOT / "tests/fixtures/handoff-evaluations.json"
FIXTURE = pathlib.Path("/var/folders/bc/dgnqfptd3g980z9ybm8kw5fh0000gn/T/ar01-baseline-Nyvjga")
FIXTURE_REV = "7cfde09197911b026e8422e155b11f451792e479"
OLD_REV = "ae9ff54c33518b77fc0de18feb217660303ac739"
OLD_SHA = "19823e889fa3e3db7a74b98610f8efbe8fd4412248860d7cf313b4176b84aefe"
NEW_SHA = "b9c64fb48edf85a94eb42a2cc5698f8854431c596db485fd087bc79f7dab031b"
CORE_SHA = "824c40fa8c7a677125945f8188a1e3bb8d57f9c110286ce607f80b2e82e8e283"
SEMANTIC = {"decision", "reason", "resume_condition", "budget", "next_skill", "next_action", "transfer", "handoff_id", "idempotent", "launch_allowed", "error"}
CONFIG = ("scope.md", "rollover.md", "stage.md", "contract.md", "evidence.json", "tracked.txt")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def command(argv, cwd, env=None):
    start_usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    start = time.perf_counter_ns()
    proc = subprocess.run(argv, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    wall = time.perf_counter_ns() - start
    end_usage = resource.getrusage(resource.RUSAGE_CHILDREN)
    return proc, {"wall_ns": wall, "child_user_us": round((end_usage.ru_utime - start_usage.ru_utime) * 1e6), "child_system_us": round((end_usage.ru_stime - start_usage.ru_stime) * 1e6)}


def checked(argv, cwd):
    proc, _ = command(argv, cwd)
    if proc.returncode:
        raise RuntimeError(f"{argv[0]} exited {proc.returncode}: {proc.stderr.decode(errors='replace')[:400]}")
    return proc.stdout


def projected_record(record):
    return {"status": record["status"], "sequence": record["sequence"],
            "checkpoint": {"next_action": record["checkpoint"]["next_action"]},
            "task": {"used_rollovers": record["task"]["used_rollovers"]},
            "budgets": {"green": {"used": record["budgets"]["green"]["used"]},
                        "diagnostic": {"used": record["budgets"]["diagnostic"]["used"]},
                        "rework_count": record["budgets"]["rework_count"]},
            "rollover": {"claim": record["rollover"]["claim"], "receipt": record["rollover"]["receipt"]}}


def measure(version, entry, cli, node, env):
    setup_start = time.perf_counter_ns()
    with tempfile.TemporaryDirectory(prefix="completion-metrics-case-") as temporary:
        temporary = pathlib.Path(temporary)
        checkout = temporary / "fixture"
        checked(["git", "clone", "--quiet", "--no-local", str(FIXTURE), str(checkout)], ROOT)
        (checkout / "tracked.txt").write_bytes(b"after\n")
        state = checkout / "docs/features/example/session-handoff.json"
        state.parent.mkdir(parents=True)
        before_record = entry["input"].get("previous") or entry["input"].get("record")
        state.write_text(json.dumps(before_record) + "\n")
        input_file = temporary / "input.json"
        operation = entry["operation"]
        if operation == "prepare":
            input_file.write_text(json.dumps(entry["input"]["input"]) + "\n")
            args = ["prepare", "--input", str(input_file), "--state", str(state)]
        elif operation == "decide":
            args = ["decide", "--state", str(state), "--root", str(checkout)]
            session = entry["input"].get("context", {}).get("sessionId")
            if session:
                args += ["--session-id", session]
        else:
            context = entry["input"]["context"]
            args = [operation, "--state", str(state), "--handoff-id", context["handoffId"], "--executor-id", context["executorId"]]
            if operation == "receipt":
                args += ["--session-id", context["sessionId"]]
        config_before = {name: digest((checkout / name).read_bytes()) for name in CONFIG}
        state_before = json.loads(state.read_text())
        input_before = input_file.read_bytes() if operation == "prepare" else None
        setup_ns = time.perf_counter_ns() - setup_start
        proc, timing = command([node, str(cli), *args], checkout, env)
        state_after = json.loads(state.read_text())
        config_after = {name: digest((checkout / name).read_bytes()) for name in CONFIG}
        input_same = operation != "prepare" or input_before == input_file.read_bytes()
        try:
            result = (json.loads(proc.stdout) if proc.stdout else
                      {"decision": "ERROR", "error": proc.stderr.decode().strip()})
            observation = {"result": {key: value for key, value in result.items() if key in SEMANTIC},
                           "record_before": projected_record(state_before),
                           "record_after": projected_record(state_after),
                           "input_unchanged": input_same}
            if "transition" in entry["expected_observation"]:
                observation["transition"] = {"changed": state_before != state_after}
            semantic_ok = observation == entry["expected_observation"]
        except (ValueError, KeyError, TypeError) as error:
            semantic_ok = False
            observation = {"parse_error": str(error)}
        expected_exit = 1 if entry["expected_observation"]["result"]["decision"] == "ERROR" else 0
        return {"version": version, "case_id": entry["case_id"], "operation": operation,
                "setup_ns": setup_ns, **timing, "exit_code": proc.returncode,
                "expected_exit_code": expected_exit, "stdout_bytes": len(proc.stdout),
                "stderr_bytes": len(proc.stderr), "stdout_sha256": digest(proc.stdout),
                "stderr_sha256": digest(proc.stderr), "semantic_ok": semantic_ok,
                "config_unchanged": config_before == config_after,
                "input_unchanged": input_same, "observation": observation}


def summary(rows, version):
    sample = [row for row in rows if row["version"] == version and row["round"] > 0]
    return {"invocations": len(sample), "failures": sum(not row["valid"] for row in sample),
            "wall_ms_median": statistics.median(row["wall_ns"] / 1e6 for row in sample),
            "wall_ms_min": min(row["wall_ns"] / 1e6 for row in sample),
            "wall_ms_max": max(row["wall_ns"] / 1e6 for row in sample),
            "node_cpu_ms_median": statistics.median((row["child_user_us"] + row["child_system_us"]) / 1e3 for row in sample),
            "stdout_bytes_total": sum(row["stdout_bytes"] for row in sample),
            "stderr_bytes_total": sum(row["stderr_bytes"] for row in sample),
            "setup_ms_median": statistics.median(row["setup_ns"] / 1e6 for row in sample)}


def main():
    if len(sys.argv) != 1:
        raise SystemExit("no arguments accepted")
    if checked(["git", "rev-parse", "HEAD"], ROOT).decode().strip() != "58b8e6e6d3479f84404dfc5f41403c2ee85e63f0":
        raise RuntimeError("candidate HEAD drift")
    if checked(["git", "rev-parse", "HEAD"], FIXTURE).decode().strip() != FIXTURE_REV:
        raise RuntimeError("fixture revision drift")
    dataset_bytes = DATASET_PATH.read_bytes()
    dataset = json.loads(dataset_bytes)
    if len(dataset["cases"]) != 14:
        raise RuntimeError("case count drift")
    if digest((FIXTURE / "tracked.txt").read_bytes()) != dataset["cases"][0]["input"]["record"]["state"]["dirty_manifest"][0]["sha256"]:
        raise RuntimeError("fixture dirty content drift")
    old = checked(["git", "cat-file", "-p", f"{OLD_REV}:scripts/session-handoff.mjs"], ROOT)
    new = (ROOT / "scripts/session-handoff.mjs").read_bytes()
    core = (ROOT / "scripts/handoff-core.mjs").read_bytes()
    if (digest(old), digest(new), digest(core)) != (OLD_SHA, NEW_SHA, CORE_SHA):
        raise RuntimeError("source SHA drift")
    node = shutil.which("node")
    if not node:
        raise RuntimeError("node unavailable")
    env = os.environ.copy()
    with tempfile.TemporaryDirectory(prefix="completion-metrics-src-") as temporary:
        source = pathlib.Path(temporary)
        old_dir, new_dir = source / "old", source / "current"
        old_dir.mkdir()
        new_dir.mkdir()
        (old_dir / "session-handoff.mjs").write_bytes(old)
        (new_dir / "session-handoff.mjs").write_bytes(new)
        (new_dir / "handoff-core.mjs").write_bytes(core)
        paths = {"old": old_dir / "session-handoff.mjs", "current": new_dir / "session-handoff.mjs"}
        rows = []
        for round_number in range(6):
            for index, entry in enumerate(dataset["cases"]):
                order = ("old", "current") if (round_number + index) % 2 == 0 else ("current", "old")
                for sequence, version in enumerate(order):
                    row = measure(version, entry, paths[version], node, env)
                    row.update({"round": round_number, "pair_order": sequence, "warmup": round_number == 0})
                    row["valid"] = (row["exit_code"] == row["expected_exit_code"] and row["semantic_ok"]
                                    and row["config_unchanged"] and row["input_unchanged"])
                    rows.append(row)
    pairs = []
    for round_number in range(1, 6):
        for entry in dataset["cases"]:
            old_row, new_row = (next(row for row in rows if row["round"] == round_number and row["case_id"] == entry["case_id"] and row["version"] == version) for version in ("old", "current"))
            pairs.append({"round": round_number, "case_id": entry["case_id"],
                          "valid": old_row["valid"] and new_row["valid"] and old_row["observation"] == new_row["observation"],
                          "wall_ms_delta_current_minus_old": (new_row["wall_ns"] - old_row["wall_ns"]) / 1e6,
                          "node_cpu_ms_delta_current_minus_old": ((new_row["child_user_us"] + new_row["child_system_us"]) - (old_row["child_user_us"] + old_row["child_system_us"])) / 1e3,
                          "output_bytes_delta_current_minus_old": (new_row["stdout_bytes"] + new_row["stderr_bytes"]) - (old_row["stdout_bytes"] + old_row["stderr_bytes"])})
    report = {"schema": 1, "workload": "14-case actual CLI, 1 warmup + 5 paired rounds, alternating order by case/round",
              "versions": {"old_revision": OLD_REV, "old_cli_sha256": OLD_SHA, "candidate_head": "58b8e6e6d3479f84404dfc5f41403c2ee85e63f0", "current_cli_sha256": NEW_SHA, "current_core_sha256": CORE_SHA},
              "fixture": {"git_revision": FIXTURE_REV, "dataset_sha256": digest(dataset_bytes), "dirty_tracked_sha256": digest((FIXTURE / "tracked.txt").read_bytes())},
              "environment": {"node": checked([node, "--version"], ROOT).decode().strip(), "git": checked(["git", "--version"], ROOT).decode().strip(), "platform": sys.platform, "env_sha256": digest(json.dumps(sorted(env.items())).encode())},
              "measure_scope": "wall includes Node CLI and subprocesses; CPU is direct Node child usage only, not Git grandchildren; setup/clone excluded from CLI wall; output bytes are raw stdout+stderr, not model tokens",
              "rows": rows, "pairs": pairs, "summary": {version: summary(rows, version) for version in ("old", "current")}}
    valid_pairs = [pair for pair in pairs if pair["valid"]]
    report["summary"]["pairs"] = {"count": len(pairs), "valid": len(valid_pairs), "failed": len(pairs) - len(valid_pairs),
                                     "median_wall_ms_delta": statistics.median(pair["wall_ms_delta_current_minus_old"] for pair in valid_pairs) if valid_pairs else None,
                                     "median_node_cpu_ms_delta": statistics.median(pair["node_cpu_ms_delta_current_minus_old"] for pair in valid_pairs) if valid_pairs else None,
                                     "output_bytes_delta_total": sum(pair["output_bytes_delta_current_minus_old"] for pair in valid_pairs) if valid_pairs else None}
    output = EVIDENCE / "completion-metrics-raw.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(output), "summary": report["summary"]}, ensure_ascii=False))
    return 0 if len(valid_pairs) == len(pairs) else 1


if __name__ == "__main__":
    raise SystemExit(main())
