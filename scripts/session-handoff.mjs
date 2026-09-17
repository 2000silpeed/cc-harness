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
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const command = args.shift();
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const OWNERS = new Set(["user", "harness", "worker"]);
const STAGE_STATUSES = new Set(["pending", "passed", "failed", "stopped"]);
const ACTIVITY_STATUSES = new Set([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "unknown",
]);
const TERMINAL_ACTIVITY = new Set(["completed", "failed", "cancelled"]);
const STARTUP_PROMPT =
  "Startup only: do not read or mutate project state and do not perform product work. Wait for the caller to persist a receipt with this real session ID and send the bounded resume prompt; then run decide with this session ID before work.";
const STAGE_SKILLS = new Map([
  ["requirements", "feature-planner"],
  ["design", "design-system"],
  ["planning", "feature-planner"],
  ["scenarios", "test-scenarios"],
  ["red", "tdd-red"],
  ["green", "tdd-green"],
  ["ac-verification", "ac-verifier"],
  ["refactor", "tdd-refactor"],
  ["security", "security-review"],
  ["e2e", "e2e-write"],
  ["pr", "create-pr"],
]);

function option(name, required = true) {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (index >= 0) args.splice(index, 2);
  if (required && (!value || value.startsWith("--"))) throw new Error(`missing option: ${name}`);
  return value;
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    throw new Error(`${label} has missing or extra keys`);
}

function text(value, label, maximum = 4096) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum)
    throw new Error(`${label} must be nonempty bounded text`);
}

