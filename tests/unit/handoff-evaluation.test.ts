import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const corpusPath = resolve(root, "tests/fixtures/handoff-evaluations.json");
const baselinePath = resolve(root, "tests/fixtures/handoff-evaluations-baseline.json");
const runnerPath = resolve(root, "scripts/evaluate-handoff.mjs");
const coreUrl = pathToFileURL(resolve(root, "scripts/handoff-core.mjs")).href;

function temporaryJson(value: unknown) {
  const path = resolve(mkdtempSync(resolve(tmpdir(), "handoff-eval-")), "input.json");
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function runnerWithCore(tamper: string) {
  const dir = mkdtempSync(resolve(tmpdir(), "handoff-eval-core-"));
  const runner = resolve(dir, "evaluate-handoff.mjs");
  writeFileSync(runner, readFileSync(runnerPath));
  writeFileSync(
    resolve(dir, "handoff-core.mjs"),
    `import * as core from ${JSON.stringify(coreUrl)};
export const validateRecord = core.validateRecord;
export const decideHandoff = (record, context) => {
  const result = core.decideHandoff(record, context);
  ${tamper}
  return result;
};
export const prepareHandoff = (previous, input) => {
  const transition = core.prepareHandoff(previous, input);
  ${tamper}
  return transition;
};
export const claimHandoff = (record, context) => {
  const transition = core.claimHandoff(record, context);
  ${tamper}
  return transition;
};
export const receiptHandoff = (record, context) => {
  const transition = core.receiptHandoff(record, context);
  ${tamper}
  return transition;
};
`,
  );
  return runner;
}

function run(dataset = corpusPath, baseline = baselinePath, runner = runnerPath) {
  const child = spawnSync(
    process.execPath,
    [runner, "--dataset", dataset, "--baseline", baseline],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  return { status: child.status, report: JSON.parse(child.stdout), stderr: child.stderr };
}

function hasPath(result: ReturnType<typeof run>, caseId: string, path: string) {
  expect(result.status).not.toBe(0);
  expect(result.report.failures).toContainEqual(
    expect.objectContaining({ case_id: caseId, field_path: path }),
  );
}

describe("offline handoff evaluator semantic observations", () => {
  it("compares 14 fixed expected and historical observations with current semantics", () => {
    const first = run();
    expect(first.status).toBe(0);
    expect(first.report.pass).toBe(true);
    expect(first.report.schema_version).toBe(2);
    expect(first.report.cases).toHaveLength(14);
    expect(
      first.report.cases.every(
        (row: { pass: boolean; comparable: boolean; changed: boolean }) =>
          row.pass && row.comparable && !row.changed,
      ),
    ).toBe(true);
    expect(
      first.report.cases.find((row: { case_id: string }) => row.case_id === "receipt-replay")
        .actual_observation.result.idempotent,
    ).toBe(true);
    expect(
      first.report.cases.find((row: { case_id: string }) => row.case_id === "prepare-idempotent")
        .actual_observation.transition.changed,
    ).toBe(false);
    expect(
      first.report.cases.find(
        (row: { case_id: string }) => row.case_id === "approval-self-declared",
      ).approval_provenance,
    ).toBe("not_checked");
    expect(run().report).toEqual(first.report);
  });

  it("reports same-decision current drift at exact semantic field paths", () => {
    const changes = [
      [
        "if (result.decision === 'PHASE_READY') result.next_action = 'wrong';",
        "phase-ready",
        "result.next_action",
      ],
      [
        "if (transition.result.decision === 'RECEIPT_RECORDED') transition.result.idempotent = false;",
        "receipt-replay",
        "result.idempotent",
      ],
      [
        "if (transition.result.decision === 'CLAIMED') transition.record.status = 'prepared';",
        "claim-new",
        "record_after.status",
      ],
      [
        "if (transition.result.decision === 'RECEIPT_RECORDED' && transition.changed) transition.record.task.used_rollovers = 0;",
        "receipt-new",
        "record_after.task.used_rollovers",
      ],
      [
        "if (result.decision === 'STOP_ACTIVE') result.reason = 'wrong';",
        "active-stop",
        "result.reason",
      ],
    ] as const;
    for (const [tamper, caseId, path] of changes) {
      const result = run(corpusPath, baselinePath, runnerWithCore(tamper));
      hasPath(result, caseId, path);
      if (caseId === "active-stop") {
        expect(result.status).toBe(1);
        expect(result.report.failures).toContainEqual(
          expect.objectContaining({
            case_id: "active-stop",
            reason: "candidate_mismatch",
            field_path: "result.reason",
          }),
        );
        expect(
          result.report.cases.find((row: { case_id: string }) => row.case_id === "active-stop")
            .actual_decision,
        ).toBe("STOP_ACTIVE");
      }
    }
  });

  it("rejects missing, null and wrongly typed current semantic fields", () => {
    const changes = [
      "if (transition.result.decision === 'CLAIMED') delete transition.result.idempotent;",
      "if (transition.result.decision === 'CLAIMED') transition.result.idempotent = null;",
      "if (transition.result.decision === 'CLAIMED') transition.result.idempotent = 0;",
    ];
    for (const tamper of changes)
      hasPath(
        run(corpusPath, baselinePath, runnerWithCore(tamper)),
        "claim-new",
        "result.idempotent",
      );
  });

  it("separates baseline drift from candidate mismatch and rejects incomplete expected values", () => {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
    const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
    baseline.cases.find(
      (row: { case_id: string }) => row.case_id === "receipt-replay",
    ).observation.result.idempotent = false;
    hasPath(run(corpusPath, temporaryJson(baseline)), "receipt-replay", "result.idempotent");
    delete corpus.cases.find((row: { case_id: string }) => row.case_id === "phase-ready")
      .expected_observation.result.next_action;
    hasPath(run(temporaryJson(corpus)), "phase-ready", "result.next_action");
  });

  it("rejects invalid baseline schema, provenance, input and missing rows", () => {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
    const v1 = structuredClone(baseline);
    v1.schema_version = 1;
    expect(run(corpusPath, temporaryJson(v1)).report.failures).toContainEqual(
      expect.objectContaining({ reason: "invalid_baseline_schema" }),
    );
    const wrongSha = structuredClone(baseline);
    wrongSha.source_sha256 = "0".repeat(64);
    expect(run(corpusPath, temporaryJson(wrongSha)).report.failures).toContainEqual(
      expect.objectContaining({ reason: "invalid_baseline_provenance" }),
    );
    const wrongCapture = structuredClone(baseline);
    wrongCapture.capture_sha256 = "0".repeat(64);
    hasPath(run(corpusPath, temporaryJson(wrongCapture)), "$baseline", "capture_sha256");
    const missing = structuredClone(baseline);
    missing.cases.pop();
    expect(run(corpusPath, temporaryJson(missing)).report.failures).toContainEqual(
      expect.objectContaining({ reason: "missing_baseline_case" }),
    );
    const wrongInput = structuredClone(baseline);
    wrongInput.cases[0].input_sha256 = "0".repeat(64);
    expect(run(corpusPath, temporaryJson(wrongInput)).report.failures).toContainEqual(
      expect.objectContaining({ reason: "input_hash_mismatch" }),
    );
  });

  it("rejects input mutation even when decision and result fields match", () => {
    const tamper = "if (result.decision === 'PHASE_READY') record.task.objective = 'mutated';";
    hasPath(
      run(corpusPath, baselinePath, runnerWithCore(tamper)),
      "phase-ready",
      "input_unchanged",
    );
  });
});
