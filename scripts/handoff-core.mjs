import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";

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
const CURRENT_PROBLEMS = new Set([
  "STOP_SOURCE_UNAVAILABLE",
  "STOP_SOURCE_STALE",
  "STOP_DIRTY_STALE",
  "STOP_CONTRACT_STALE",
  "STOP_APPROVAL_STALE",
  "STOP_EVIDENCE_STALE",
  "STOP_REFERENCE_UNSAFE",
]);
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

export function validateSemantic(input) {
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
  if (![1, 2].includes(input.schema_version)) throw new Error("unsupported schema_version");
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
      ...(input.schema_version === 2 ? ["predecessor_handoff_id", "retired_refs"] : []),
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
  if (input.schema_version === 2) {
    if (
      input.state.predecessor_handoff_id !== null &&
      !HASH.test(input.state.predecessor_handoff_id)
    )
      throw new Error("predecessor_handoff_id is invalid");
    if (!Array.isArray(input.state.retired_refs)) throw new Error("retired_refs must be an array");
    for (const [index, entry] of input.state.retired_refs.entries()) {
      const label = `retired_refs[${index}]`;
      if (entry?.kind === "approval") {
        exactKeys(
          entry,
          ["kind", "gate", "path", "sha256", "status", "retired_from_handoff_id", "reason"],
          label,
        );
        text(entry.gate, `${label}.gate`, 128);
        if (entry.status !== "approved") throw new Error(`${label}.status is invalid`);
      } else if (entry?.kind === "evidence") {
        exactKeys(
          entry,
          ["kind", "path", "sha256", "required", "validity", "retired_from_handoff_id", "reason"],
          label,
        );
        if (
          typeof entry.required !== "boolean" ||
          !["valid", "invalid", "unknown"].includes(entry.validity)
        )
          throw new Error(`${label} evidence flags are invalid`);
      } else throw new Error(`${label}.kind is invalid`);
      localReference(entry.path, `${label}.path`);
      if (!HASH.test(entry.sha256) || !HASH.test(entry.retired_from_handoff_id))
        throw new Error(`${label} hash is invalid`);
      text(entry.reason, `${label}.reason`, 1000);
    }
    if (new Set(input.state.retired_refs.map(canonical)).size !== input.state.retired_refs.length)
      throw new Error("retired_refs contains duplicates");
  }

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

export function validateRecord(record) {
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
    if (/^(?:client|pending|unknown|timeout)/i.test(record.rollover.receipt.session_id))
      throw new Error("receipt identifier is invalid");
    if (record.rollover.receipt.executor_id !== record.rollover.claim?.executor_id)
      throw new Error("receipt executor does not match claim executor");
  }
  const identitySemantic = semanticFromRecord(record);
  if (record.status === "receipted") identitySemantic.task.used_rollovers -= 1;
  if (identitySemantic.task.used_rollovers < 0 || digest(identitySemantic) !== record.handoff_id)
    throw new Error("handoff_id does not match the prepared semantic payload");
  return record;
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function approval(record, gate, path) {
  return record.state.approval_refs.some(
    (entry) => entry.gate === gate && entry.path === path && entry.status === "approved",
  );
}

function validateCurrentProblem(currentProblem) {
  if (currentProblem !== null && !CURRENT_PROBLEMS.has(currentProblem))
    throw new Error("invalid currentProblem");
}

export function decideHandoff(record, { currentProblem = null, sessionId } = {}) {
  validateCurrentProblem(currentProblem);
  const stale = currentProblem;
  if (stale) return { decision: stale };
  if (record.status === "claimed") return { decision: "STOP_RECONCILIATION_REQUIRED" };
  if (record.status === "receipted" && sessionId !== record.rollover.receipt.session_id)
    return { decision: "STOP_ALREADY_TRANSFERRED" };
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
  if (record.status === "receipted")
    return {
      decision: "CONTINUE_CURRENT",
      transfer: "confirmed-receipt",
    };
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
    };
  return {
    decision: "CONTINUE_CURRENT",
  };
}

export function checkReferenceLineage(previous, input) {
  if (input.schema_version !== 2) throw new Error("successor prepare requires schema_version 2");
  if (input.state.predecessor_handoff_id !== previous.handoff_id)
    throw new Error("predecessor_handoff_id does not match previous handoff_id");
  const historical = previous.schema_version === 2 ? previous.state.retired_refs : [];
  const retired = input.state.retired_refs;
  if (canonical(retired.slice(0, historical.length)) !== canonical(historical))
    throw new Error("retired_refs history changed");
  const newlyRetired = retired.slice(historical.length);
  const previousActive = [
    ...previous.state.approval_refs.map((entry) => ({ kind: "approval", ...entry })),
    ...previous.state.evidence_refs.map((entry) => ({ kind: "evidence", ...entry })),
  ];
  const currentActive = [
    ...input.state.approval_refs.map((entry) => ({ kind: "approval", ...entry })),
    ...input.state.evidence_refs.map((entry) => ({ kind: "evidence", ...entry })),
  ];
  if (
    currentActive.some((current) =>
      retired.some(
        (old) =>
          old.kind === current.kind && old.path === current.path && old.sha256 === current.sha256,
      ),
    )
  )
    throw new Error("retired reference bytes cannot become active again");
  const expectedRetirements = [];
  for (const entry of previousActive) {
    const active = currentActive.some((current) => canonical(current) === canonical(entry));
    const retiredEntry = newlyRetired.filter((candidate) => {
      const original = { ...candidate };
      delete original.retired_from_handoff_id;
      delete original.reason;
      return (
        candidate.retired_from_handoff_id === previous.handoff_id &&
        canonical(original) === canonical(entry)
      );
    });
    if (Number(active) + retiredEntry.length !== 1)
      throw new Error("previous active reference must remain or retire exactly once");
    if (retiredEntry.length) expectedRetirements.push(retiredEntry[0]);
  }
  if (expectedRetirements.length !== newlyRetired.length)
    throw new Error("retired_refs contains a fabricated retirement");
  for (const failure of previous.failures) {
    const priorEvidence = previous.state.evidence_refs.find(
      (entry) => entry.path === failure.evidence_ref,
    );
    if (!input.state.evidence_refs.some((entry) => canonical(entry) === canonical(priorEvidence)))
      throw new Error("failure evidence cannot retire or change");
  }
}

