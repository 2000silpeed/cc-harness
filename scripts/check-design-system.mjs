import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const hookMode = process.argv.includes("--hook");
const target = process.argv.find((argument, index) => index > 1 && argument !== "--hook");
const normalize = (value) => value.trim().replace(/\s+/g, " ");

try {
  const rules = {};
  for (const name of ["colors", "typography", "spacing"]) {
    const markdown = readFileSync(resolve(root, `docs/design-system/${name}.md`), "utf8");
    const block = markdown.match(/```json\s*([\s\S]*?)```/);
    if (!block) throw new Error(`${name}.md: JSON 기준이 없습니다.`);
    for (const [property, values] of Object.entries(JSON.parse(block[1]))) {
      if (
        rules[property] ||
        !Array.isArray(values) ||
        !values.length ||
        values.some((value) => typeof value !== "string")
      ) {
        throw new Error(`${name}.md: 잘못되거나 중복된 속성 ${property}`);
      }
      rules[property] = new Set(values.map(normalize));
    }
  }
  const filename = target ? resolve(target) : resolve(root, "docs/architecture/index.html");
  const html = readFileSync(filename, "utf8");
  if (/\sstyle\s*=|<link\b[^>]*\bstylesheet\b/i.test(html)) {
    throw new Error(
      "인라인 속성·외부 스타일은 현재 검사 범위 밖입니다. 검사 범위를 먼저 확장하세요.",
    );
  }
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  if (!styles.length) throw new Error("검사할 style 블록이 없습니다.");
  const violations = [];
  let checked = 0;
  for (const [, source] of styles) {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, property, rawValue] of css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)(?:;|(?=\}))/g)) {
      const value = normalize(rawValue);
      checked += 1;
      if (!rules[property]?.has(value)) violations.push(`${property}: ${value}`);
    }
  }
  if (!checked) throw new Error("CSS 선언이 없어 검사하지 못했습니다.");
  if (violations.length)
    throw new Error(`디자인 기준 이탈 (${filename}):\n${violations.join("\n")}`);
  console.log(hookMode ? "{}" : `디자인 검사 통과: ${checked}개 선언 (${filename})`);
} catch (error) {
  console.error(
    `${error.message}\n기준 문서와 변경 의도를 비교해 수정하세요. 자동 복구는 하지 않습니다.`,
  );
  process.exitCode = hookMode ? 2 : 1;
}
