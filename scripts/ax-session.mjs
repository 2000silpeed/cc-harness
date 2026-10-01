#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
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
import { resolve } from "node:path";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalized = (value) => value.trim().normalize("NFC");
const tuple = (role, topic) => JSON.stringify([role, topic]);

function fail(message, status = 1) {
  process.stderr.write(`${message}\n`);
  process.exitCode = status;
}

function options(args, names) {
  if (args.length % 2 !== 0) throw new Error("Invalid arguments");
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (!names.includes(name) || name in values) throw new Error("Invalid arguments");
    values[name] = args[index + 1];
  }
  return values;
}

function regularFile(path) {
  if (!lstatSync(path).isFile()) throw new Error("Expected a regular file");
}

function question(args) {
  const value = options(args, ["--ledger", "--role", "--topic", "--text", "--follow-up"]);
  for (const name of ["--ledger", "--role", "--topic", "--text"]) {
    if (typeof value[name] !== "string" || !normalized(value[name]))
      throw new Error("Missing input");
  }
  if ("--follow-up" in value && !normalized(value["--follow-up"]))
    throw new Error("Missing follow-up reason");
  const ledger = resolve(value["--ledger"]);
  const role = normalized(value["--role"]);
  const topic = normalized(value["--topic"]);
  const key = tuple(role, topic);
  const lock = `${ledger}.lock`;
  let locked = false;
  let temporary;
  try {
    try {
      const descriptor = openSync(lock, "wx", 0o600);
      locked = true;
      closeSync(descriptor);
    } catch (error) {
      if (error.code === "EEXIST") return fail("Ledger locked", 2);
      throw error;
    }
    let previous = "";
    if (existsSync(ledger)) {
      regularFile(ledger);
      previous = readFileSync(ledger, "utf8");
    }
    if (previous && !previous.endsWith("\n")) throw new Error("Invalid ledger");
    const rows = previous
      ? previous
          .slice(0, -1)
          .split("\n")
          .map((line) => JSON.parse(line))
      : [];
    for (const row of rows) {
      if (
        !row ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        typeof row.at !== "string" ||
        Number.isNaN(Date.parse(row.at)) ||
        typeof row.role !== "string" ||
        !row.role ||
        row.role !== normalized(row.role) ||
        typeof row.topic !== "string" ||
        !row.topic ||
        row.topic !== normalized(row.topic) ||
        typeof row.text !== "string" ||
        !normalized(row.text) ||
        row.key !== tuple(row.role, row.topic) ||
        (row.follow_up !== undefined &&
          (typeof row.follow_up !== "string" || !normalized(row.follow_up)))
      ) {
        throw new Error("Invalid ledger");
      }
    }
    if (rows.some((row) => row.key === key) && !("--follow-up" in value))
      return fail("Duplicate question plan", 2);
    const row = { at: new Date().toISOString(), key, role, topic, text: value["--text"].trim() };
    if ("--follow-up" in value) row.follow_up = normalized(value["--follow-up"]);
    temporary = `${ledger}.${randomUUID()}.tmp`;
    writeFileSync(temporary, `${previous}${JSON.stringify(row)}\n`, { flag: "wx", mode: 0o600 });
    renameSync(temporary, ledger);
    temporary = undefined;
    process.stdout.write(`saved ${ledger} ${key} ${rows.length + 1}\n`);
  } finally {
    if (temporary) {
      try {
        unlinkSync(temporary);
      } catch {
        /* preserve the original error */
      }
    }
    if (locked) unlinkSync(lock);
  }
}

function recordResult(args) {
  const value = options(args, ["--source", "--result", "--out"]);
  for (const name of ["--source", "--result", "--out"]) {
    if (typeof value[name] !== "string" || !normalized(value[name]))
      throw new Error("Missing input");
  }
  const source = resolve(value["--source"]);
  const result = resolve(value["--result"]);
  const out = resolve(value["--out"]);
  regularFile(source);
  regularFile(result);
  const sourceBytes = readFileSync(source);
  const resultBytes = readFileSync(result);
  const parsed = JSON.parse(resultBytes.toString("utf8"));
  const sourceHash = hash(sourceBytes);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    typeof parsed.agent_sha256 !== "string" ||
    parsed.agent_sha256 !== sourceHash
  ) {
    throw new Error("Result source hash mismatch");
  }
  regularFile(source);
  if (!readFileSync(source).equals(sourceBytes)) throw new Error("Source changed during record");
  const resultHash = hash(resultBytes);
  const sourceDirectory = resolve(out, sourceHash);
  const bundle = resolve(sourceDirectory, resultHash);
  if (existsSync(out) && !lstatSync(out).isDirectory()) throw new Error("Invalid output root");
  if (existsSync(sourceDirectory)) {
    if (!lstatSync(sourceDirectory).isDirectory()) throw new Error("Invalid source directory");
  } else {
    mkdirSync(sourceDirectory, { recursive: true });
  }
  try {
    mkdirSync(bundle);
  } catch (error) {
    if (error.code === "EEXIST") {
      if (!lstatSync(bundle).isDirectory())
        throw new Error("Invalid bundle path", { cause: error });
      return fail("Bundle already exists", 2);
    }
    throw error;
  }
  writeFileSync(resolve(bundle, "source.snapshot"), sourceBytes, { flag: "wx", mode: 0o600 });
  writeFileSync(resolve(bundle, "result.snapshot"), resultBytes, { flag: "wx", mode: 0o600 });
  const manifest = {
    source_sha256: sourceHash,
    result_sha256: resultHash,
    at: new Date().toISOString(),
    source,
    result,
  };
  writeFileSync(resolve(bundle, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  process.stdout.write(`saved ${bundle} ${sourceHash} ${resultHash}\n`);
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (command === "question") question(args);
  else if (command === "record-result") recordResult(args);
  else throw new Error("Invalid AX session command");
} catch {
  fail("AX session input or I/O error");
}
