import { afterEach, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});
function check(source: string, hook = false, extension = "tsx") {
  const directory = mkdtempSync(resolve(tmpdir(), "pm-design-"));
  temporary.push(directory);
  const path = resolve(directory, `fixture.${extension}`);
  writeFileSync(path, source);
  return spawnSync(
    process.execPath,
    ["scripts/check-pm-design.mjs", ...(hook ? ["--hook"] : []), path],
    { encoding: "utf8" },
  );
}
it("accepts TSX with tokens and approved spacing", () => {
  expect(
    check(
      'const node = <div style={{color: "var(--ds-color-ink)", padding: 16, gap: "var(--ds-space-px-8)"}} />;',
    ).status,
  ).toBe(0);
});
it("rejects TSX hard-coded color and spacing", () => {
  const result = check(
    'const node = <div style={{color: "#123456", padding: 13, gap: "19px"}} />;',
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("하드코딩");
  expect(result.stderr).toContain("padding: 13px");
  expect(result.stderr).toContain("gap: 19px");
});
it.each(["const node = <div style={theme} />;", "const node = <div {...props} />;"])(
  "rejects unsupported indirect styles: %s",
  (source) => {
    expect(check(source).status).toBe(1);
  },
);
it("keeps CSS checks and hook feedback", () => {
  const result = check(".bad { color: rgb(1,2,3); margin: 13px; }", true, "css");
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout).hookSpecificOutput.additionalContext).toContain("margin: 13px");
});

it.each(["red", "oklch(60% 0.2 30)", "var(--ds-color-missing)"])(
  "rejects non-token or missing colors: %s",
  (color) => {
    expect(check(`const node = <div style={{ color: "${color}" }} />;`).status).toBe(1);
  },
);
