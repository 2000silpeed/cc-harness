import { afterEach, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
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
import { resolve } from "node:path";

const script = resolve("scripts/ax-session.mjs");
const temporary: string[] = [];
const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "ax-session-"));
  temporary.push(root);
  return root;
}

function run(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

function question(
  ledger: string,
  role = "담당자",
  topic = "예약",
  text = "어떻게 하나요?",
  extra: string[] = [],
) {
  return run(
    "question",
    "--ledger",
    ledger,
    "--role",
    role,
    "--topic",
    topic,
    "--text",
    text,
    ...extra,
  );
}

function record(source: string, result: string, out: string) {
  return run("record-result", "--source", source, "--result", result, "--out", out);
}

function resultFixture(root: string) {
  const source = resolve(root, "agent.py");
  const result = resolve(root, "judge.json");
  const out = resolve(root, "bundles");
  writeFileSync(source, Buffer.from("print('ok')\n"));
  const payload = {
    agent_sha256: sha(readFileSync(source)),
    score: { passed: 1 },
    private_note: "do not print",
  };
  writeFileSync(result, JSON.stringify(payload));
  return { source, result, out, payload };
}

afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

it("Q1 should save a first question with UTC time and normalized tuple", () => {
  const ledger = resolve(fixture(), "questions.jsonl");
  const call = question(ledger, " 담당자 ", " cafe\u0301 ");
  expect(call.status, call.stderr).toBe(0);
  const rows = readFileSync(ledger, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ role: "담당자", topic: "café", text: "어떻게 하나요?" });
  expect(new Date(rows[0].at).toISOString()).toBe(rows[0].at);
});

it("Q2 should reject a normalized duplicate without changing ledger bytes", () => {
  const ledger = resolve(fixture(), "questions.jsonl");
  expect(question(ledger, " 담당자 ", " cafe\u0301 ").status).toBe(0);
  const before = readFileSync(ledger);
  expect(question(ledger, "담당자", "café").status).toBe(2);
  expect(readFileSync(ledger)).toEqual(before);
});