export function prepareHandoff(previous, input) {
  validateSemantic(input);
  const handoffId = digest(input);
  if (previous) {
    validateRecord(previous);
    if (previous.status === "prepared" && previous.handoff_id === handoffId) {
      return { record: structuredClone(previous), changed: false };
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
    checkReferenceLineage(previous, input);
    const resumeGate = `resume:${previous.handoff_id}`;
    const resumeApproval = input.state.approval_refs.find((entry) => entry.gate === resumeGate);
    const resumeEvidence = input.state.evidence_refs.find(
      (entry) =>
        entry.path === resumeApproval?.path && entry.required && entry.validity === "valid",
    );
    const previousReferencePaths = new Set([
      ...previous.state.approval_refs.map((entry) => entry.path),
      ...previous.state.evidence_refs.map((entry) => entry.path),
      ...(previous.schema_version === 2
        ? previous.state.retired_refs.map((entry) => entry.path)
        : []),
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
      (previous.stop.active &&
        (input.stop.reason !== previous.stop.reason ||
          input.stop.resume_condition !== previous.stop.resume_condition)) ||
      (previous.stop.active && !input.stop.active && !authorizedStopRecovery)
    )
      throw new Error("prepare cannot reset durable counters or STOP");
  } else if (
    input.schema_version === 2 &&
    (input.state.predecessor_handoff_id !== null || input.state.retired_refs.length)
  ) {
    throw new Error("genesis handoff cannot have predecessor or retired_refs");
  }
  return {
    record: { ...structuredClone(input), handoff_id: handoffId, status: "prepared" },
    changed: true,
  };
}

export function claimHandoff(record, { handoffId, executorId, currentProblem = null } = {}) {
  if (!ID.test(executorId)) throw new Error("invalid claim arguments");
  validateCurrentProblem(currentProblem);
  validateRecord(record);
  const next = structuredClone(record);
  if (next.handoff_id !== handoffId)
    return { record: next, result: { decision: "STOP_DUPLICATE_OR_STALE" }, changed: false };
  if (next.rollover.claim) {
    if (currentProblem)
      return { record: next, result: { decision: currentProblem }, changed: false };
    const result =
      next.rollover.claim.executor_id === executorId
        ? { decision: "STOP_RECONCILIATION_REQUIRED", launch_allowed: false }
        : { decision: "STOP_DUPLICATE_OR_STALE" };
    return { record: next, result, changed: false };
  }
  const result = decideHandoff(next, { currentProblem });
  if (result.decision !== "ROLLOVER_READY") return { record: next, result, changed: false };
  next.status = "claimed";
  next.rollover.claim = { executor_id: executorId };
  return { record: next, result: { decision: "CLAIMED", idempotent: false }, changed: true };
}

export function receiptHandoff(
  record,
  { handoffId, executorId, sessionId, currentProblem = null } = {},
) {
  if (
    !ID.test(executorId) ||
    !ID.test(sessionId) ||
    /^(?:client|pending|unknown|timeout)/i.test(sessionId)
  )
    throw new Error("invalid receipt arguments");
  validateCurrentProblem(currentProblem);
  validateRecord(record);
  const next = structuredClone(record);
  if (
    next.handoff_id !== handoffId ||
    !next.rollover.claim ||
    next.rollover.claim.executor_id !== executorId
  )
    return { record: next, result: { decision: "STOP_DUPLICATE_OR_STALE" }, changed: false };
  if (currentProblem) return { record: next, result: { decision: currentProblem }, changed: false };
  if (next.rollover.receipt) {
    const result =
      next.rollover.receipt.executor_id === executorId &&
      next.rollover.receipt.session_id === sessionId
        ? { decision: "RECEIPT_RECORDED", idempotent: true }
        : { decision: "STOP_DUPLICATE_OR_STALE" };
    return { record: next, result, changed: false };
  }
  next.status = "receipted";
  next.rollover.receipt = { executor_id: executorId, session_id: sessionId };
  next.task.used_rollovers += 1;
  return {
    record: next,
    result: { decision: "RECEIPT_RECORDED", idempotent: false },
    changed: true,
  };
}
