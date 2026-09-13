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

const temporary: string[] = [];
const registryPath = "docs/harness/registry.json";
const skillPath = ".agents/skills/example/SKILL.md";
const methodPath = "docs/methods/testing-strategy.md";
const repository = process.cwd();

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
    ".husky",
    "docs/features",
    "node_modules",
    "docs/lessons",
  ])
    expect(existsSync(resolve(target, filename))).toBe(false);
});