function integer(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be nonnegative`);
}

function localReference(value, label) {
  text(value, label, 512);
  if (
    isAbsolute(value) ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error(`${label} is not a safe project-relative path`);
}

function validateActivity(entry, label) {
  exactKeys(entry, ["id", "status"], label);
  if (!ID.test(entry.id)) throw new Error(`${label}.id is invalid`);
  if (!ACTIVITY_STATUSES.has(entry.status)) throw new Error(`${label}.status is invalid`);
}

function validateSemantic(input) {
  exactKeys(
    input,
    [
      "schema_version",
      "sequence",
      "task",
      "checkpoint",
      "state",
      "budgets",
      "failures",
      "activity",
      "stop",
      "rollover",
    ],
    "handoff",
  );
  if (input.schema_version !== 1) throw new Error("unsupported schema_version");
  integer(input.sequence, "sequence");
  if (input.sequence < 1) throw new Error("sequence must be positive");

  exactKeys(
    input.task,
    [
      "objective",
      "approved_scope_ref",
      "rollover_authority_ref",
      "max_rollovers",
      "used_rollovers",
    ],
    "task",
  );
  text(input.task.objective, "task.objective", 1000);
  localReference(input.task.approved_scope_ref, "task.approved_scope_ref");
  if (input.task.rollover_authority_ref !== null)
    localReference(input.task.rollover_authority_ref, "task.rollover_authority_ref");
  integer(input.task.max_rollovers, "task.max_rollovers");
  integer(input.task.used_rollovers, "task.used_rollovers");
  if (input.task.used_rollovers > input.task.max_rollovers)
    throw new Error("used_rollovers exceeds max_rollovers");

  exactKeys(
    input.checkpoint,
    ["mode", "stage", "stage_status", "action_kind", "next_stage", "next_skill", "next_action"],
    "checkpoint",
  );
  if (input.checkpoint.mode !== "RESUME") throw new Error("checkpoint.mode must be RESUME");
  for (const key of ["stage", "next_stage", "next_skill"])
    text(input.checkpoint[key], `checkpoint.${key}`, 128);
  text(input.checkpoint.next_action, "checkpoint.next_action", 2000);
  if (!STAGE_STATUSES.has(input.checkpoint.stage_status))
    throw new Error("checkpoint.stage_status is invalid");
  if (!["phase", "diagnostic"].includes(input.checkpoint.action_kind))
    throw new Error("checkpoint.action_kind is invalid");
  if (!STAGE_SKILLS.has(input.checkpoint.stage) || !STAGE_SKILLS.has(input.checkpoint.next_stage))
    throw new Error("checkpoint stage is invalid");
  if (
    input.checkpoint.action_kind === "phase" &&
    STAGE_SKILLS.get(input.checkpoint.next_stage) !== input.checkpoint.next_skill
  )
    throw new Error("checkpoint.next_skill does not match next_stage");
  if (
    input.checkpoint.action_kind === "diagnostic" &&
    (input.checkpoint.stage_status !== "pending" ||
      input.checkpoint.stage !== input.checkpoint.next_stage ||
      input.checkpoint.next_skill !== "harness-cycle")
  )
    throw new Error("diagnostic action must remain at a pending stage under harness-cycle");
  if (
    (input.checkpoint.stage_status === "pending") !==
    (input.checkpoint.stage === input.checkpoint.next_stage)
  )
    throw new Error("checkpoint stage transition is contradictory");

  exactKeys(
    input.state,
    [
      "source_revision",
      "dirty_manifest",
      "contract_hashes",
      "approval_refs",
      "evidence_refs",
      "evidence_validity",
    ],
    "state",
  );
  text(input.state.source_revision, "state.source_revision", 256);
  if (!Array.isArray(input.state.dirty_manifest))
    throw new Error("dirty_manifest must be an array");
  const dirtyPaths = new Set();
  for (const [index, entry] of input.state.dirty_manifest.entries()) {
    exactKeys(entry, ["path", "sha256", "owner"], `dirty_manifest[${index}]`);
    localReference(entry.path, `dirty_manifest[${index}].path`);
    if (!HASH.test(entry.sha256) && entry.sha256 !== "deleted")
      throw new Error(`dirty_manifest[${index}].sha256 is invalid`);
    if (!OWNERS.has(entry.owner)) throw new Error(`dirty_manifest[${index}].owner is invalid`);
    if (dirtyPaths.has(entry.path)) throw new Error("duplicate dirty path");
    dirtyPaths.add(entry.path);
  }
  if (
    !input.state.contract_hashes ||
    typeof input.state.contract_hashes !== "object" ||
    Array.isArray(input.state.contract_hashes)
  )
    throw new Error("contract_hashes must be an object");
  for (const [path, hash] of Object.entries(input.state.contract_hashes)) {
    localReference(path, "contract_hashes path");
    if (!HASH.test(hash)) throw new Error("contract_hashes value is invalid");
  }
  if (!Array.isArray(input.state.approval_refs)) throw new Error("approval_refs must be an array");
  for (const [index, entry] of input.state.approval_refs.entries()) {
    exactKeys(entry, ["gate", "path", "sha256", "status"], `approval_refs[${index}]`);
    text(entry.gate, `approval_refs[${index}].gate`, 128);
    localReference(entry.path, `approval_refs[${index}].path`);
    if (!HASH.test(entry.sha256)) throw new Error(`approval_refs[${index}].sha256 is invalid`);
    if (entry.status !== "approved") throw new Error(`approval_refs[${index}].status is invalid`);
  }
  if (!Array.isArray(input.state.evidence_refs)) throw new Error("evidence_refs must be an array");
  for (const [index, entry] of input.state.evidence_refs.entries()) {
    exactKeys(entry, ["path", "sha256", "required", "validity"], `evidence_refs[${index}]`);
    localReference(entry.path, `evidence_refs[${index}].path`);
    if (!HASH.test(entry.sha256)) throw new Error(`evidence_refs[${index}].sha256 is invalid`);
    if (typeof entry.required !== "boolean")
      throw new Error(`evidence_refs[${index}].required is invalid`);
    if (!["valid", "invalid", "unknown"].includes(entry.validity))
      throw new Error(`evidence_refs[${index}].validity is invalid`);
  }
  if (!["valid", "invalid", "unknown"].includes(input.state.evidence_validity))
    throw new Error("state.evidence_validity is invalid");
  if (
    new Set(input.state.approval_refs.map((entry) => entry.gate)).size !==
    input.state.approval_refs.length
  )
    throw new Error("approval_refs contains duplicate gates");
  if (
    new Set(input.state.evidence_refs.map((entry) => entry.path)).size !==
    input.state.evidence_refs.length
  )
    throw new Error("evidence_refs contains duplicate paths");

  exactKeys(input.budgets, ["green", "diagnostic", "rework_count"], "budgets");
  for (const kind of ["green", "diagnostic"]) {
    exactKeys(input.budgets[kind], ["limit", "used"], `budgets.${kind}`);
    integer(input.budgets[kind].limit, `budgets.${kind}.limit`);
    integer(input.budgets[kind].used, `budgets.${kind}.used`);
    if (input.budgets[kind].used > input.budgets[kind].limit)
      throw new Error(`budgets.${kind}.used exceeds limit`);
  }
  integer(input.budgets.rework_count, "budgets.rework_count");

  if (!Array.isArray(input.failures)) throw new Error("failures must be an array");
  for (const [index, failure] of input.failures.entries()) {
    exactKeys(failure, ["identity", "evidence_ref"], `failures[${index}]`);
    text(failure.identity, `failures[${index}].identity`, 256);
    localReference(failure.evidence_ref, `failures[${index}].evidence_ref`);
    if (!input.state.evidence_refs.some((entry) => entry.path === failure.evidence_ref))
      throw new Error(`failures[${index}].evidence_ref is not identified by evidence_refs`);
  }
  if (new Set(input.failures.map((entry) => entry.identity)).size !== input.failures.length)
    throw new Error("failures contains duplicate identities");

  exactKeys(input.activity, ["workers", "external_actions"], "activity");
  for (const kind of ["workers", "external_actions"]) {
    if (!Array.isArray(input.activity[kind])) throw new Error(`activity.${kind} must be an array`);
    input.activity[kind].forEach((entry, index) => validateActivity(entry, `${kind}[${index}]`));
    if (new Set(input.activity[kind].map((entry) => entry.id)).size !== input.activity[kind].length)
      throw new Error(`activity.${kind} contains duplicate identifiers`);
  }
  exactKeys(input.stop, ["active", "reason", "resume_condition", "resolution_ref"], "stop");
  if (typeof input.stop.active !== "boolean") throw new Error("stop.active must be boolean");
  for (const key of ["reason", "resume_condition"])
    if (input.stop[key] !== null) text(input.stop[key], `stop.${key}`, 1000);
  if (input.stop.resolution_ref !== null)
    localReference(input.stop.resolution_ref, "stop.resolution_ref");
  if (input.stop.active && (!input.stop.reason || !input.stop.resume_condition))
    throw new Error("active STOP requires reason and resume_condition");
  if (input.stop.active && input.stop.resolution_ref !== null)
    throw new Error("active STOP cannot contain resolution_ref");

  exactKeys(input.rollover, ["requested", "claim", "receipt"], "rollover");
  if (!["continue-current", "fresh-session"].includes(input.rollover.requested))
    throw new Error("rollover.requested is invalid");
  if (input.rollover.claim !== null || input.rollover.receipt !== null)
    throw new Error("prepare input cannot contain claim or receipt");
  return input;
}

function semanticFromRecord(record) {
  const semantic = structuredClone(record);
  delete semantic.handoff_id;
  delete semantic.status;
  semantic.rollover = { ...semantic.rollover, claim: null, receipt: null };
  return semantic;
}

function validateRecord(record) {
  exactKeys(
    record,
    [
      "schema_version",
      "handoff_id",
      "sequence",
      "status",
      "task",
      "checkpoint",
      "state",
      "budgets",
      "failures",
      "activity",
      "stop",
      "rollover",
    ],
    "record",
  );
  if (!HASH.test(record.handoff_id)) throw new Error("handoff_id is invalid");
  if (!["prepared", "claimed", "receipted"].includes(record.status))
    throw new Error("record.status is invalid");
  const semantic = semanticFromRecord(record);
  validateSemantic(semantic);
  if (record.status === "prepared" && (record.rollover.claim || record.rollover.receipt))
    throw new Error("prepared record contains dispatch state");
  if (record.status === "claimed" && (!record.rollover.claim || record.rollover.receipt))
    throw new Error("claimed record is inconsistent");
  if (record.status === "receipted" && (!record.rollover.claim || !record.rollover.receipt))
    throw new Error("receipted record is inconsistent");
  if (record.rollover.claim) {
    exactKeys(record.rollover.claim, ["executor_id"], "rollover.claim");
    if (!ID.test(record.rollover.claim.executor_id)) throw new Error("executor_id is invalid");
  }
  if (record.rollover.receipt) {
    exactKeys(record.rollover.receipt, ["executor_id", "session_id"], "rollover.receipt");
    if (
      !ID.test(record.rollover.receipt.executor_id) ||
      !ID.test(record.rollover.receipt.session_id)
    )
      throw new Error("receipt identifier is invalid");
  }
  const identitySemantic = semanticFromRecord(record);
  if (record.status === "receipted") identitySemantic.task.used_rollovers -= 1;
  if (identitySemantic.task.used_rollovers < 0 || digest(identitySemantic) !== record.handoff_id)
    throw new Error("handoff_id does not match the prepared semantic payload");
  return record;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
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

function prompt(record, location) {
  return `Use $harness-cycle in RESUME mode. Read ${location.stateRelative}, verify handoff_id ${record.handoff_id}, source/dirty ownership and referenced evidence, then perform only checkpoint.next_action within approved_scope_ref. Preserve counters; apply STOP before phase transition.`;
}

function receiptPrompt(record, location) {
  const sessionId = record.rollover.receipt.session_id;
  return `First run node scripts/session-handoff.mjs decide --state ${location.stateRelative} --root . --session-id ${sessionId}; perform no work unless it returns CONTINUE_CURRENT with transfer confirmed-receipt. Then ${prompt(record, location)}`;
}

function approval(record, gate, path) {
  return record.state.approval_refs.some(
    (entry) => entry.gate === gate && entry.path === path && entry.status === "approved",
  );
}

function readiness(record, location, sessionId) {
  const stale = checkCurrent(record, location);
  if (stale) return { decision: stale };
  if (record.status === "claimed") return { decision: "STOP_RECONCILIATION_REQUIRED" };
  if (record.status === "receipted") {
    if (sessionId === record.rollover.receipt.session_id)
      return {
        decision: "CONTINUE_CURRENT",
        transfer: "confirmed-receipt",
        instruction: prompt(record, location),
      };
    return { decision: "STOP_ALREADY_TRANSFERRED" };
  }
  if (record.stop.active)
    return {
      decision: "STOP_ACTIVE",
      reason: record.stop.reason,
      resume_condition: record.stop.resume_condition,
    };
  for (const group of [record.activity.workers, record.activity.external_actions])
    if (group.some((entry) => !TERMINAL_ACTIVITY.has(entry.status)))
      return { decision: "STOP_INFLIGHT_ACTIVITY" };
  if (!approval(record, "scope", record.task.approved_scope_ref))
    return { decision: "STOP_APPROVAL_REQUIRED" };
  if (
    record.checkpoint.stage_status === "pending" &&
    !record.state.approval_refs.some(
      (entry) => entry.gate === `stage:${record.checkpoint.stage}` && entry.status === "approved",
    )
  )
    return { decision: "STOP_APPROVAL_REQUIRED" };
  if (
    record.state.evidence_validity !== "valid" ||
    record.state.evidence_refs.some((entry) => entry.required && entry.validity !== "valid")
  )
    return { decision: "STOP_EVIDENCE_INVALID_OR_UNKNOWN" };
  if (["failed", "stopped"].includes(record.checkpoint.stage_status))
    return { decision: "STOP_STAGE_NOT_READY" };
  if (
    record.checkpoint.stage_status === "passed" &&
    !approval(
      record,
      `stage:${record.checkpoint.next_stage}`,
      record.state.approval_refs.find(
        (entry) => entry.gate === `stage:${record.checkpoint.next_stage}`,
      )?.path,
    )
  )
    return { decision: "STOP_APPROVAL_REQUIRED" };
  if (
    record.checkpoint.action_kind === "phase" &&
    record.checkpoint.next_stage === "green" &&
    record.budgets.green.used >= record.budgets.green.limit
  )
    return { decision: "STOP_BUDGET_EXHAUSTED", budget: "green" };
  if (
    record.checkpoint.action_kind === "diagnostic" &&
    record.budgets.diagnostic.used >= record.budgets.diagnostic.limit
  )
    return { decision: "STOP_BUDGET_EXHAUSTED", budget: "diagnostic" };
  if (record.rollover.requested === "fresh-session") {
    if (
      !record.task.rollover_authority_ref ||
      !approval(record, "rollover", record.task.rollover_authority_ref)
    )
      return { decision: "STOP_ROLLOVER_AUTHORITY_REQUIRED" };
    if (record.task.used_rollovers >= record.task.max_rollovers)
      return { decision: "STOP_ROLLOVER_BUDGET_EXHAUSTED" };
    return {
      decision: "ROLLOVER_READY",
      handoff_id: record.handoff_id,
    };
  }
  if (record.checkpoint.stage_status === "passed")
    return {
      decision: "PHASE_READY",
      next_skill: record.checkpoint.next_skill,
      next_action: record.checkpoint.next_action,
      instruction: prompt(record, location),
    };
  return { decision: "CONTINUE_CURRENT", instruction: prompt(record, location) };
}

function prepare() {
  const inputPath = option("--input");
  const stateValue = option("--state");
  if (args.length) throw new Error("unexpected arguments");
  const location = stateLocation(stateValue);
  const input = validateSemantic(readJson(resolve(inputPath)));
  const handoffId = digest(input);
  const result = withLock(location.statePath, () => {
    if (existsSync(location.statePath)) {
      const previous = validateRecord(readJson(location.statePath));
      if (previous.status === "prepared" && previous.handoff_id === handoffId) {
        const currentProblem = checkCurrent(previous, location);
        if (currentProblem) throw new Error(`prepare current identity invalid: ${currentProblem}`);
        return previous;
      }
      if (previous.status === "claimed") throw new Error("reconciliation required before prepare");
      const previousCheckpoint = digest(previous.checkpoint);
      const nextCheckpoint = digest(input.checkpoint);
      if (previous.status === "receipted" && previousCheckpoint === nextCheckpoint)
        throw new Error("no-progress rollover chain blocked");
      if (input.sequence <= previous.sequence) throw new Error("sequence must increase");
      if (
        input.task.max_rollovers !== previous.task.max_rollovers ||
        input.budgets.green.limit !== previous.budgets.green.limit ||
        input.budgets.diagnostic.limit !== previous.budgets.diagnostic.limit
      )
        throw new Error("limits are immutable within a handoff chain");
      const resumeGate = `resume:${previous.handoff_id}`;
      const resumeApproval = input.state.approval_refs.find((entry) => entry.gate === resumeGate);
      const resumeEvidence = input.state.evidence_refs.find(
        (entry) =>
          entry.path === resumeApproval?.path && entry.required && entry.validity === "valid",
      );
      const previousReferencePaths = new Set([
        ...previous.state.approval_refs.map((entry) => entry.path),
        ...previous.state.evidence_refs.map((entry) => entry.path),
      ]);
      const authorizedStopRecovery =
        previous.stop.active &&
        !input.stop.active &&
        resumeApproval &&
        resumeEvidence &&
        input.stop.reason === previous.stop.reason &&
        input.stop.resume_condition === previous.stop.resume_condition &&
        input.stop.resolution_ref === resumeApproval.path &&
        !previousReferencePaths.has(resumeApproval.path);
      if (
        input.task.used_rollovers < previous.task.used_rollovers ||
        input.budgets.green.used < previous.budgets.green.used ||
        input.budgets.diagnostic.used < previous.budgets.diagnostic.used ||
        input.budgets.rework_count < previous.budgets.rework_count ||
        previous.failures.some(
          (failure) => !input.failures.some((entry) => canonical(entry) === canonical(failure)),
        ) ||
        (previous.stop.active && !input.stop.active && !authorizedStopRecovery)
      )
        throw new Error("prepare cannot reset durable counters or STOP");
    }
    const record = { ...input, handoff_id: handoffId, status: "prepared" };
    const currentProblem = checkCurrent(record, location);
    if (currentProblem) throw new Error(`prepare current identity invalid: ${currentProblem}`);
    atomicWrite(location.statePath, record);
    return record;
  });
  if (result.decision) return result;
  return { decision: "PREPARED", handoff_id: result.handoff_id, state: location.stateRelative };
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
  return readiness(record, location, sessionId);
}

function claim() {
  const stateValue = option("--state");
  const handoffId = option("--handoff-id");
  const executorId = option("--executor-id");
  if (args.length || !ID.test(executorId)) throw new Error("invalid claim arguments");
  const location = stateLocation(stateValue);
  return withLock(location.statePath, () => {
    const record = validateRecord(readJson(location.statePath));
    if (record.handoff_id !== handoffId) return { decision: "STOP_DUPLICATE_OR_STALE" };
    if (record.rollover.claim) {
      const stale = checkCurrent(record, location);
      if (stale) return { decision: stale };
      if (record.rollover.claim.executor_id === executorId)
        return { decision: "STOP_RECONCILIATION_REQUIRED", launch_allowed: false };
      return { decision: "STOP_DUPLICATE_OR_STALE" };
    }
    const ready = readiness(record, location);
    if (ready.decision !== "ROLLOVER_READY") return ready;
    record.status = "claimed";
    record.rollover.claim = { executor_id: executorId };
    atomicWrite(location.statePath, record);
    return { decision: "CLAIMED", idempotent: false, launch_prompt: STARTUP_PROMPT };
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
    if (
      record.handoff_id !== handoffId ||
      !record.rollover.claim ||
      record.rollover.claim.executor_id !== executorId
    )
      return { decision: "STOP_DUPLICATE_OR_STALE" };
    const stale = checkCurrent(record, location);
    if (stale) return { decision: stale };
    if (record.rollover.receipt) {
      if (
        record.rollover.receipt.executor_id === executorId &&
        record.rollover.receipt.session_id === sessionId
      )
        return {
          decision: "RECEIPT_RECORDED",
          idempotent: true,
          resume_prompt: receiptPrompt(record, location),
        };
      return { decision: "STOP_DUPLICATE_OR_STALE" };
    }
    record.status = "receipted";
    record.rollover.receipt = { executor_id: executorId, session_id: sessionId };
    record.task.used_rollovers += 1;
    atomicWrite(location.statePath, record);
    return {
      decision: "RECEIPT_RECORDED",
      idempotent: false,
      resume_prompt: receiptPrompt(record, location),
    };
  });
}

function inputTemplate() {
  return {
    schema_version: 1,
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
