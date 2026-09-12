import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL(".", import.meta.url));
const read = (filename) => readFileSync(resolve(root, filename), "utf8");
const digest = (content) => createHash("sha256").update(content).digest("hex");
const declarations = (content) => {
  const block = content.match(/:root\s*\{([^}]+)\}/)?.[1];
  if (!block) throw new Error("Missing light :root block");
  return Object.fromEntries(
    [...block.matchAll(/(--ds-[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
};
const luminance = (hex) => {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((part) => parseInt(part, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
};

try {
  const generated = read("design-system/tokens.css");
  const theme = read("design-system/runtime-theme.css");
  const tokens = { ...declarations(generated), ...declarations(theme) };
  const color = (name, visited = []) => {
    if (visited.includes(name)) throw new Error(`Circular token: ${name}`);
    const value = tokens[name];
    if (!value) throw new Error(`Missing token: ${name}`);
    const alias = value.match(/^var\((--ds-[\w-]+)\)$/);
    if (alias) return color(alias[1], [...visited, name]);
    if (!/^#[a-f\d]{6}$/i.test(value)) throw new Error(`Unsupported color: ${name}=${value}`);
    return value.toUpperCase();
  };
  for (const name of Object.keys(declarations(theme))) color(name);
  const roles = [
    "canvas",
    "surface",
    "surface-muted",
    "ink",
    "ink-muted",
    "ink-inverse",
    "border",
    "border-strong",
    "primary",
    "accent",
    "link",
  ];
  const palette = Object.fromEntries(roles.map((role) => [role, color(`--ds-color-${role}`)]));
  const matrix = roles.flatMap((foreground) =>
    roles.map((background) => {
      const ratio = contrast(palette[foreground], palette[background]);
      return {
        foreground,
        background,
        ratio: Number(ratio.toFixed(3)),
        classification:
          ratio >= 4.5 ? "text-capable" : ratio >= 3 ? "large-ui-only" : "decorative-only",
      };
    }),
  );
  const required = [
    ["ink", "surface", 4.5],
    ["ink-muted", "surface-muted", 4.5],
    ["ink-inverse", "primary", 4.5],
    ["primary", "surface", 4.5],
    ["border-strong", "surface-muted", 3],
  ].map(([foreground, background, threshold]) => ({
    foreground,
    background,
    threshold,
    ratio: contrast(palette[foreground], palette[background]),
  }));
  const failures = required.filter((pair) => pair.ratio < pair.threshold);
  console.log(
    JSON.stringify(
      {
        scope: "light-theme token contrast, not rendered UI or product tests",
        generated_sha256: digest(generated),
        theme_sha256: digest(theme),
        palette,
        matrix,
        required,
        failures,
        ok: failures.length === 0,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
