import { afterEach, expect, it } from "vitest";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const temporary: string[] = [];
const registryPath = "docs/harness/registry.json";
const skillPath = ".agents/skills/example/SKILL.md";
const methodPath = "docs/methods/testing-strategy.md";
const repository = process.cwd();
const handoffScript = "scripts/session-handoff.mjs";

afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function directory() {
  const root = mkdtempSync(resolve(tmpdir(), "harness-portability-"));
  temporary.push(root);
  return root;
}

function write(root: string, filename: string, content: string) {
  const destination = resolve(root, filename);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function registry() {
  return {
    schemaVersion: 2,
    skills: [{ name: "example", path: skillPath, kind: "procedure" }],
    documents: [methodPath],
    supportFiles: [] as string[],
    distributionTools: ["scripts/check-harness.mjs", "scripts/install-harness.mjs"],
  };
}

function fixture() {
  const root = directory();
  write(root, registryPath, JSON.stringify(registry()));
  write(
    root,
    skillPath,
    "---\nname: example\ndescription: Example procedure\n---\nRead `" + methodPath + "`.\n",
  );
  write(root, methodPath, "# Testing\n");
  for (const script of registry().distributionTools) {
    write(root, script, readFileSync(resolve(repository, script), "utf8"));
  }
  return root;
}

function run(root: string, script = "check-harness", args: string[] = []) {
  return spawnSync(process.execPath, [resolve(root, "scripts", script + ".mjs"), ...args], {
    cwd: tmpdir(),
    encoding: "utf8",
    env: { ...process.env, PATH: "" },
  });
}

function git(root: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

function sha256(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

function handoffRepository() {
  const root = directory();
  write(root, "scope.md", "approved scope\n");
  write(root, "rollover.md", "one rollover\n");
  write(root, "next-stage.md", "ac verification approved\n");
  write(root, "resume.md", "resume condition resolved\n");
  write(root, "contract.md", "contract\n");
  write(root, "evidence.json", '{"passed":true}\n');
  write(root, "tracked.txt", "baseline\n");
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Test");
  git(root, "add", ".");
  git(root, "commit", "-qm", "fixture");
  write(root, "tracked.txt", "worker change\n");
  return root;
}

function reference(root: string, path: string) {
  return { path, sha256: sha256(readFileSync(resolve(root, path))) };
}

function handoffInput(root: string, overrides: Record<string, unknown> = {}) {
  const base = {
    schema_version: 1,
    sequence: 1,
    task: {
      objective: "Verify the approved issue",
      approved_scope_ref: "scope.md",
      rollover_authority_ref: "rollover.md",
      max_rollovers: 1,
      used_rollovers: 0,
    },
    checkpoint: {
      mode: "RESUME",
      stage: "green",
      stage_status: "passed",
      action_kind: "phase",
      next_stage: "ac-verification",
      next_skill: "ac-verifier",
      next_action: "Verify AC-1 against the focused test evidence.",
    },
    state: {
      source_revision: git(root, "rev-parse", "HEAD"),
      dirty_manifest: [{ path: "tracked.txt", sha256: sha256("worker change\n"), owner: "worker" }],
      contract_hashes: { "contract.md": reference(root, "contract.md").sha256 },
      approval_refs: [
        { gate: "scope", ...reference(root, "scope.md"), status: "approved" },
        { gate: "rollover", ...reference(root, "rollover.md"), status: "approved" },
        {
          gate: "stage:ac-verification",
          ...reference(root, "next-stage.md"),
          status: "approved",
        },
      ],
      evidence_refs: [{ ...reference(root, "evidence.json"), required: true, validity: "valid" }],
      evidence_validity: "valid",
    },
    budgets: {
      green: { limit: 3, used: 3 },
      diagnostic: { limit: 1, used: 0 },
      rework_count: 0,
    },
    failures: [],
    activity: { workers: [], external_actions: [] },
    stop: { active: false, reason: null, resume_condition: null, resolution_ref: null },
    rollover: { requested: "fresh-session", claim: null, receipt: null },
  };
  return { ...base, ...overrides };
}

function runHandoff(root: string, args: string[]) {
  return spawnSync(process.execPath, [resolve(repository, handoffScript), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PATH: process.env.PATH ?? "" },
  });
}

function prepareHandoff(root: string, input = handoffInput(root)) {
  const inputPath = resolve(directory(), "input.json");
  const statePath = resolve(root, "docs/features/example/session-handoff.json");
  writeFileSync(inputPath, JSON.stringify(input));
  const result = runHandoff(root, ["prepare", "--input", inputPath, "--state", statePath]);
  return {
    result,
    statePath,
    state: existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

it("ships the session handoff helper in an installed harness", () => {
  const target = directory();
  const installed = run(repository, "install-harness", ["--target", target, "--apply"]);
  expect(installed.status, installed.stderr).toBe(0);
  expect(existsSync(resolve(target, handoffScript))).toBe(true);
});

it("exposes compact help and a machine-readable input template", () => {
  const help = runHandoff(repository, ["--help"]);
  expect(help.status, help.stderr).toBe(0);
  expect(help.stdout).toContain("template");
  expect(help.stdout).toContain("prepare|decide|claim|receipt");
  const template = runHandoff(repository, ["template"]);
  expect(template.status, template.stderr).toBe(0);
  expect(JSON.parse(template.stdout)).toMatchObject({
    schema_version: 1,
    task: { approved_scope_ref: "<project-relative-path>" },
    checkpoint: { mode: "RESUME" },
    failures: [],
  });
});

it("prepares a stable record and distinguishes phase continuation from fresh rollover", () => {
  const root = handoffRepository();
  const first = prepareHandoff(root);
  expect(first.result.status, first.result.stderr).toBe(0);
  const second = prepareHandoff(root);
  expect(second.result.status, second.result.stderr).toBe(0);
  expect(second.state.handoff_id).toBe(first.state.handoff_id);

  const rolloverDecision = runHandoff(root, ["decide", "--state", first.statePath, "--root", root]);
  expect(JSON.parse(rolloverDecision.stdout).decision).toBe("ROLLOVER_READY");
  expect(JSON.parse(rolloverDecision.stdout)).not.toHaveProperty("launch_prompt");
  expect(JSON.parse(rolloverDecision.stdout)).not.toHaveProperty("resume_prompt");
  expect(JSON.parse(rolloverDecision.stdout)).not.toHaveProperty("instruction");

  const phaseRoot = handoffRepository();
  const phaseInput = handoffInput(phaseRoot, {
    rollover: { requested: "continue-current", claim: null, receipt: null },
  });
  const phase = prepareHandoff(phaseRoot, phaseInput);
  expect(phase.result.status, phase.result.stderr).toBe(0);
  const phaseDecision = runHandoff(phaseRoot, [
    "decide",
    "--state",
    phase.statePath,
    "--root",
    phaseRoot,
  ]);
  expect(phaseDecision.status, phaseDecision.stderr).toBe(0);
  expect(JSON.parse(phaseDecision.stdout)).toMatchObject({
    decision: "PHASE_READY",
    next_skill: "ac-verifier",
  });
  expect(phaseDecision.stdout).toContain("perform only checkpoint.next_action");
});

it.each([
  ["missing key", (input: any) => delete input.stop],
  ["extra key", (input: any) => (input.extra = true)],
  ["bad counter", (input: any) => (input.budgets.green.used = 4)],
  ["unknown owner", (input: any) => (input.state.dirty_manifest[0].owner = "unknown")],
  [
    "duplicate approval gate",
    (input: any) => input.state.approval_refs.push({ ...input.state.approval_refs[0] }),
  ],
])("fails closed while preparing malformed state: %s", (_name, mutate) => {
  const root = handoffRepository();
  const input: any = handoffInput(root);
  mutate(input);
  const prepared = prepareHandoff(root, input);
  expect(prepared.result.status).toBe(1);
  expect(prepared.state).toBeNull();
});

it("rejects state path escape and symlink paths", () => {
  const root = handoffRepository();
  const inputPath = resolve(directory(), "input.json");
  writeFileSync(inputPath, JSON.stringify(handoffInput(root)));
  const escaped = runHandoff(root, [
    "prepare",
    "--input",
    inputPath,
    "--state",
    resolve(root, "outside.json"),
  ]);
  expect(escaped.status).toBe(1);

  const outside = directory();
  mkdirSync(resolve(root, "docs/features"), { recursive: true });
  symlinkSync(outside, resolve(root, "docs/features/example"));
  const linked = runHandoff(root, [
    "prepare",
    "--input",
    inputPath,
    "--state",
    resolve(root, "docs/features/example/session-handoff.json"),
  ]);
  expect(linked.status).toBe(1);
  expect(readdirSync(outside)).toEqual([]);
});

it.each([
  ["changed source", (root: string) => git(root, "commit", "--allow-empty", "-qm", "new")],
  ["changed dirty file", (root: string) => write(root, "tracked.txt", "changed again\n")],
  ["unlisted dirty file", (root: string) => write(root, "new.txt", "unlisted\n")],
  ["changed contract", (root: string) => write(root, "contract.md", "changed\n")],
  ["changed approval", (root: string) => write(root, "scope.md", "changed\n")],
  ["changed evidence", (root: string) => write(root, "evidence.json", '{"passed":false}\n')],
])("stops when persisted identity becomes stale: %s", (_name, mutate) => {
  const root = handoffRepository();
  const prepared = prepareHandoff(root);
  expect(prepared.result.status, prepared.result.stderr).toBe(0);
  mutate(root);
  const decision = runHandoff(root, ["decide", "--state", prepared.statePath, "--root", root]);
  expect(JSON.parse(decision.stdout).decision).toMatch(/^STOP_/);
});

it.each([
  ["missing scope approval", (input: any) => input.state.approval_refs.shift()],
  ["unknown evidence", (input: any) => (input.state.evidence_validity = "unknown")],
  [
    "active stop",
    (input: any) =>
      (input.stop = {
        active: true,
        reason: "blocked",
        resume_condition: "fix",
        resolution_ref: null,
      }),
  ],
  ["pending worker", (input: any) => input.activity.workers.push({ id: "w1", status: "pending" })],
  [
    "unknown external action",
    (input: any) => input.activity.external_actions.push({ id: "x1", status: "unknown" }),
  ],
  ["missing rollover authority", (input: any) => (input.task.rollover_authority_ref = null)],
  ["rollover budget", (input: any) => (input.task.used_rollovers = 1)],
])("does not ready an unsafe handoff: %s", (_name, mutate) => {
  const root = handoffRepository();
  const input: any = handoffInput(root);
  mutate(input);
  const prepared = prepareHandoff(root, input);
  expect(prepared.result.status, prepared.result.stderr).toBe(0);
  const decision = runHandoff(root, ["decide", "--state", prepared.statePath, "--root", root]);
  expect(JSON.parse(decision.stdout).decision).toMatch(/^STOP_/);
});

it("applies a budget only to its relevant next action", () => {
  const root = handoffRepository();
  const acVerification = prepareHandoff(root);
  expect(acVerification.result.status, acVerification.result.stderr).toBe(0);
  expect(
    JSON.parse(
      runHandoff(root, ["decide", "--state", acVerification.statePath, "--root", root]).stdout,
    ).decision,
  ).toBe("ROLLOVER_READY");

  const greenRoot = handoffRepository();
  const nextGreen: any = handoffInput(greenRoot);
  nextGreen.checkpoint.stage = "red";
  nextGreen.checkpoint.next_stage = "green";
  nextGreen.checkpoint.next_skill = "tdd-green";
  nextGreen.state.approval_refs.push({
    gate: "stage:green",
    ...reference(greenRoot, "next-stage.md"),
    status: "approved",
  });
  const stopped = prepareHandoff(greenRoot, nextGreen);
  expect(stopped.result.status, stopped.result.stderr).toBe(0);
  const decision = runHandoff(greenRoot, [
    "decide",
    "--state",
    stopped.statePath,
    "--root",
    greenRoot,
  ]);
  expect(JSON.parse(decision.stdout).decision).toBe("STOP_BUDGET_EXHAUSTED");
});

it("requires explicit current-stage authority before pending work or rollover", () => {
  const root = handoffRepository();
  const input: any = handoffInput(root);
  input.checkpoint.stage_status = "pending";
  input.checkpoint.next_stage = "green";
  input.checkpoint.next_skill = "tdd-green";
  input.state.approval_refs = input.state.approval_refs.filter(
    (entry: { gate: string }) => entry.gate !== "stage:ac-verification",
  );
  const prepared = prepareHandoff(root, input);
  expect(prepared.result.status, prepared.result.stderr).toBe(0);
  const stopped = runHandoff(root, ["decide", "--state", prepared.statePath, "--root", root]);
  expect(JSON.parse(stopped.stdout).decision).toBe("STOP_APPROVAL_REQUIRED");

  const approvedRoot = handoffRepository();
  const approved: any = handoffInput(approvedRoot);
  approved.checkpoint.stage_status = "pending";
  approved.checkpoint.next_stage = "green";
  approved.checkpoint.next_skill = "tdd-green";
  approved.budgets.green.used = 2;
  approved.state.approval_refs = approved.state.approval_refs.filter(
    (entry: { gate: string }) => entry.gate !== "stage:ac-verification",
  );
  approved.state.approval_refs.push({
    gate: "stage:green",
    ...reference(approvedRoot, "next-stage.md"),
    status: "approved",
  });
  const ready = prepareHandoff(approvedRoot, approved);
  expect(ready.result.status, ready.result.stderr).toBe(0);
  const decision = runHandoff(approvedRoot, [
    "decide",
    "--state",
    ready.statePath,
    "--root",
    approvedRoot,
  ]);
  expect(JSON.parse(decision.stdout).decision).toBe("ROLLOVER_READY");
});

it("applies diagnostic budget through an explicit read-only action kind", () => {
  const root = handoffRepository();
  const input: any = handoffInput(root);
  input.checkpoint.stage_status = "pending";
  input.checkpoint.action_kind = "diagnostic";
  input.checkpoint.next_stage = "green";
  input.checkpoint.next_skill = "harness-cycle";
  input.state.approval_refs = input.state.approval_refs.filter(
    (entry: { gate: string }) => entry.gate !== "stage:ac-verification",
  );
  input.state.approval_refs.push({
    gate: "stage:green",
    ...reference(root, "next-stage.md"),
    status: "approved",
  });
  input.budgets.diagnostic.used = 1;
  const prepared = prepareHandoff(root, input);
  expect(prepared.result.status, prepared.result.stderr).toBe(0);
  const decision = runHandoff(root, ["decide", "--state", prepared.statePath, "--root", root]);
  expect(JSON.parse(decision.stdout)).toMatchObject({
    decision: "STOP_BUDGET_EXHAUSTED",
    budget: "diagnostic",
  });
});

it("requires new authenticated evidence to clear STOP and keeps limits immutable", () => {
  const root = handoffRepository();
  const stoppedInput: any = handoffInput(root);
  stoppedInput.stop = {
    active: true,
    reason: "broken fixture",
    resume_condition: "record verified repair",
    resolution_ref: null,
  };
  const stopped = prepareHandoff(root, stoppedInput);
  expect(stopped.result.status, stopped.result.stderr).toBe(0);

  const unauthorized: any = handoffInput(root);
  unauthorized.sequence = 2;
  const rejected = prepareHandoff(root, unauthorized);
  expect(rejected.result.status).toBe(1);
  expect(rejected.result.stderr).toContain("cannot reset durable counters or STOP");

  const recovery: any = handoffInput(root);
  recovery.sequence = 2;
  recovery.stop = {
    active: false,
    reason: "broken fixture",
    resume_condition: "record verified repair",
    resolution_ref: "resume.md",
  };
  recovery.state.approval_refs.push({
    gate: `resume:${stopped.state.handoff_id}`,
    ...reference(root, "resume.md"),
    status: "approved",
  });
  recovery.state.evidence_refs.push({
    ...reference(root, "resume.md"),
    required: true,
    validity: "valid",
  });
  const recovered = prepareHandoff(root, recovery);
  expect(recovered.result.status, recovered.result.stderr).toBe(0);

  const raised: any = handoffInput(root);
  raised.sequence = 3;
  raised.task.max_rollovers = 2;
  const capChange = prepareHandoff(root, raised);
  expect(capChange.result.status).toBe(1);
  expect(capChange.result.stderr).toContain("limits are immutable");
});

it("claims once, requires reconciliation after ambiguity, and resumes only the receipted session", () => {
  const root = handoffRepository();
  const prepared = prepareHandoff(root);
  expect(prepared.result.status, prepared.result.stderr).toBe(0);
  const args = [
    "claim",
    "--state",
    prepared.statePath,
    "--handoff-id",
    prepared.state.handoff_id,
    "--executor-id",
    "executor-1",
  ];
  const claimed = runHandoff(root, args);
  expect(JSON.parse(claimed.stdout)).toMatchObject({ decision: "CLAIMED", idempotent: false });
  expect(claimed.stdout).toContain("do not read or mutate project state");
  expect(claimed.stdout).not.toContain("Use $harness-cycle");
  const replay = JSON.parse(runHandoff(root, args).stdout);
  expect(replay.decision).toBe("STOP_RECONCILIATION_REQUIRED");
  expect(replay).not.toHaveProperty("launch_prompt");
  expect(JSON.parse(runHandoff(root, [...args.slice(0, -1), "executor-2"]).stdout).decision).toBe(
    "STOP_DUPLICATE_OR_STALE",
  );
  expect(
    JSON.parse(runHandoff(root, ["decide", "--state", prepared.statePath, "--root", root]).stdout)
      .decision,
  ).toBe("STOP_RECONCILIATION_REQUIRED");

  const receiptArgs = [
    "receipt",
    "--state",
    prepared.statePath,
    "--handoff-id",
    prepared.state.handoff_id,
    "--executor-id",
    "executor-1",
    "--session-id",
    "session-real-1",
  ];
  const receipt = runHandoff(root, receiptArgs);
  expect(JSON.parse(receipt.stdout).decision).toBe("RECEIPT_RECORDED");
  expect(receipt.stdout).toContain("Use $harness-cycle in RESUME mode");
  expect(receipt.stdout).toContain("decide --state");
  expect(receipt.stdout).toContain("--session-id session-real-1");
  expect(JSON.parse(runHandoff(root, receiptArgs).stdout).decision).toBe("RECEIPT_RECORDED");
  const resumed = runHandoff(root, [
    "decide",
    "--state",
    prepared.statePath,
    "--root",
    root,
    "--session-id",
    "session-real-1",
  ]);
  expect(JSON.parse(resumed.stdout)).toMatchObject({
    decision: "CONTINUE_CURRENT",
    transfer: "confirmed-receipt",
  });
  const wrongSession = runHandoff(root, [
    "decide",
    "--state",
    prepared.statePath,
    "--root",
    root,
    "--session-id",
    "session-other",
  ]);
  expect(JSON.parse(wrongSession.stdout).decision).toBe("STOP_ALREADY_TRANSFERRED");

  const progress: any = handoffInput(root);
  progress.sequence = 2;
  progress.task.used_rollovers = 1;
  progress.checkpoint.stage = "ac-verification";
  progress.checkpoint.next_stage = "refactor";
  progress.checkpoint.next_skill = "tdd-refactor";
  progress.checkpoint.next_action =
    "Refactor the verified implementation without changing behavior.";
  progress.rollover.requested = "continue-current";
  progress.state.approval_refs.push({
    gate: "stage:refactor",
    ...reference(root, "resume.md"),
    status: "approved",
  });
  const continued = prepareHandoff(root, progress);
  expect(continued.result.status, continued.result.stderr).toBe(0);
  const continuedDecision = runHandoff(root, [
    "decide",
    "--state",
    continued.statePath,
    "--root",
    root,
  ]);
  expect(JSON.parse(continuedDecision.stdout)).toMatchObject({
    decision: "PHASE_READY",
    next_skill: "tdd-refactor",
  });
});

it("freezes project identity after claim until receipt or reconciliation", () => {
  const root = handoffRepository();
  const prepared = prepareHandoff(root);
  const claim = runHandoff(root, [
    "claim",
    "--state",
    prepared.statePath,
    "--handoff-id",
    prepared.state.handoff_id,
    "--executor-id",
    "executor-1",
  ]);
  expect(JSON.parse(claim.stdout).decision).toBe("CLAIMED");
  write(root, "tracked.txt", "mutation after claim\n");
  const receipt = runHandoff(root, [
    "receipt",
    "--state",
    prepared.statePath,
    "--handoff-id",
    prepared.state.handoff_id,
    "--executor-id",
    "executor-1",
    "--session-id",
    "session-real-1",
  ]);
  expect(JSON.parse(receipt.stdout).decision).toBe("STOP_DIRTY_STALE");
  expect(receipt.stdout).not.toContain("resume_prompt");
});

it("disables automated decisions and claims when Git identity is unavailable", () => {
  const root = handoffRepository();
  const prepared = prepareHandoff(root);
  expect(prepared.result.status, prepared.result.stderr).toBe(0);
  rmSync(resolve(root, ".git"), { recursive: true, force: true });
  const decision = runHandoff(root, ["decide", "--state", prepared.statePath, "--root", root]);
  expect(decision.status, decision.stderr).toBe(0);
  expect(JSON.parse(decision.stdout).decision).toBe("STOP_SOURCE_UNAVAILABLE");
  const claim = runHandoff(root, [
    "claim",
    "--state",
    prepared.statePath,
    "--handoff-id",
    prepared.state.handoff_id,
    "--executor-id",
    "executor-1",
  ]);
  expect(JSON.parse(claim.stdout).decision).toBe("STOP_SOURCE_UNAVAILABLE");
});

it("blocks repeated prepare from resetting rollover use or chaining the same checkpoint", () => {
  const root = handoffRepository();
  const prepared = prepareHandoff(root);
  runHandoff(root, [
    "claim",
    "--state",
    prepared.statePath,
    "--handoff-id",
    prepared.state.handoff_id,
    "--executor-id",
    "executor-1",
  ]);
  runHandoff(root, [
    "receipt",
    "--state",
    prepared.statePath,
    "--handoff-id",
    prepared.state.handoff_id,
    "--executor-id",
    "executor-1",
    "--session-id",
    "session-real-1",
  ]);
  const replay = prepareHandoff(root);
  expect(replay.result.status).toBe(1);
  expect(replay.result.stderr).toContain("no-progress");
  const persisted = JSON.parse(readFileSync(prepared.statePath, "utf8"));
  expect(persisted.task.used_rollovers).toBe(1);
});

/* eslint-enable @typescript-eslint/no-explicit-any */

it("validates a standalone distribution without npm, package, or product files", () => {
  const root = fixture();
  const result = run(root);
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  expect(existsSync(resolve(root, "package.json"))).toBe(false);
});

it("dry-runs, applies only registered files, and repeats idempotently", () => {
  const source = fixture();
  const target = directory();
  for (const filename of [
    "package.json",
    "AGENTS.md",
    ".husky/pre-commit",
    "docs/features/example-product/spec-fixed.md",
    "source.pdf",
  ])
    write(source, filename, "not distributable");
  expect(run(source, "install-harness", ["--target", target]).status).toBe(0);
  expect(readdirSync(target)).toEqual([]);
  expect(run(source, "install-harness", ["--target", target, "--apply"]).status).toBe(0);
  expect(run(target).status).toBe(0);
  const repeated = run(source, "install-harness", ["--target", target, "--apply"]);
  expect(repeated.status).toBe(0);
  expect(repeated.stdout).not.toContain("created:");
  for (const filename of ["package.json", "AGENTS.md", ".husky", "docs/features", "source.pdf"])
    expect(existsSync(resolve(target, filename))).toBe(false);
});

it("preserves conflicts and creates nothing on conflict", () => {
  const source = fixture();
  const target = directory();
  write(target, methodPath, "user content");
  const result = run(source, "install-harness", ["--target", target, "--apply"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("충돌");
  expect(readFileSync(resolve(target, methodPath), "utf8")).toBe("user content");
  expect(existsSync(resolve(target, registryPath))).toBe(false);
});

it.each([false, true])("rejects target ancestor symlinks including dangling=%s", (dangling) => {
  const source = fixture();
  const target = directory();
  const outside = directory();
  symlinkSync(dangling ? resolve(outside, "absent") : outside, resolve(target, "docs"));
  expect(run(source, "install-harness", ["--target", target, "--apply"]).status).toBe(1);
  expect(readdirSync(outside)).toEqual([]);
  expect(existsSync(resolve(target, ".agents"))).toBe(false);
});

it.each([
  null,
  [],
  {},
  { ...registry(), schemaVersion: 1 },
  { ...registry(), skills: null },
  { ...registry(), sources: [] },
  { ...registry(), documents: [42] },
])("rejects malformed registry %j", (invalid) => {
  const root = fixture();
  write(root, registryPath, JSON.stringify(invalid));
  expect(run(root).status).toBe(1);
});

it("rejects invalid JSON", () => {
  const root = fixture();
  write(root, registryPath, "{");
  expect(run(root).status).toBe(1);
});

it.each([
  "../outside.md",
  "/tmp/outside.md",
  "docs/../outside.md",
  "docs\\outside.md",
  "docs//outside.md",
])("rejects unsafe registered path %s", (path) => {
  const root = fixture();
  write(root, registryPath, JSON.stringify({ ...registry(), documents: [path] }));
  expect(run(root).status).toBe(1);
});

it("rejects duplicate paths across registry groups and duplicate skill names", () => {
  const root = fixture();
  write(root, registryPath, JSON.stringify({ ...registry(), supportFiles: [methodPath] }));
  expect(run(root).stderr).toContain("중복 경로");
  write(
    root,
    registryPath,
    JSON.stringify({ ...registry(), skills: [...registry().skills, ...registry().skills] }),
  );
  expect(run(root).stderr).toContain("중복 스킬");
});

it.each([
  "no header",
  "---\nname: wrong\ndescription: present\n---\n",
  "---\nname: example\n---\n",
])("rejects invalid frontmatter %s", (content) => {
  const root = fixture();
  write(root, skillPath, content);
  expect(run(root).status).toBe(1);
});

it.each([
  [
    "valid",
    "example",
    "---\nname: example\ndescription: Example procedure\n---\n`" + skillPath + "`",
    0,
  ],
  [
    "prefixed",
    "harness-example",
    "---\nname: harness-example\ndescription: Example procedure\n---\n`" + skillPath + "`",
    0,
  ],
  [
    "mismatched name",
    "harness-example",
    "---\nname: example\ndescription: Example procedure\n---\n`" + skillPath + "`",
    1,
  ],
  [
    "unknown prefix",
    "my-example",
    "---\nname: my-example\ndescription: Example procedure\n---\n`" + skillPath + "`",
    1,
  ],
  ["drifted", "example", "---\nname: example\ndescription: Changed\n---\n`" + skillPath + "`", 1],
  ["unlinked", "example", "---\nname: example\ndescription: Example procedure\n---\n", 1],
])("checks Claude skill entry point: %s", (_kind, entry, content, status) => {
  const root = fixture();
  const claudePath = `.claude/skills/${entry}/SKILL.md`;
  write(root, claudePath, content as string);
  write(root, registryPath, JSON.stringify({ ...registry(), supportFiles: [claudePath] }));
  expect(run(root).status).toBe(status);
});

it("requires Claude entry points for every skill once any is registered", () => {
  const root = fixture();
  const otherPath = ".agents/skills/other/SKILL.md";
  const claudePath = ".claude/skills/example/SKILL.md";
  write(root, otherPath, "---\nname: other\ndescription: Other procedure\n---\n");
  write(
    root,
    claudePath,
    "---\nname: example\ndescription: Example procedure\n---\n`" + skillPath + "`",
  );
  write(
    root,
    registryPath,
    JSON.stringify({
      ...registry(),
      skills: [...registry().skills, { name: "other", path: otherPath, kind: "procedure" }],
      supportFiles: [claudePath],
    }),
  );
  expect(run(root).stderr).toContain("Claude 진입점 누락: other");
});

it.each([
  "`docs/methods/missing.md`",
  "[missing](missing.md)",
  "[outside](../../../../outside.md)",
  "`.agents/skills/unknown/SKILL.md`",
])("rejects missing or unknown skill references %s", (reference) => {
  const root = fixture();
  write(root, skillPath, readFileSync(resolve(root, skillPath), "utf8") + reference);
  expect(run(root).status).toBe(1);
});

it.each(['""', "''", '"   "', "'   '", '"" # empty', "'' # empty"])(
  "rejects empty quoted description %s",
  (description) => {
    const root = fixture();
    write(root, skillPath, `---\nname: example\ndescription: ${description}\n---\n`);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("설명 없음");
  },
);

it.each(['"Valid description"', "'Valid description'"])(
  "accepts nonempty quoted description %s",
  (description) => {
    const root = fixture();
    write(root, skillPath, `---\nname: example\ndescription: ${description}\n---\n`);
    expect(run(root).status).toBe(0);
  },
);

it.each(["outside", "inside", "dangling", "encoded"])(
  "rejects symlink traversal before parent normalization: %s",
  (kind) => {
    const root = fixture();
    const outside = directory();
    write(root, "docs/methods/secret.md", "local decoy");
    write(outside, "secret.md", "outside destination");
    const destination =
      kind === "inside" ? resolve(root, "docs/harness") : resolve(outside, "deep");
    if (kind !== "dangling") mkdirSync(destination, { recursive: true });
    symlinkSync(destination, resolve(root, "docs/methods/jump"));
    const parent = kind === "encoded" ? "%2e%2e" : "..";
    write(root, methodPath, `[secret](jump/${parent}/secret.md)`);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("심볼릭 링크");
  },
);

it("accepts normal parent links into harness documents", () => {
  const root = fixture();
  write(root, methodPath, "[registry](../harness/registry.json)\n[local](./testing-strategy.md)");
  const result = run(root);
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
});

it("checks document links and accepts existing relative links with anchors", () => {
  const root = fixture();
  write(
    root,
    methodPath,
    "[skill](../../.agents/skills/example/SKILL.md#example)\n[external](https://example.com)\n",
  );
  expect(run(root).status).toBe(0);
  write(root, methodPath, "[missing](missing.md)");
  expect(run(root).status).toBe(1);
});

it.each(["file", "ancestor", "registry"])(
  "rejects %s symlinks in registered source paths",
  (kind) => {
    const root = fixture();
    const outside = directory();
    const filename =
      kind === "file" ? methodPath : kind === "registry" ? registryPath : "docs/methods";
    const original = resolve(root, filename);
    const destination = resolve(outside, "copy");
    cpSync(original, destination, { recursive: true });
    rmSync(original, { recursive: true });
    symlinkSync(destination, original);
    expect(run(root).status).toBe(1);
  },
);

it("exports the actual registry into an empty target and validates without product files", () => {
  const target = directory();
  const installed = run(repository, "install-harness", ["--target", target, "--apply"]);
  expect(installed.stderr).toBe("");
  expect(installed.status).toBe(0);
  const checked = run(target);
  expect(checked.stderr).toBe("");
  expect(checked.status).toBe(0);
  for (const filename of [
    "package.json",
    "AGENTS.md",
    "CLAUDE.md",
    ".claude/settings.json",
    ".husky",
    "docs/features",
    "node_modules",
    "docs/lessons",
  ])
    expect(existsSync(resolve(target, filename))).toBe(false);
  expect(existsSync(resolve(target, ".claude/skills/harness-cycle/SKILL.md"))).toBe(true);
});

it("preserves project-owned files while applying registered harness files", () => {
  const source = fixture();
  const target = directory();
  write(target, "AGENTS.md", "# Product-owned instructions\n");
  write(target, "docs/features/product/progress.md", "# Product-owned progress\n");

  const result = run(source, "install-harness", ["--target", target, "--apply"]);

  expect(result.status).toBe(0);
  expect(readFileSync(resolve(target, "AGENTS.md"), "utf8")).toBe("# Product-owned instructions\n");
  expect(readFileSync(resolve(target, "docs/features/product/progress.md"), "utf8")).toBe(
    "# Product-owned progress\n",
  );
  expect(existsSync(resolve(target, registryPath))).toBe(true);
});

it("ships a parseable adaptive-execution result example without inventing observation", () => {
  const templates = readFileSync(resolve(repository, "docs/harness/templates.md"), "utf8");
  const json = templates.match(
    /## Adaptive Execution 결과 JSON[\s\S]*?```json\n([\s\S]*?)\n```/m,
  )?.[1];

  expect(json).toBeTypeOf("string");
  const result = JSON.parse(json ?? "null");
  expect(result).toMatchObject({
    profile: "standard",
    requested: {
      worker: { model: "Sol", effort: "medium" },
      verifier: { model: "Sol", effort: "high" },
    },
    observed: {
      worker: { model: "unknown", effort: "unknown" },
      usage: { value: "unknown", source: "unavailable", unit: "unknown" },
    },
    diagnostic: { budget: 1, used: 0, remaining: 1 },
  });
  expect(result.evidence_reuse.checks).toContain(
    "same_relevant_code_contract_ac_test_command_environment",
  );
  expect(result).toMatchObject({
    source_revision: "<verified-source-revision>",
    contract_hashes: { "docs/methods/delivery-automation.md": "<sha256-of-effective-contract>" },
    policy_effective_checkpoint: "<approved-checkpoint>",
    evidence: [],
    evidence_validity: { state: "unknown", reason: "<not-yet-assessed>", refs: [] },
    green_attempts: { limit: 3, used: 3, remaining: 0 },
    retry_count: 2,
    diagnostic: {
      escalation_reason: "not-run",
      diagnostic_result: null,
      evidence_ref: null,
      requested: { model: "unknown", effort: "unknown" },
      observed: { model: "unknown", effort: "unknown" },
      context_id: null,
      approval_ref: null,
      status: "not-run",
    },
    failure: { current: null, previous: [] },
  });
});

it("keeps the delivery result example aligned with the reusable result shape", () => {
  const delivery = readFileSync(resolve(repository, "docs/methods/delivery-automation.md"), "utf8");
  const json = delivery.match(/다음 결과 JSON 템플릿[\s\S]*?```json\n([\s\S]*?)\n```/m)?.[1];

  expect(json).toBeTypeOf("string");
  const result = JSON.parse(json ?? "null");
  expect(result).toMatchObject({
    issue: "<approved-issue>",
    base: "<approved-base>",
    head: "<issue-branch>",
    attempt: 1,
    ac_passed: null,
    evidence: [],
    evidence_validity: { state: "unknown", reason: "<not-yet-assessed>", refs: [] },
    source_revision: "<verified-source-revision>",
    contract_hashes: { "docs/methods/delivery-automation.md": "<sha256-of-effective-contract>" },
    policy_effective_checkpoint: "<approved-checkpoint>",
    green_attempts: { limit: 3, used: 3, remaining: 0 },
    retry_count: 2,
    failure: { current: null, previous: [] },
  });
  expect("retry" in result).toBe(false);
  expect("effective_checkpoint" in result).toBe(false);
});
