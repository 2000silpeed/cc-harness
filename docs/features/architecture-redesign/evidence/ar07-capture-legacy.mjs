import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../../../..");
const revision = "ae9ff54c33518b77fc0de18feb217660303ac739";
const cliSha = "19823e889fa3e3db7a74b98610f8efbe8fd4412248860d7cf313b4176b84aefe";
const fixtureRevision = "7cfde09197911b026e8422e155b11f451792e479";
const dataset = JSON.parse(
  readFileSync(resolve(root, "tests/fixtures/handoff-evaluations.json"), "utf8"),
);
const ar01 = JSON.parse(readFileSync(resolve(import.meta.dirname, "ar01-baseline.json"), "utf8"));
const fixtureRoot = process.env.AR07_FIXTURE_REPO ?? ar01.fixture_root;
const output = resolve(import.meta.dirname, "ar07-legacy-raw.json");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const call = (file, args, cwd) => spawnSync(file, args, { cwd, encoding: "utf8" });
const source = call("git", ["cat-file", "-p", `${revision}:scripts/session-handoff.mjs`], root);
if (source.status !== 0 || sha(source.stdout) !== cliSha)
  throw new Error("pinned CLI blob SHA mismatch");
const fixtureHead = call("git", ["rev-parse", "HEAD"], fixtureRoot);
if (fixtureHead.status !== 0 || fixtureHead.stdout.trim() !== fixtureRevision)
  throw new Error("AR01 fixture Git revision mismatch");
if (
  sha(readFileSync(resolve(fixtureRoot, "tracked.txt"))) !==
  dataset.cases[0].input.record.state.dirty_manifest[0].sha256
)
  throw new Error("AR01 fixture dirty content mismatch");

const capture = {
  source_revision: revision,
  source_sha256: sha(source.stdout),
  fixture_revision: fixtureRevision,
  fixture_root: fixtureRoot,
  command: "node docs/features/architecture-redesign/evidence/ar07-capture-legacy.mjs",
  cases: [],
};
for (const entry of dataset.cases) {
  const temporary = mkdtempSync(resolve(tmpdir(), "ar07-legacy-"));
  const checkout = resolve(temporary, "fixture");
  try {
    const clone = call("git", ["clone", "--quiet", "--no-local", fixtureRoot, checkout], root);
    if (clone.status !== 0) throw new Error(`fixture clone failed: ${clone.stderr}`);
    writeFileSync(resolve(checkout, "tracked.txt"), "after\n");
    const cliPath = resolve(temporary, "session-handoff.mjs");
    writeFileSync(cliPath, source.stdout);
    const statePath = resolve(checkout, "docs/features/example/session-handoff.json");
    mkdirSync(dirname(statePath), { recursive: true });
    const beforeRecord = entry.input.previous ?? entry.input.record;
    writeFileSync(statePath, `${JSON.stringify(beforeRecord)}\n`);
    const inputPath = resolve(temporary, "input.json");
    let args;
    if (entry.operation === "prepare") {
      writeFileSync(inputPath, `${JSON.stringify(entry.input.input)}\n`);
      args = ["prepare", "--input", inputPath, "--state", statePath];
    } else if (entry.operation === "decide") {
      args = ["decide", "--state", statePath, "--root", checkout];
      if (entry.input.context?.sessionId) args.push("--session-id", entry.input.context.sessionId);
    } else {
      args = [
        entry.operation,
        "--state",
        statePath,
        "--handoff-id",
        entry.input.context.handoffId,
        "--executor-id",
        entry.input.context.executorId,
      ];
      if (entry.operation === "receipt") args.push("--session-id", entry.input.context.sessionId);
    }
    const before = readFileSync(statePath, "utf8");
    const inputBefore = entry.operation === "prepare" ? readFileSync(inputPath, "utf8") : null;
    const configPaths = [
      "scope.md",
      "rollover.md",
      "stage.md",
      "contract.md",
      "evidence.json",
      "tracked.txt",
    ];
    const configBefore = Object.fromEntries(
      configPaths.map((path) => [path, sha(readFileSync(resolve(checkout, path)))]),
    );
    const run = call(process.execPath, [cliPath, ...args], checkout);
    const after = readFileSync(statePath, "utf8");
    const inputAfter = entry.operation === "prepare" ? readFileSync(inputPath, "utf8") : null;
    const configAfter = Object.fromEntries(
      configPaths.map((path) => [path, sha(readFileSync(resolve(checkout, path)))]),
    );
    capture.cases.push({
      case_id: entry.case_id,
      operation: entry.operation,
      input_sha256: sha(JSON.stringify({ operation: entry.operation, input: entry.input })),
      argv: args.map((arg) =>
        arg.replaceAll(temporary, "<TEMP>").replaceAll(checkout, "<FIXTURE>"),
      ),
      exit_code: run.status,
      stdout: run.stdout,
      stderr: run.stderr,
      state_before: JSON.parse(before),
      state_after: JSON.parse(after),
      input_unchanged: inputBefore === inputAfter,
      config_sha256_before: configBefore,
      config_sha256_after: configAfter,
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
writeFileSync(output, `${JSON.stringify(capture, null, 2)}\n`);
process.stdout.write(`${output}\n${capture.cases.length} cases\n`);
