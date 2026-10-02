import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import {
  validateSemantic,
  validateRecord,
  canonical,
  decideHandoff,
  prepareHandoff,
  claimHandoff,
  receiptHandoff,
} from "./handoff-core.mjs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const command = args.shift();
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LOCAL_CHECKS_NOTICE =
  "Local state, hash, STOP, evidence, and budget checks only. The caller must verify the actual user approval, identity, scope, time, and revocation status outside this CLI before acting. This CLI does not grant execution authorization.";
const STARTUP_PROMPT = `Startup only: do not read or mutate project state and do not perform product work. Wait for the caller to persist a receipt with this real session ID and send the bounded resume prompt; then run decide with this session ID before work. ${LOCAL_CHECKS_NOTICE}`;
function option(name, required = true) {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (index >= 0) args.splice(index, 2);
  if (required && (!value || value.startsWith("--"))) throw new Error(`missing option: ${name}`);
  return value;
}

function stateLocation(stateValue, suppliedRoot) {
  const statePath = resolve(stateValue);
  if (basename(statePath) !== "session-handoff.json") throw new Error("unsafe state location");
  const featureDirectory = dirname(statePath);
  const featuresDirectory = dirname(featureDirectory);
  const docsDirectory = dirname(featuresDirectory);
  const root = dirname(docsDirectory);
  const expected = `docs/features/${basename(featureDirectory)}/session-handoff.json`;
  if (
    relative(root, statePath).split(sep).join("/") !== expected ||
    basename(featuresDirectory) !== "features" ||
    basename(docsDirectory) !== "docs" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(basename(featureDirectory)) ||
    (suppliedRoot && resolve(suppliedRoot) !== root)
  )
    throw new Error("state must be docs/features/{feature}/session-handoff.json under root");
  if (!existsSync(root) || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink())
    throw new Error("root must be a regular directory");
  let current = root;
  for (const segment of relative(root, dirname(statePath)).split(sep)) {
    current = resolve(current, segment);
    if (!existsSync(current)) continue;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("state path has unsafe ancestor");
  }
  if (existsSync(statePath)) {
    const stat = lstatSync(statePath);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error("state path is not a regular file");
  }
  return { root, statePath, stateRelative: expected };
}

function readJson(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("JSON input must be a regular file");
  return JSON.parse(readFileSync(path, "utf8"));
}

