import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const pm = resolve(root, "docs/features/pm-program-tracker");
const hook = process.argv.includes("--hook");
const args = process.argv.slice(2).filter((argument) => argument !== "--hook");
const failures = [];
let checked = 0;
const walk = (directory) =>
  !existsSync(directory)
    ? []
    : readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isSymbolicLink()) return [];
        return entry.isDirectory() ? walk(path) : [path];
      });

try {
  const palette = spawnSync(process.execPath, [resolve(pm, "ontology/verify-design.mjs")], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (palette.error || palette.status !== 0)
    failures.push(
      `PM 팔레트 검사 실패: ${palette.error?.message || palette.stderr || palette.stdout}`,
    );
  const spacing = JSON.parse(
    readFileSync(resolve(pm, "design-system/spacing.md"), "utf8").match(
      /```json\s*([\s\S]*?)```/,
    )[1],
  );
  const css = readFileSync(resolve(pm, "ontology/design-system/tokens.css"), "utf8");
  const values = new Map(
    [...css.matchAll(/(--ds-space-px-\d+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
  const allowed = new Set(spacing.keywords);
  for (const token of spacing.tokens) {
    if (!values.has(token)) throw new Error(`간격 토큰 누락: ${token}`);
    allowed.add(values.get(token));
    allowed.add(`var(${token})`);
  }
  const files = args.length
    ? args.map((path) => resolve(path))
    : ["src", "app", "public"].flatMap((path) => walk(resolve(root, path)));
  for (const path of files) {
    const extension = extname(path);
    if (
      !args.length &&
      ![".css", ".html", ".jsx", ".tsx", ".vue", ".svelte", ".scss"].includes(extension)
    )
      continue;
    if (![".css", ".html", ".tsx", ".jsx"].includes(extension)) {
      failures.push(`${path}: 지원하지 않는 스타일 형식. 구현 전에 검사기를 확장하세요.`);
      continue;
    }
    let source = readFileSync(path, "utf8");
    checked += 1;
    if ([".tsx", ".jsx"].includes(extension)) {
      const parsed = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      for (const diagnostic of parsed.parseDiagnostics)
        failures.push(`${path}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
      const declarations = [];
      const visit = (node) => {
        const location = `${path}:${parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1}`;
        if (
          (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
          /#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/i.test(node.text)
        )
          failures.push(`${location}: 하드코딩 색상 대신 PM 토큰 사용`);
        if (ts.isJsxSpreadAttribute(node))
          failures.push(
            `${location}: JSX spread는 스타일 검사를 우회할 수 있어 명시적 속성이 필요합니다.`,
          );
        if (ts.isJsxAttribute(node) && node.name.getText(parsed) === "style") {
          const expression =
            node.initializer && ts.isJsxExpression(node.initializer)
              ? node.initializer.expression
              : undefined;
          if (!expression || !ts.isObjectLiteralExpression(expression))
            failures.push(`${location}: 동적 style은 지원하지 않습니다. CSS class로 분리하세요.`);
          else
            for (const property of expression.properties) {
              if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
                failures.push(`${location}: 동적 style 속성은 지원하지 않습니다.`);
                continue;
              }
              const name = property.name
                .getText(parsed)
                .replace(/["']/g, "")
                .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
              const value = property.initializer;
              if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
                declarations.push(`${name}: ${value.text};`);
              else if (ts.isNumericLiteral(value))
                declarations.push(`${name}: ${value.text === "0" ? "0" : `${value.text}px`};`);
              else failures.push(`${location}: ${name} 동적 값은 CSS class로 분리하세요.`);
            }
        }
        ts.forEachChild(node, visit);
      };
      visit(parsed);
      source = declarations.join("\n");
    }
    if (extension === ".html") {
      if (/\sstyle\s*=/i.test(source))
        failures.push(`${path}: inline style은 지원하지 않습니다. CSS 파일로 분리하세요.`);
      source = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
        .map((match) => match[1])
        .join("\n");
    }
    source = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
    for (const match of source.matchAll(/([\w-]+)\s*:\s*([^;{}]+)(?:;|(?=\}))/g)) {
      const [, property, raw] = match;
      const value = raw.trim().replace(/\s*!important$/, "");
      const location = `${path}:${source.slice(0, match.index).split("\n").length}`;
      if (
        /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke)$/.test(
          property,
        )
      ) {
        const withoutTokens = value.replace(/var\((--ds-[\w-]+)\)/g, (reference, name) => {
          if (!css.includes(`${name}:`))
            failures.push(`${location}: 존재하지 않는 디자인 토큰 ${name}`);
          return " ";
        });
        const remainder = withoutTokens
          .replace(
            /\b(?:none|transparent|currentColor|inherit|initial|unset|solid|dashed|dotted|double|inset|outset)\b/gi,
            "",
          )
          .replace(/-?\d*\.?\d+(?:px|rem|em|%)?/g, "")
          .replace(/[\s,]/g, "");
        if (remainder)
          failures.push(
            `${location}: ${property}: ${value} — 색상 속성은 정의된 PM 토큰을 사용하세요.`,
          );
      }
      if (/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/i.test(value))
        failures.push(`${location}: ${property}: ${value} — 하드코딩 색상 대신 PM 토큰 사용`);
      if (
        /^(?:(?:padding|margin)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|(?:row-|column-)?gap)$/.test(
          property,
        )
      ) {
        const parts = value.match(/var\([^)]*\)|\S+/g) || [];
        if (!parts.length || parts.some((part) => !allowed.has(part)))
          failures.push(`${location}: ${property}: ${value} — spacing.md에 없는 간격`);
      }
    }
  }
} catch (error) {
  failures.push(error.message);
}
if (failures.length) {
  const message = `${failures.join("\n")}\nPM design.md 및 design-system 문서와 비교해 수정하세요. 자동 복구는 하지 않습니다.`;
  console.error(message);
  if (hook)
    console.log(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message },
      }),
    );
  else process.exitCode = 1;
} else {
  console.log(
    hook
      ? "{}"
      : `PM 팔레트·간격 기준 검사 통과. CSS/HTML/TSX/JSX ${checked}개 검사${checked ? "" : " (앱 소스 없음: 화면 검사 아님)"}.`,
  );
}
