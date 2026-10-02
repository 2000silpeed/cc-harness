import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  claimHandoff,
  decideHandoff,
  prepareHandoff,
  receiptHandoff,
  validateRecord,
} from "./handoff-core.mjs";

const root = resolve(import.meta.dirname, "..");
const defaultDataset = resolve(root, "tests/fixtures/handoff-evaluations.json");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sourceRevision = "ae9ff54c33518b77fc0de18feb217660303ac739";
const sourceSha256 = "19823e889fa3e3db7a74b98610f8efbe8fd4412248860d7cf313b4176b84aefe";
const captureSha256 = "5098d0c2cac1919c152d450750f39292af54fc90ad2beb27087f394d67d2b22b";
const semanticResultKeys = new Set([
  "decision",
  "reason",
  "resume_condition",
  "budget",
  "next_skill",
  "next_action",
  "transfer",
  "handoff_id",
  "idempotent",
  "launch_allowed",
  "error",
]);
const resultFields = {
  "phase-ready": ["decision", "next_skill", "next_action"],
  "rollover-ready": ["decision", "handoff_id"],
  "active-stop": ["decision", "reason", "resume_condition"],
  "rollover-budget": ["decision"],
  "green-budget": ["decision", "budget"],
  "inflight-activity": ["decision"],
  "approval-self-declared": ["decision", "next_skill", "next_action"],
  "claim-new": ["decision", "idempotent"],
  "claim-replay": ["decision", "launch_allowed"],
  "receipt-new": ["decision", "idempotent"],
  "receipt-replay": ["decision", "idempotent"],
  "receipt-continue": ["decision", "transfer"],
  "prepare-idempotent": ["decision", "handoff_id"],
  "lineage-wrong-predecessor": ["decision", "error"],
};
const args = process.argv.slice(2);
const failure = (caseId, reason, fieldPath) => ({
  case_id: caseId,
  reason,
  ...(fieldPath ? { field_path: fieldPath } : {}),
});

function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`missing value for ${name}`);
  args.splice(index, 2);
  return value;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// The sole semantic projection: CLI decoration, paths and source hashes are outside this scope.
function project(result, before, after, changed, inputUnchanged) {
  const record = (value) => ({
    status: value?.status,
    sequence: value?.sequence,
    checkpoint: { next_action: value?.checkpoint?.next_action },
    task: { used_rollovers: value?.task?.used_rollovers },
    budgets: {
      green: { used: value?.budgets?.green?.used },
      diagnostic: { used: value?.budgets?.diagnostic?.used },
      rework_count: value?.budgets?.rework_count,
    },
    rollover: { claim: value?.rollover?.claim, receipt: value?.rollover?.receipt },
  });
  return {
    result: Object.fromEntries(
      Object.entries(result).filter(([key]) => semanticResultKeys.has(key)),
    ),
    record_before: record(before),
    record_after: record(after),
    input_unchanged: inputUnchanged,
    ...(changed === undefined ? {} : { transition: { changed } }),
  };
}