it("Q3 should allow a reasoned follow up and preserve the reason", () => {
  const ledger = resolve(fixture(), "questions.jsonl");
  expect(question(ledger).status).toBe(0);
  expect(
    question(ledger, "담당자", "예약", "취소는요?", ["--follow-up", "취소 정책 확인"]).status,
  ).toBe(0);
  const rows = readFileSync(ledger, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(rows).toHaveLength(2);
  expect(rows[1]).toMatchObject({ text: "취소는요?", follow_up: "취소 정책 확인" });
});

it("Q4 should preserve ledger for whitespace input, empty reason, or corrupt rows", () => {
  const ledger = resolve(fixture(), "questions.jsonl");
  expect(question(ledger, " ").status).toBe(1);
  expect(existsSync(ledger)).toBe(false);
  expect(question(ledger).status).toBe(0);
  const before = readFileSync(ledger);
  expect(question(ledger, "담당자", "예약", "재질문", ["--follow-up", "  "]).status).toBe(1);
  expect(readFileSync(ledger)).toEqual(before);
  writeFileSync(ledger, '{"role":"담당자","topic":"예약"}\n');
  const corrupt = readFileSync(ledger);
  expect(question(ledger, "다른", "주제").status).toBe(1);
  expect(readFileSync(ledger)).toEqual(corrupt);
});

it("Q5 should permit at most one simultaneous identical question", async () => {
  const ledger = resolve(fixture(), "questions.jsonl");
  const args = [
    script,
    "question",
    "--ledger",
    ledger,
    "--role",
    "담당자",
    "--topic",
    "예약",
    "--text",
    "질문",
  ];
  const launch = () =>
    new Promise<number | null>((done) => {
      const child = spawn(process.execPath, args, { stdio: "ignore" });
      child.on("exit", (code) => done(code));
    });
  const codes = await Promise.all([launch(), launch()]);
  expect(codes.sort()).toEqual([0, 2]);
  expect(readFileSync(ledger, "utf8").trim().split("\n")).toHaveLength(1);
});

it("Q4 should leave a foreign lock intact and ledger unchanged", () => {
  const ledger = resolve(fixture(), "questions.jsonl");
  writeFileSync(`${ledger}.lock`, "foreign");
  expect(question(ledger).status).toBe(2);
  expect(existsSync(ledger)).toBe(false);
  expect(readFileSync(`${ledger}.lock`, "utf8")).toBe("foreign");
});

it("Q4 should reject a blank ledger row without changing bytes", () => {
  const ledger = resolve(fixture(), "questions.jsonl");
  expect(question(ledger).status).toBe(0);
  const corrupt = Buffer.concat([readFileSync(ledger), Buffer.from("\n")]);
  writeFileSync(ledger, corrupt);
  expect(question(ledger, "다른", "주제").status).toBe(1);
  expect(readFileSync(ledger)).toEqual(corrupt);
});

it("R1 should preserve byte snapshots and manifest under two content hashes", () => {
  const { source, result, out, payload } = resultFixture(fixture());
  const sourceBytes = readFileSync(source);
  const resultBytes = readFileSync(result);
  const call = record(source, result, out);
  expect(call.status, call.stderr).toBe(0);
  const bundle = resolve(out, sha(sourceBytes), sha(resultBytes));
  expect(readFileSync(resolve(bundle, "source.snapshot"))).toEqual(sourceBytes);
  expect(readFileSync(resolve(bundle, "result.snapshot"))).toEqual(resultBytes);
  expect(JSON.parse(readFileSync(resolve(bundle, "manifest.json"), "utf8"))).toMatchObject({
    source_sha256: payload.agent_sha256,
    result_sha256: sha(resultBytes),
    source,
    result,
  });
  expect(readFileSync(source)).toEqual(sourceBytes);
  expect(readFileSync(result)).toEqual(resultBytes);
  expect(call.stdout).not.toContain("private_note");
});

it("R2 should reject missing, mismatched, and malformed results without an output bundle", () => {
  const { source, result, out, payload } = resultFixture(fixture());
  for (const value of [
    JSON.stringify({ score: 1 }),
    JSON.stringify({ ...payload, agent_sha256: "0".repeat(64) }),
    "{",
  ]) {
    writeFileSync(result, value);
    expect(record(source, result, out).status).toBe(1);
    expect(existsSync(out) ? readdirSync(out) : []).toHaveLength(0);
  }
});

it("R3 should not overwrite an existing bundle", () => {
  const { source, result, out } = resultFixture(fixture());
  expect(record(source, result, out).status).toBe(0);
  const bundle = resolve(out, sha(readFileSync(source)), sha(readFileSync(result)));
  const before = ["source.snapshot", "result.snapshot", "manifest.json"].map((name) =>
    readFileSync(resolve(bundle, name)),
  );
  expect(record(source, result, out).status).toBe(2);
  expect(
    ["source.snapshot", "result.snapshot", "manifest.json"].map((name) =>
      readFileSync(resolve(bundle, name)),
    ),
  ).toEqual(before);
});

it("R4 should preserve the old bundle and reject an old result after source changes", () => {
  const { source, result, out } = resultFixture(fixture());
  expect(record(source, result, out).status).toBe(0);
  const bundle = resolve(out, sha(readFileSync(source)), sha(readFileSync(result)));
  const snapshot = readFileSync(resolve(bundle, "source.snapshot"));
  writeFileSync(source, "print('changed')\n");
  expect(record(source, result, out).status).toBe(1);
  expect(readFileSync(resolve(bundle, "source.snapshot"))).toEqual(snapshot);
});

it("R5 should reject a preexisting source hash symlink without writing outside output root", () => {
  const root = fixture();
  const { source, result, out } = resultFixture(root);
  const external = resolve(root, "external");
  mkdirSync(out);
  mkdirSync(external);
  symlinkSync(external, resolve(out, sha(readFileSync(source))));
  const call = record(source, result, out);
  expect(call.status).toBe(1);
  expect(readdirSync(external)).toHaveLength(0);
});