function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    writeFileSync(temporary, `${canonical(value)}\n`, { flag: "wx" });
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function withLock(statePath, action) {
  const lockPath = `${statePath}.lock`;
  let descriptor;
  try {
    mkdirSync(dirname(statePath), { recursive: true });
    descriptor = openSync(lockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST") return { decision: "STOP_CONCURRENT_OPERATION" };
    throw error;
  }
  try {
    return action();
  } finally {
    closeSync(descriptor);
    unlinkSync(lockPath);
  }
}

function git(root, gitArgs) {
  const result = spawnSync("git", ["-C", root, ...gitArgs], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function fileDigest(root, path) {
  const absolute = resolve(root, path);
  const within = relative(root, absolute);
  if (within === ".." || within.startsWith(`..${sep}`) || isAbsolute(within))
    throw new Error("reference escapes root");
  let current = root;
  for (const segment of path.split("/")) {
    current = resolve(current, segment);
    if (!existsSync(current)) return null;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("reference traverses symlink");
  }
  if (!lstatSync(absolute).isFile()) throw new Error("reference is not a regular file");
  return createHash("sha256").update(readFileSync(absolute)).digest("hex");
}

function dirtySnapshot(root, stateRelative) {
  const output = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const entries = output.split("\0");
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    if (status.includes("R") || status.includes("C")) index += 1;
    if (path === stateRelative || path === `${stateRelative}.lock`) continue;
    paths.push({ path, sha256: fileDigest(root, path) ?? "deleted" });
  }
  return paths.sort((left, right) => left.path.localeCompare(right.path));
}

function checkCurrent(record, location) {
  let revision;
  try {
    revision = git(location.root, ["rev-parse", "HEAD"]).trim();
  } catch {
    return "STOP_SOURCE_UNAVAILABLE";
  }
  if (revision !== record.state.source_revision) return "STOP_SOURCE_STALE";
  const expected = record.state.dirty_manifest
    .map(({ path, sha256 }) => ({ path, sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
  let actual;
  try {
    actual = dirtySnapshot(location.root, location.stateRelative);
  } catch {
    return "STOP_SOURCE_UNAVAILABLE";
  }
  if (canonical(actual) !== canonical(expected)) return "STOP_DIRTY_STALE";
  try {
    for (const [path, hash] of Object.entries(record.state.contract_hashes))
      if (fileDigest(location.root, path) !== hash) return "STOP_CONTRACT_STALE";
    for (const approval of record.state.approval_refs)
      if (fileDigest(location.root, approval.path) !== approval.sha256)
        return "STOP_APPROVAL_STALE";
    for (const evidence of record.state.evidence_refs)
      if (fileDigest(location.root, evidence.path) !== evidence.sha256)
        return "STOP_EVIDENCE_STALE";
  } catch {
    return "STOP_REFERENCE_UNSAFE";
  }
  return null;
}

function receiptPrompt(record, location) {
  const sessionId = record.rollover.receipt.session_id;
  return `First run node scripts/session-handoff.mjs decide --state ${location.stateRelative} --root . --session-id ${sessionId}; perform no work unless it returns CONTINUE_CURRENT with transfer confirmed-receipt and the caller has verified actual user approval outside this CLI. Then ${prompt(record, location)}`;
}

function prompt(record, location) {
  return `Use $harness-cycle in RESUME mode. Read ${location.stateRelative}, verify handoff_id ${record.handoff_id}, source/dirty ownership and referenced evidence, then perform only checkpoint.next_action within approved_scope_ref. Preserve counters; apply STOP before phase transition. ${LOCAL_CHECKS_NOTICE}`;
}

function decorateDecision(result, record, location) {
  if (result.decision === "ROLLOVER_READY") return { ...result, notice: LOCAL_CHECKS_NOTICE };
  if (result.decision === "PHASE_READY" || result.decision === "CONTINUE_CURRENT")
    return { ...result, instruction: prompt(record, location), notice: LOCAL_CHECKS_NOTICE };
  return result;
}

function prepare() {
  const inputPath = option("--input");
  const stateValue = option("--state");
  if (args.length) throw new Error("unexpected arguments");
  const location = stateLocation(stateValue);
  const input = validateSemantic(readJson(resolve(inputPath)));
  const result = withLock(location.statePath, () => {
    const previous = existsSync(location.statePath)
      ? validateRecord(readJson(location.statePath))
      : null;
    const transition = prepareHandoff(previous, input);
    const currentProblem = checkCurrent(transition.record, location);
    if (currentProblem) throw new Error(`prepare current identity invalid: ${currentProblem}`);
    if (transition.changed) atomicWrite(location.statePath, transition.record);
    return transition.record;
  });
  if (result.decision) return result;
  return {
    decision: "PREPARED",
    handoff_id: result.handoff_id,
    state: location.stateRelative,
    notice: LOCAL_CHECKS_NOTICE,
  };
}

function decide() {
  const stateValue = option("--state");
  const suppliedRoot = option("--root");
  const sessionId = option("--session-id", false);
  if (args.length) throw new Error("unexpected arguments");
  const location = stateLocation(stateValue, suppliedRoot);
  let record;
  try {
    record = validateRecord(readJson(location.statePath));
  } catch (error) {
    return { decision: "STOP_MALFORMED", reason: error.message };
  }
  return decorateDecision(
    decideHandoff(record, { currentProblem: checkCurrent(record, location), sessionId }),
    record,
    location,
  );
}

function claim() {
  const stateValue = option("--state");
  const handoffId = option("--handoff-id");
  const executorId = option("--executor-id");
  if (args.length || !ID.test(executorId)) throw new Error("invalid claim arguments");
  const location = stateLocation(stateValue);
  return withLock(location.statePath, () => {
    const record = validateRecord(readJson(location.statePath));
    const currentProblem = record.handoff_id === handoffId ? checkCurrent(record, location) : null;
    const transition = claimHandoff(record, { handoffId, executorId, currentProblem });
    if (transition.changed) atomicWrite(location.statePath, transition.record);
    if (transition.result.decision === "CLAIMED")
      return {
        ...transition.result,
        launch_prompt: STARTUP_PROMPT,
        notice: `${LOCAL_CHECKS_NOTICE} Claim only records a local transition; the caller creates the session separately.`,
      };
    return decorateDecision(transition.result, record, location);
  });
}

function receipt() {
  const stateValue = option("--state");
  const handoffId = option("--handoff-id");
  const executorId = option("--executor-id");
  const sessionId = option("--session-id");
  if (
    args.length ||
    !ID.test(executorId) ||
    !ID.test(sessionId) ||
    /^(?:client|pending|unknown|timeout)/i.test(sessionId)
  )
    throw new Error("invalid receipt arguments");
  const location = stateLocation(stateValue);
  return withLock(location.statePath, () => {
    const record = validateRecord(readJson(location.statePath));
    const currentProblem =
      record.handoff_id === handoffId && record.rollover.claim?.executor_id === executorId
        ? checkCurrent(record, location)
        : null;
    const transition = receiptHandoff(record, { handoffId, executorId, sessionId, currentProblem });
    if (transition.changed) atomicWrite(location.statePath, transition.record);
    if (transition.result.decision === "RECEIPT_RECORDED")
      return {
        ...transition.result,
        resume_prompt: receiptPrompt(transition.record, location),
        notice: LOCAL_CHECKS_NOTICE,
      };
    return transition.result;
  });
}

function inputTemplate() {
  return {
    schema_version: 2,
    sequence: 1,
    task: {
      objective: "<bounded-objective>",
      approved_scope_ref: "<project-relative-path>",
      rollover_authority_ref: null,
      max_rollovers: 0,
      used_rollovers: 0,
    },
    checkpoint: {
      mode: "RESUME",
      stage: "green",
      stage_status: "passed",
      action_kind: "phase",
      next_stage: "ac-verification",
      next_skill: "ac-verifier",
      next_action: "<exact-authorized-action>",
    },
    state: {
      source_revision: "<git-head>",
      dirty_manifest: [
        { path: "<changed-path>", sha256: "<sha256-or-deleted>", owner: "user|harness|worker" },
      ],
      contract_hashes: { "<contract-or-input-path>": "<sha256>" },
      approval_refs: [
        {
          gate: "scope|stage:<stage>|rollover|resume:<handoff-id>",
          path: "<project-relative-path>",
          sha256: "<sha256>",
          status: "approved",
        },
      ],
      evidence_refs: [
        {
          path: "<project-relative-path>",
          sha256: "<sha256>",
          required: true,
          validity: "valid|invalid|unknown",
        },
      ],
      evidence_validity: "valid|invalid|unknown",
      predecessor_handoff_id: null,
      retired_refs: [],
    },
    budgets: {
      green: { limit: 3, used: 0 },
      diagnostic: { limit: 1, used: 0 },
      rework_count: 0,
    },
    failures: [],
    activity: { workers: [], external_actions: [] },
    stop: {
      active: false,
      reason: null,
      resume_condition: null,
      resolution_ref: null,
    },
    rollover: { requested: "continue-current", claim: null, receipt: null },
  };
}

const HELP = `usage: session-handoff.mjs prepare|decide|claim|receipt [options]
       session-handoff.mjs template

Run template for the strict schema. Git HEAD/status are required for automated decide/claim.
action_kind=phase uses the effective Green budget when next_stage=green;
action_kind=diagnostic is a bounded read-only harness-cycle action and uses diagnostic budget.`;

try {
  if (command === "--help" || command === "help") {
    if (args.length) throw new Error("help accepts no arguments");
    process.stdout.write(`${HELP}\n`);
  } else if (command === "template") {
    if (args.length) throw new Error("template accepts no arguments");
    process.stdout.write(`${JSON.stringify(inputTemplate())}\n`);
  } else {
    if (!["prepare", "decide", "claim", "receipt"].includes(command)) throw new Error(HELP);
    const result =
      command === "prepare"
        ? prepare()
        : command === "decide"
          ? decide()
          : command === "claim"
            ? claim()
            : receipt();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