function evaluate(entry) {
  const { operation, input } = entry;
  const beforeInput = JSON.stringify(input);
  const beforeRecord = structuredClone(input.previous ?? input.record);
  let transition;
  let result;
  try {
    if (operation === "prepare") {
      transition = prepareHandoff(input.previous ?? null, input.input);
      result = { decision: "PREPARED", handoff_id: transition.record.handoff_id };
    } else {
      validateRecord(input.record);
      if (operation === "decide") result = decideHandoff(input.record, input.context ?? {});
      else if (operation === "claim") {
        transition = claimHandoff(input.record, input.context ?? {});
        result = transition.result;
      } else if (operation === "receipt") {
        transition = receiptHandoff(input.record, input.context ?? {});
        result = transition.result;
      } else throw new Error(`unsupported operation: ${operation}`);
    }
  } catch (error) {
    result = { decision: "ERROR", error: error.message };
  }
  const afterRecord = transition?.record ?? input.previous ?? input.record;
  return {
    observation: project(
      result,
      beforeRecord,
      afterRecord,
      transition?.changed,
      beforeInput === JSON.stringify(input),
    ),
    exit_code: result.decision === "ERROR" ? 1 : 0,
  };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkObservation(caseId, value, reason, errors) {
  const problem = (path) => errors.push(failure(caseId, reason, path || "observation"));
  const keys = (object, expected, path) => {
    if (!isObject(object)) {
      problem(path);
      return false;
    }
    for (const key of new Set([...Object.keys(object), ...expected]))
      if (!expected.includes(key) || !Object.hasOwn(object, key))
        problem(path ? `${path}.${key}` : key);
    return true;
  };
  if (
    !keys(
      value,
      [
        "result",
        "record_before",
        "record_after",
        "input_unchanged",
        ...(caseId === "lineage-wrong-predecessor" ||
        caseId === "phase-ready" ||
        caseId === "rollover-ready" ||
        caseId === "active-stop" ||
        caseId === "rollover-budget" ||
        caseId === "green-budget" ||
        caseId === "inflight-activity" ||
        caseId === "approval-self-declared" ||
        caseId === "receipt-continue"
          ? []
          : ["transition"]),
      ],
      "",
    )
  )
    return;
  const expectedResult = resultFields[caseId];
  if (!expectedResult) {
    problem("result");
    return;
  }
  if (keys(value.result, expectedResult, "result"))
    for (const field of expectedResult) {
      const actual = value.result[field];
      const type = ["idempotent", "launch_allowed"].includes(field) ? "boolean" : "string";
      if (typeof actual !== type || (type === "string" && !actual)) problem(`result.${field}`);
    }
  if (typeof value.input_unchanged !== "boolean") problem("input_unchanged");
  if (Object.hasOwn(value, "transition")) {
    if (
      keys(value.transition, ["changed"], "transition") &&
      typeof value.transition.changed !== "boolean"
    )
      problem("transition.changed");
  }
  for (const side of ["record_before", "record_after"]) {
    const record = value[side];
    if (!keys(record, ["status", "sequence", "checkpoint", "task", "budgets", "rollover"], side))
      continue;
    if (typeof record.status !== "string" || !record.status) problem(`${side}.status`);
    if (!Number.isInteger(record.sequence)) problem(`${side}.sequence`);
    if (
      keys(record.checkpoint, ["next_action"], `${side}.checkpoint`) &&
      typeof record.checkpoint.next_action !== "string"
    )
      problem(`${side}.checkpoint.next_action`);
    if (
      keys(record.task, ["used_rollovers"], `${side}.task`) &&
      !Number.isInteger(record.task.used_rollovers)
    )
      problem(`${side}.task.used_rollovers`);
    if (keys(record.budgets, ["green", "diagnostic", "rework_count"], `${side}.budgets`)) {
      for (const budget of ["green", "diagnostic"])
        if (
          keys(record.budgets[budget], ["used"], `${side}.budgets.${budget}`) &&
          !Number.isInteger(record.budgets[budget].used)
        )
          problem(`${side}.budgets.${budget}.used`);
      if (!Number.isInteger(record.budgets.rework_count)) problem(`${side}.budgets.rework_count`);
    }
    if (keys(record.rollover, ["claim", "receipt"], `${side}.rollover`)) {
      for (const field of ["claim", "receipt"]) {
        const member = record.rollover[field];
        if (member === null) continue;
        const expected = field === "claim" ? ["executor_id"] : ["executor_id", "session_id"];
        if (keys(member, expected, `${side}.rollover.${field}`))
          for (const key of expected)
            if (typeof member[key] !== "string" || !member[key])
              problem(`${side}.rollover.${field}.${key}`);
      }
    }
  }
}

function compare(caseId, expected, actual, reason, errors, path = "") {
  if (isObject(expected) && isObject(actual)) {
    for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)]))
      compare(caseId, expected[key], actual[key], reason, errors, path ? `${path}.${key}` : key);
  } else if (expected !== actual) errors.push(failure(caseId, reason, path));
}

