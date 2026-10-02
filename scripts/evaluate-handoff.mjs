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
const SHA256 = /^[a-f0-9]{64}$/;
const failure = (caseId, reason) => ({ case_id: caseId, reason });
const args = process.argv.slice(2);

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

function evaluate(entry) {
  const { operation, input } = entry;
  try {
    if (operation === "prepare") {
      prepareHandoff(input.previous ?? null, input.input);
      return { decision: "PREPARED" };
    }
    validateRecord(input.record);
    if (operation === "decide") return decideHandoff(input.record, input.context ?? {});
    if (operation === "claim") return claimHandoff(input.record, input.context ?? {}).result;
    if (operation === "receipt") return receiptHandoff(input.record, input.context ?? {}).result;
    throw new Error(`unsupported operation: ${operation}`);
  } catch (error) {
    return { decision: "ERROR", error: error.message };
  }
}

function run() {
  let datasetPath;
  let baselinePath;
  let outputPath;
  const report = {
    schema_version: 1,
    corpus_sha256: null,
    baseline_source_revision: null,
    baseline_source_sha256: null,
    pass: false,
    cases: [],
    failures: [],
  };
  try {
    datasetPath = option("--dataset") ?? defaultDataset;
    baselinePath = option("--baseline");
    outputPath = option("--output");
    if (args.length) throw new Error(`unexpected arguments: ${args.join(" ")}`);
    const dataset = readJson(datasetPath);
    if (dataset.schema_version !== 1 || !Array.isArray(dataset.cases) || !dataset.cases.length)
      throw new Error("invalid dataset");
    report.corpus_sha256 = hash(JSON.stringify(dataset.cases));
    const baseline = baselinePath ? readJson(baselinePath) : null;
    const baselineSchemaValid = baseline?.schema_version === 1 && Array.isArray(baseline?.cases);
    const baselineCorpusMatches = baseline?.corpus_sha256 === report.corpus_sha256;
    const baselineProvenanceValid = Boolean(
      typeof baseline?.source_revision === "string" &&
      baseline.source_revision.trim() &&
      SHA256.test(baseline.source_sha256 ?? "") &&
      typeof baseline.observation_method === "string" &&
      baseline.observation_method.trim(),
    );
    if (!baseline) report.failures.push(failure("$baseline", "missing_baseline"));
    else {
      report.baseline_source_revision = baseline.source_revision ?? null;
      report.baseline_source_sha256 = baseline.source_sha256 ?? null;
      if (!baselineSchemaValid) report.failures.push(failure("$baseline", "invalid_baseline"));
      if (!baselineCorpusMatches) report.failures.push(failure("$corpus", "corpus_hash_mismatch"));
      if (!baselineProvenanceValid)
        report.failures.push(failure("$baseline", "missing_baseline_provenance"));
    }
    const seen = new Set();
    const baselineRows = new Map();
    const duplicateBaselineIds = new Set();
    const invalidBaselineIds = new Set();
    for (const row of Array.isArray(baseline?.cases) ? baseline.cases : []) {
      if (
        typeof row.case_id !== "string" ||
        !SHA256.test(row.input_sha256 ?? "") ||
        typeof row.actual_decision !== "string" ||
        !row.actual_decision
      ) {
        report.failures.push(failure(row.case_id ?? "$baseline", "invalid_baseline_case"));
        invalidBaselineIds.add(row.case_id);
      }
      if (baselineRows.has(row.case_id)) {
        report.failures.push(failure(row.case_id, "duplicate_baseline_case_id"));
        duplicateBaselineIds.add(row.case_id);
      }
      baselineRows.set(row.case_id, row);
    }
    for (const entry of dataset.cases) {
      const caseId = entry.case_id;
      if (typeof caseId !== "string" || !caseId) {
        report.failures.push(failure("$dataset", "invalid_case_id"));
        continue;
      }
      const duplicate = seen.has(caseId);
      if (duplicate) report.failures.push(failure(caseId, "duplicate_case_id"));
      seen.add(caseId);
      const inputSha256 = hash(JSON.stringify({ operation: entry.operation, input: entry.input }));
      const actual = evaluate(entry);
      const baselineRow = baselineRows.get(caseId);
      if (baseline && !baselineRow) report.failures.push(failure(caseId, "missing_baseline_case"));
      if (baselineRow && baselineRow.input_sha256 !== inputSha256)
        report.failures.push(failure(caseId, "input_hash_mismatch"));
      const comparable = Boolean(
        baselineSchemaValid &&
        baselineCorpusMatches &&
        baselineProvenanceValid &&
        baselineRow &&
        baselineRow.input_sha256 === inputSha256 &&
        !duplicate &&
        !duplicateBaselineIds.has(caseId) &&
        !invalidBaselineIds.has(caseId),
      );
      const localConsistency =
        actual.decision === entry.expected_decision &&
        (entry.expected_error === undefined || actual.error === entry.expected_error)
          ? "pass"
          : "fail";
      const pass = comparable && localConsistency === "pass";
      if (localConsistency === "fail") report.failures.push(failure(caseId, "unexpected_decision"));
      report.cases.push({
        case_id: caseId,
        input_sha256: inputSha256,
        expected_decision: entry.expected_decision,
        actual_decision: actual.decision,
        ...(actual.error ? { actual_error: actual.error } : {}),
        pass,
        baseline_decision: comparable ? baselineRow.actual_decision : null,
        changed: comparable ? baselineRow.actual_decision !== actual.decision : null,
        comparable,
        local_consistency: localConsistency,
        approval_provenance: "not_checked",
      });
    }
    for (const caseId of baselineRows.keys())
      if (!seen.has(caseId)) report.failures.push(failure(caseId, "missing_dataset_case"));
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
