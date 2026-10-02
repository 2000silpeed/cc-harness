import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const corpusPath = resolve(root, "tests/fixtures/handoff-evaluations.json");
const baselinePath = resolve(root, "tests/fixtures/handoff-evaluations-baseline.json");
const runnerPath = resolve(root, "scripts/evaluate-handoff.mjs");
type EvaluationRow = {
  case_id: string;
  pass: boolean;
  comparable: boolean;
  changed: boolean | null;
  input_sha256: string;
  local_consistency: string;
  approval_provenance: string;
};

function temporaryJson(value: unknown) {
  const path = resolve(mkdtempSync(resolve(tmpdir(), "handoff-eval-")), "input.json");
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function run(dataset = corpusPath, baseline = baselinePath) {
  const child = spawnSync(
    process.execPath,
    [runnerPath, "--dataset", dataset, "--baseline", baseline],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  return { status: child.status, report: JSON.parse(child.stdout), stderr: child.stderr };
}

describe("offline handoff evaluator", () => {
  it("records stable decisions with matching pre-change observations and no authority claim", () => {
    const first = run();
    const second = run();
    expect(first.status).toBe(0);
    expect(second.report).toEqual(first.report);
    expect(first.report.pass).toBe(true);
    expect(first.report.cases.length).toBeGreaterThanOrEqual(8);
    expect(first.report.cases.every((row: EvaluationRow) => row.pass && row.comparable)).toBe(true);
    expect(first.report.cases.every((row: EvaluationRow) => row.changed === false)).toBe(true);
    expect(first.report.cases.every((row: EvaluationRow) => row.input_sha256?.length === 64)).toBe(
      true,
    );
    const selfDeclared = first.report.cases.find(
      (row: EvaluationRow) => row.case_id === "approval-self-declared",
    );
    expect(selfDeclared.local_consistency).toBe("pass");
    expect(selfDeclared.approval_provenance).toBe("not_checked");
    expect(
      first.report.cases.find((row: EvaluationRow) => row.case_id === "prepare-idempotent")
        .actual_decision,
    ).toBe("PREPARED");
  });

  it("fails on duplicate case IDs, missing cases, changed input and missing baseline", () => {
    const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
    const duplicate = structuredClone(corpus);
    duplicate.cases.push(structuredClone(duplicate.cases[0]));
    const duplicateResult = run(temporaryJson(duplicate));
    expect(duplicateResult.status).not.toBe(0);
    expect(duplicateResult.report.failures).toContainEqual(
      expect.objectContaining({ case_id: duplicate.cases[0].case_id, reason: "duplicate_case_id" }),
    );

    const missing = structuredClone(baseline);
    missing.cases.pop();
    const missingResult = run(corpusPath, temporaryJson(missing));
    expect(missingResult.status).not.toBe(0);
    expect(missingResult.report.failures).toContainEqual(
      expect.objectContaining({ reason: "missing_baseline_case" }),
    );

    const missingDatasetCase = structuredClone(corpus);
    missingDatasetCase.cases.pop();
    const missingDatasetResult = run(temporaryJson(missingDatasetCase));
    expect(missingDatasetResult.status).not.toBe(0);
    expect(missingDatasetResult.report.failures).toContainEqual(
      expect.objectContaining({ reason: "missing_dataset_case" }),
    );

    const mismatch = structuredClone(baseline);
    mismatch.cases[0].input_sha256 = "0".repeat(64);
    const mismatchResult = run(corpusPath, temporaryJson(mismatch));
    expect(mismatchResult.status).not.toBe(0);
    expect(mismatchResult.report.failures).toContainEqual(
      expect.objectContaining({ case_id: corpus.cases[0].case_id, reason: "input_hash_mismatch" }),
    );

    const changedInput = structuredClone(corpus);
    changedInput.cases[0].input.record.task.objective = "changed input";
    const changedInputResult = run(temporaryJson(changedInput));
    expect(changedInputResult.status).not.toBe(0);
    expect(changedInputResult.report.failures).toContainEqual(
      expect.objectContaining({ case_id: corpus.cases[0].case_id, reason: "input_hash_mismatch" }),
    );

    const noBaseline = spawnSync(process.execPath, [runnerPath, "--dataset", corpusPath], {
      cwd: root,
      encoding: "utf8",
    });
    expect(noBaseline.status).not.toBe(0);
    expect(JSON.parse(noBaseline.stdout).failures).toContainEqual(
      expect.objectContaining({ reason: "missing_baseline" }),
    );
  });

  it("marks a comparable baseline decision change without hiding the current decision", () => {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
    baseline.cases[0].actual_decision = "STOP_ACTIVE";
    const result = run(corpusPath, temporaryJson(baseline));
    expect(result.status).toBe(0);
    expect(result.report.cases[0]).toEqual(
      expect.objectContaining({
        actual_decision: "PHASE_READY",
        baseline_decision: "STOP_ACTIVE",
        changed: true,
        comparable: true,
      }),
    );
  });

  it("never counts rows as passing when baseline metadata is invalid", () => {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
    const invalid = [
      { reason: "invalid_baseline", change: { schema_version: 999 } },
      { reason: "missing_baseline_provenance", change: { source_sha256: null } },
      { reason: "missing_baseline_provenance", change: { observation_method: "" } },
      { reason: "corpus_hash_mismatch", change: { corpus_sha256: "0".repeat(64) } },
    ];
    for (const example of invalid) {
      const result = run(corpusPath, temporaryJson({ ...baseline, ...example.change }));
      expect(result.status).not.toBe(0);
      expect(result.report.failures).toContainEqual(
        expect.objectContaining({ reason: example.reason }),
      );
      expect(result.report.cases.every((row: EvaluationRow) => !row.pass && !row.comparable)).toBe(
        true,
      );
    }
  });
});