function run() {
  let outputPath;
  const report = {
    schema_version: 2,
    corpus_sha256: null,
    baseline_source_revision: null,
    baseline_source_sha256: null,
    pass: false,
    cases: [],
    failures: [],
  };
  try {
    const datasetPath = option("--dataset") ?? defaultDataset;
    const baselinePath = option("--baseline");
    outputPath = option("--output");
    if (args.length) throw new Error(`unexpected arguments: ${args.join(" ")}`);
    const dataset = readJson(datasetPath);
    if (dataset.schema_version !== 2 || !Array.isArray(dataset.cases) || !dataset.cases.length)
      throw new Error("invalid dataset");
    report.corpus_sha256 = hash(JSON.stringify(dataset.cases));
    const baseline = baselinePath ? readJson(baselinePath) : null;
    if (!baseline) report.failures.push(failure("$baseline", "missing_baseline"));
    else {
      report.baseline_source_revision = baseline.source_revision ?? null;
      report.baseline_source_sha256 = baseline.source_sha256 ?? null;
      if (baseline.schema_version !== 2 || !Array.isArray(baseline.cases))
        report.failures.push(failure("$baseline", "invalid_baseline_schema", "schema_version"));
      if (baseline.corpus_sha256 !== report.corpus_sha256)
        report.failures.push(failure("$corpus", "corpus_hash_mismatch", "corpus_sha256"));
      for (const [field, valid] of [
        ["source_revision", baseline.source_revision === sourceRevision],
        ["source_sha256", baseline.source_sha256 === sourceSha256],
        [
          "observation_method",
          typeof baseline.observation_method === "string" &&
            Boolean(baseline.observation_method.trim()),
        ],
        ["capture_sha256", baseline.capture_sha256 === captureSha256],
      ])
        if (!valid)
          report.failures.push(failure("$baseline", "invalid_baseline_provenance", field));
    }
    const baselineRows = new Map();
    for (const row of Array.isArray(baseline?.cases) ? baseline.cases : []) {
      if (!isObject(row) || typeof row.case_id !== "string" || !row.case_id) {
        report.failures.push(failure("$baseline", "invalid_baseline_case", "case_id"));
        continue;
      }
      if (baselineRows.has(row.case_id))
        report.failures.push(failure(row.case_id, "duplicate_baseline_case_id", "case_id"));
      baselineRows.set(row.case_id, row);
    }
    const seen = new Set();
    for (const entry of dataset.cases) {
      const caseId = entry.case_id;
      if (typeof caseId !== "string" || !caseId) {
        report.failures.push(failure("$dataset", "invalid_case_id", "case_id"));
        continue;
      }
      if (seen.has(caseId)) report.failures.push(failure(caseId, "duplicate_case_id", "case_id"));
      seen.add(caseId);
      const inputSha256 = hash(JSON.stringify({ operation: entry.operation, input: entry.input }));
      const expected = entry.expected_observation;
      const historical = baselineRows.get(caseId);
      const current = evaluate(entry);
      if (!historical) report.failures.push(failure(caseId, "missing_baseline_case", "case_id"));
      else if (historical.input_sha256 !== inputSha256)
        report.failures.push(failure(caseId, "input_hash_mismatch", "input_sha256"));
      if (historical && ![0, 1].includes(historical.exit_code))
        report.failures.push(failure(caseId, "invalid_baseline_exit", "exit_code"));
      const earlier = report.failures.length;
      checkObservation(caseId, expected, "invalid_expected_observation", report.failures);
      if (historical)
        checkObservation(
          caseId,
          historical.observation,
          "invalid_baseline_observation",
          report.failures,
        );
      checkObservation(caseId, current.observation, "invalid_current_observation", report.failures);
      if (historical) {
        compare(caseId, expected, historical.observation, "baseline_drift", report.failures);
        if (historical.exit_code !== current.exit_code)
          report.failures.push(failure(caseId, "baseline_exit_mismatch", "exit_code"));
      }
      compare(caseId, expected, current.observation, "candidate_mismatch", report.failures);
      const comparable = Boolean(
        historical &&
        baseline?.schema_version === 2 &&
        baseline.corpus_sha256 === report.corpus_sha256 &&
        baseline.source_revision === sourceRevision &&
        baseline.source_sha256 === sourceSha256 &&
        typeof baseline.observation_method === "string" &&
        baseline.observation_method.trim() &&
        baseline.capture_sha256 === captureSha256 &&
        historical.input_sha256 === inputSha256,
      );
      report.cases.push({
        case_id: caseId,
        input_sha256: inputSha256,
        expected_decision: entry.expected_decision,
        actual_decision: current.observation.result.decision,
        actual_observation: current.observation,
        actual_exit_code: current.exit_code,
        baseline_decision: comparable ? (historical.observation?.result?.decision ?? null) : null,
        changed: comparable
          ? JSON.stringify(historical.observation) !== JSON.stringify(current.observation)
          : null,
        comparable,
        pass:
          comparable &&
          report.failures.length === earlier &&
          !report.failures.some((row) => row.case_id === caseId),
        approval_provenance: "not_checked",
      });
    }
    for (const caseId of baselineRows.keys())
      if (!seen.has(caseId))
        report.failures.push(failure(caseId, "missing_dataset_case", "case_id"));
  } catch (error) {
    report.failures.push(failure("$evaluation", "invalid_input"));
    report.error = error.message;
  }
  report.pass = report.failures.length === 0 && report.cases.every((row) => row.pass);
  const encoded = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) writeFileSync(outputPath, encoded);
  process.stdout.write(encoded);
  if (!report.pass) process.exitCode = 1;
}

run();
